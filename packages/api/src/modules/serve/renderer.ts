/**
 * Server-side HTML renderer for published pages.
 * Converts contentJson (block tree) to static HTML.
 */

import type { BaseBlock } from '@replica-pages/blocks';
import { getUtmCaptureScript, getFormSubmitHandlerScript, getCountdownScript } from './utm-scripts.js';
import { getFormInterceptionScript, type HookedFormBinding } from './form-interception-script.js';
import { sanitizeHtml, sanitizeCustomHtml } from '../../lib/sanitize-html.js';

export interface PageContentJson {
  root?: string;
  blocks?: Record<string, BaseBlock>;
}

export interface FormFieldSchema {
  id: string;
  type: string;
  label?: string;
  required?: boolean;
  options?: string[];
  stepIndex?: number;
  accept?: string;
}

export interface FormSchemaConfig {
  stepNames?: string[];
  buttonText?: string;
  buttonStyle?: 'primary' | 'outline' | 'secondary';
}

export interface FormSchemaData {
  fields: FormFieldSchema[];
  config?: FormSchemaConfig;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeCssColor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^(rgb|rgba|hsl|hsla)\(\s*[-\d.%\s,]+\)$/.test(trimmed)) return trimmed;
  if (/^var\(--[a-zA-Z0-9_-]+\)$/.test(trimmed)) return trimmed;
  if (/^[a-zA-Z]{1,32}$/.test(trimmed)) return trimmed;
  return null;
}

function sanitizeFontFamily(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/[;<>{}]/.test(trimmed)) return null;
  if (/(url\s*\(|expression\s*\(|javascript\s*:|vbscript\s*:)/i.test(trimmed)) return null;
  if (!/^[a-zA-Z0-9\s,'"._-]+$/.test(trimmed)) return null;
  return trimmed;
}

function sanitizeUrlLike(value: string, type: 'href' | 'src' | 'embed'): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s+/g, '').toLowerCase();
  if (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:text/html')
  ) {
    return null;
  }

  if (type === 'href') {
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(trimmed)) return trimmed;
    return null;
  }
  if (type === 'embed') {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return null;
  }
  if (/^(https?:|\/|\.\/|\.\.\/)/i.test(trimmed)) return trimmed;
  if (/^data:image\//i.test(trimmed)) return trimmed;
  return null;
}

function getUniversalStyleString(props: Record<string, unknown>): string {
  const styles: string[] = [];
  const num = (v: unknown) => (typeof v === 'number' && !isNaN(v) ? v : undefined);
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  if (num(props.marginTop) != null) styles.push(`margin-top:${props.marginTop}px`);
  if (num(props.marginRight) != null) styles.push(`margin-right:${props.marginRight}px`);
  if (num(props.marginBottom) != null) styles.push(`margin-bottom:${props.marginBottom}px`);
  if (num(props.marginLeft) != null) styles.push(`margin-left:${props.marginLeft}px`);
  if (num(props.paddingTop) != null) styles.push(`padding-top:${props.paddingTop}px`);
  if (num(props.paddingRight) != null) styles.push(`padding-right:${props.paddingRight}px`);
  if (num(props.paddingBottom) != null) styles.push(`padding-bottom:${props.paddingBottom}px`);
  if (num(props.paddingLeft) != null) styles.push(`padding-left:${props.paddingLeft}px`);
  if (str(props.backgroundColor)) {
    const safe = sanitizeCssColor(String(props.backgroundColor));
    if (safe) styles.push(`background-color:${safe}`);
  }
  if (num(props.borderRadius) != null) styles.push(`border-radius:${props.borderRadius}px`);
  if (props.width != null) styles.push(`width:${typeof props.width === 'number' ? props.width + 'px' : props.width}`);
  if (num(props.zIndex) != null) styles.push(`z-index:${props.zIndex}`);
  return styles.join(';');
}

function hasUniversalProps(props: Record<string, unknown>): boolean {
  const keys = ['marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','backgroundColor','borderRadius','width','zIndex'];
  return keys.some((k) => props[k] != null && props[k] !== '');
}

function wrapUniversal(html: string, props: Record<string, unknown>): string {
  if (!hasUniversalProps(props)) return html;
  const style = getUniversalStyleString(props);
  return `<div style="${escapeHtml(style)}">${html}</div>`;
}

interface RenderContext {
  forms?: Record<string, FormSchemaData>;
  formActionUrl?: string;
  pageId?: string;
  urlParams?: Record<string, string>;
}

function replaceDynamicText(text: string, urlParams?: Record<string, string>): string {
  if (!urlParams || typeof text !== 'string') return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = urlParams[key] ?? '';
    return escapeHtml(val);
  });
}

function evalShowWhen(showWhen: string | undefined, urlParams?: Record<string, string>): boolean {
  if (!showWhen || !urlParams) return true;
  const eq = showWhen.indexOf('=');
  if (eq >= 0) {
    const key = showWhen.slice(0, eq).trim();
    const val = showWhen.slice(eq + 1).trim();
    return (urlParams[key] ?? '') === val;
  }
  return !!urlParams[showWhen.trim()];
}

function renderBlock(block: BaseBlock, blocks: Record<string, BaseBlock>, depth: number, ctx?: RenderContext): string {
  if (depth > 50) return '';
  const props = (block.props ?? {}) as Record<string, unknown>;
  if (!evalShowWhen(props.showWhen as string | undefined, ctx?.urlParams)) return '';
  const children = block.children ?? [];

  let result = '';
  switch (block.type) {
    case 'section': {
      const style: string[] = [];
      if (props.maxWidth != null) style.push(`max-width:${props.maxWidth}px`);
      if (props.padding != null) style.push(`padding:${props.padding}px`);
      if (props.backgroundColor) {
        const safeBg = sanitizeCssColor(String(props.backgroundColor));
        if (safeBg) style.push(`background-color:${safeBg}`);
      }
      const styleAttr = style.length ? ` style="${escapeHtml(style.join(';'))}"` : '';
      const inner = children.map((id) => blocks[id]).filter(Boolean).map((b) => renderBlock(b, blocks, depth + 1, ctx)).join('');
      result = `<section class="w-full"${styleAttr}><div class="max-w-[1200px] mx-auto">${inner}</div></section>`;
      break;
    }
    case 'container': {
      const inner = children.map((id) => blocks[id]).filter(Boolean).map((b) => renderBlock(b, blocks, depth + 1, ctx)).join('');
      result = `<div class="w-full max-w-[1200px] mx-auto">${inner}</div>`;
      break;
    }
    case 'grid': {
      const cols = (props.columns as number) ?? 3;
      const inner = children.map((id) => blocks[id]).filter(Boolean).map((b) => renderBlock(b, blocks, depth + 1, ctx)).join('');
      result = `<div class="grid gap-4" style="grid-template-columns:repeat(${cols},1fr)">${inner}</div>`;
      break;
    }
    case 'columns': {
      const inner = children.map((id) => blocks[id]).filter(Boolean).map((b) => renderBlock(b, blocks, depth + 1, ctx)).join('');
      result = `<div class="flex gap-4">${inner}</div>`;
      break;
    }
    case 'stack': {
      const inner = children.map((id) => blocks[id]).filter(Boolean).map((b) => renderBlock(b, blocks, depth + 1, ctx)).join('');
      result = `<div class="flex flex-col gap-2">${inner}</div>`;
      break;
    }
    case 'text': {
      const contentHtml = props.contentHtml as string | undefined;
      const urlParams = ctx?.urlParams;
      if (contentHtml && /<[a-z][\s\S]*>/i.test(contentHtml)) {
        const replaced = replaceDynamicText(contentHtml, urlParams);
        const safe = sanitizeHtml(replaced);
        result = `<div class="prose prose-sm max-w-none">${safe}</div>`;
      } else {
        const content = replaceDynamicText(String(props.content ?? 'Text'), urlParams);
        result = `<p>${escapeHtml(content)}</p>`;
      }
      break;
    }
    case 'image': {
      const src = replaceDynamicText(String(props.src ?? ''), ctx?.urlParams);
      const alt = replaceDynamicText(String(props.alt ?? ''), ctx?.urlParams);
      const safeSrc = sanitizeUrlLike(src, 'src') ?? '';
      result = `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(alt)}" class="max-w-full h-auto" loading="lazy" />`;
      break;
    }
    case 'button': {
      const href = replaceDynamicText(String(props.href ?? '#'), ctx?.urlParams);
      const text = replaceDynamicText(String(props.text ?? 'Button'), ctx?.urlParams);
      const safeHref = sanitizeUrlLike(href, 'href') ?? '#';
      result = `<a href="${escapeHtml(safeHref)}" class="inline-block px-4 py-2 bg-primary text-primary-foreground rounded">${escapeHtml(text)}</a>`;
      break;
    }
    case 'divider': {
      const orient = (props.orientation as string) ?? 'horizontal';
      result = orient === 'vertical'
        ? '<div class="inline-block w-px min-h-[24px] bg-border mx-2"></div>'
        : '<hr class="border-t my-4" />';
      break;
    }
    case 'spacer':
      result = `<div style="height:${props.height ?? 24}px"></div>`;
      break;
    case 'customHtml': {
      const raw = replaceDynamicText(String(props.html ?? ''), ctx?.urlParams);
      const importMeta = props._importMeta as { tier?: string; scopeId?: string } | undefined;
      if (importMeta?.scopeId) {
        // Imported block: wrap with scope attribute for scoped CSS matching
        result = `<div data-import-scope="${escapeHtml(importMeta.scopeId)}">${sanitizeCustomHtml(raw)}</div>`;
      } else {
        result = sanitizeCustomHtml(raw);
      }
      break;
    }
    case 'video': {
      const url = props.url as string;
      const provider = (props.provider as string) ?? 'youtube';
      let embedUrl = '';
      if (url) {
        if (provider === 'youtube') {
          const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
          embedUrl = m ? `https://www.youtube.com/embed/${m[1]}` : url;
        } else if (provider === 'vimeo') {
          const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
          embedUrl = m ? `https://player.vimeo.com/video/${m[1]}` : url;
        } else {
          embedUrl = url.startsWith('http') ? url : '';
        }
      }
      if (!embedUrl) break;
      const ratio = (props.aspectRatio as string) ?? '16/9';
      const safeEmbedUrl = sanitizeUrlLike(embedUrl, 'embed');
      if (!safeEmbedUrl) break;
      result = `<div class="relative w-full overflow-hidden rounded" style="aspect-ratio:${escapeHtml(ratio)}"><iframe src="${escapeHtml(safeEmbedUrl)}" class="absolute inset-0 w-full h-full" allowfullscreen></iframe></div>`;
      break;
    }
    case 'shapeRectangle': {
      const w = props.width ?? 200;
      const h = props.height ?? 100;
      const fill = (props.fillColor as string) ?? '#e5e7eb';
      const radius = props.borderRadius ?? 0;
      const opacity = (props.opacity as number) ?? 1;
      result = `<div style="width:${w}px;height:${h}px;background-color:${escapeHtml(fill)};border-radius:${radius}px;opacity:${opacity}"></div>`;
      break;
    }
    case 'shapeCircle': {
      const size = props.size ?? 100;
      const fill = (props.fillColor as string) ?? '#e5e7eb';
      const opacity = (props.opacity as number) ?? 1;
      result = `<div style="width:${size}px;height:${size}px;border-radius:50%;background-color:${escapeHtml(fill)};opacity:${opacity}"></div>`;
      break;
    }
    case 'countdown': {
      const target = props.targetDate as string;
      if (target) {
        const daysL = escapeHtml(String(props.daysLabel ?? 'Days'));
        const hoursL = escapeHtml(String(props.hoursLabel ?? 'Hours'));
        const minsL = escapeHtml(String(props.minutesLabel ?? 'Mins'));
        const secsL = escapeHtml(String(props.secondsLabel ?? 'Secs'));
        const wrap = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap';
        const unit = 'display:flex;flex-direction:column;align-items:center';
        const num = 'font-size:1.5rem;font-weight:700;font-variant-numeric:tabular-nums';
        const lbl = 'font-size:0.75rem;color:#6b7280';
        result = `<div class="rp-countdown" style="${wrap}" data-target="${escapeHtml(target)}" data-days="${daysL}" data-hours="${hoursL}" data-mins="${minsL}" data-secs="${secsL}"><div style="${unit}"><span class="rp-cd-d" style="${num}">00</span><span style="${lbl}">${daysL}</span></div><span style="font-size:1.25rem;font-weight:700">:</span><div style="${unit}"><span class="rp-cd-h" style="${num}">00</span><span style="${lbl}">${hoursL}</span></div><span style="font-size:1.25rem;font-weight:700">:</span><div style="${unit}"><span class="rp-cd-m" style="${num}">00</span><span style="${lbl}">${minsL}</span></div><span style="font-size:1.25rem;font-weight:700">:</span><div style="${unit}"><span class="rp-cd-s" style="${num}">00</span><span style="${lbl}">${secsL}</span></div></div>`;
      }
      break;
    }
    case 'table': {
      const rows = (props.rows as string[][]) ?? [['H1', 'H2'], ['C1', 'C2']];
      const hasHeader = (props.hasHeader as boolean) ?? true;
      let html = '<table class="w-full border-collapse text-sm"><tbody>';
      rows.forEach((row, ri) => {
        html += '<tr>';
        row.forEach((cell) => {
          const tag = hasHeader && ri === 0 ? 'th' : 'td';
          html += `<${tag} class="border border-border px-3 py-2">${escapeHtml(cell)}</${tag}>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      result = `<div class="overflow-x-auto">${html}</div>`;
      break;
    }
    case 'hero': {
      const inner = children.map((id) => blocks[id]).filter(Boolean).map((b) => renderBlock(b, blocks, depth + 1, ctx)).join('');
      result = `<section class="w-full py-16 px-4 flex flex-col items-center justify-center text-center min-h-[300px] bg-muted/30"><div class="max-w-3xl mx-auto flex flex-col gap-4">${inner}</div></section>`;
      break;
    }
    case 'features': {
      const inner = children.map((id) => blocks[id]).filter(Boolean).map((b) => renderBlock(b, blocks, depth + 1, ctx)).join('');
      result = `<section class="py-12 px-4"><div class="max-w-6xl mx-auto grid gap-8 md:grid-cols-3">${inner}</div></section>`;
      break;
    }
    case 'testimonials': {
      const inner = children.map((id) => blocks[id]).filter(Boolean).map((b) => renderBlock(b, blocks, depth + 1, ctx)).join('');
      result = `<section class="py-12 px-4 bg-muted/20"><div class="max-w-4xl mx-auto">${inner}</div></section>`;
      break;
    }
    case 'faq': {
      const inner = children.map((id) => blocks[id]).filter(Boolean).map((b) => renderBlock(b, blocks, depth + 1, ctx)).join('');
      result = `<section class="py-12 px-4"><div class="max-w-2xl mx-auto">${inner}</div></section>`;
      break;
    }
    case 'logos': {
      const inner = children.map((id) => blocks[id]).filter(Boolean).map((b) => renderBlock(b, blocks, depth + 1, ctx)).join('');
      result = `<section class="py-8 px-4"><div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 opacity-70">${inner}</div></section>`;
      break;
    }
    case 'form':
      result = renderFormPlaceholder(block.id, props, blocks, ctx?.forms, ctx?.formActionUrl, ctx?.pageId);
      break;
    default:
      result = children.map((id) => blocks[id]).filter(Boolean).map((b) => renderBlock(b, blocks, depth + 1, ctx)).join('');
  }
  return wrapUniversal(result, props);
}

function renderFormField(field: FormFieldSchema): string {
  const id = field.id;
  const name = `field_${id}`;
  const label = field.label ?? field.type;
  const reqAttr = field.required ? ' required' : '';

  switch (field.type) {
    case 'email':
      return `<div class="mb-3"><label for="${escapeHtml(id)}" class="block text-sm font-medium mb-1">${escapeHtml(label)}</label><input type="email" id="${escapeHtml(id)}" name="${escapeHtml(name)}" placeholder="Email" class="w-full px-3 py-2 border rounded"${reqAttr} /></div>`;
    case 'text':
      return `<div class="mb-3"><label for="${escapeHtml(id)}" class="block text-sm font-medium mb-1">${escapeHtml(label)}</label><input type="text" id="${escapeHtml(id)}" name="${escapeHtml(name)}" class="w-full px-3 py-2 border rounded"${reqAttr} /></div>`;
    case 'phone':
      return `<div class="mb-3"><label for="${escapeHtml(id)}" class="block text-sm font-medium mb-1">${escapeHtml(label)}</label><input type="tel" id="${escapeHtml(id)}" name="${escapeHtml(name)}" class="w-full px-3 py-2 border rounded"${reqAttr} /></div>`;
    case 'textarea':
      return `<div class="mb-3"><label for="${escapeHtml(id)}" class="block text-sm font-medium mb-1">${escapeHtml(label)}</label><textarea id="${escapeHtml(id)}" name="${escapeHtml(name)}" rows="3" class="w-full px-3 py-2 border rounded"${reqAttr}></textarea></div>`;
    case 'date':
      return `<div class="mb-3"><label for="${escapeHtml(id)}" class="block text-sm font-medium mb-1">${escapeHtml(label)}</label><input type="date" id="${escapeHtml(id)}" name="${escapeHtml(name)}" class="w-full px-3 py-2 border rounded"${reqAttr} /></div>`;
    case 'file':
      return `<div class="mb-3"><label for="${escapeHtml(id)}" class="block text-sm font-medium mb-1">${escapeHtml(label)}</label><input type="file" id="${escapeHtml(id)}" name="${escapeHtml(name)}"${field.accept ? ` accept="${escapeHtml(field.accept)}"` : ''} class="w-full px-3 py-2 border rounded" /></div>`;
    case 'dropdown':
      return `<div class="mb-3"><label for="${escapeHtml(id)}" class="block text-sm font-medium mb-1">${escapeHtml(label)}</label><select id="${escapeHtml(id)}" name="${escapeHtml(name)}" class="w-full px-3 py-2 border rounded"${reqAttr}>${(field.options ?? []).map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}</select></div>`;
    case 'checkbox':
      return `<div class="mb-3"><label class="flex items-center gap-2"><input type="checkbox" name="${escapeHtml(name)}" value="1" />${escapeHtml(label)}</label></div>`;
    case 'radio':
      return `<div class="mb-3"><span class="block text-sm font-medium mb-1">${escapeHtml(label)}</span>${(field.options ?? []).map((o) => `<label class="flex items-center gap-2 mr-4"><input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(o)}" />${escapeHtml(o)}</label>`).join('')}</div>`;
    case 'hidden':
      return `<input type="hidden" name="${escapeHtml(name)}" value="" />`;
    default:
      return `<div class="mb-3"><label for="${escapeHtml(id)}" class="block text-sm font-medium mb-1">${escapeHtml(label)}</label><input type="text" id="${escapeHtml(id)}" name="${escapeHtml(name)}" class="w-full px-3 py-2 border rounded"${reqAttr} /></div>`;
  }
}

function renderFormFromSchema(
  blockId: string,
  formId: string,
  schema: FormSchemaData,
  formActionUrl: string,
  pageId: string
): string {
  const fields = schema.fields ?? [];
  const config = schema.config ?? {};
  const stepNames = config.stepNames ?? [];
  const buttonText = config.buttonText ?? 'Submit';
  const buttonStyle = config.buttonStyle ?? 'primary';
  const btnClass = buttonStyle === 'outline' ? 'border border-primary text-primary hover:bg-primary/10' : buttonStyle === 'secondary' ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-primary text-primary-foreground hover:bg-primary/90';

  if (stepNames.length > 0) {
    const steps = stepNames.map((_, i) => fields.filter((f) => (f.stepIndex ?? 0) === i));
    const stepHtml = steps.map((stepFields, i) => {
      const inner = stepFields.map((f) => renderFormField(f)).join('');
      return `<div class="rp-form-step" data-step="${i}" style="display:${i === 0 ? 'block' : 'none'}">${inner}</div>`;
    }).join('');
    const navButtons = steps.length > 1
      ? `<div class="flex gap-2 mt-4"><button type="button" class="rp-step-prev px-4 py-2 border rounded" style="display:none">Back</button><button type="button" class="rp-step-next px-4 py-2 border rounded">Next</button><button type="submit" class="rp-step-submit px-4 py-2 rounded ${btnClass}" style="display:none">${escapeHtml(buttonText)}</button></div>`
      : `<button type="submit" class="mt-4 px-4 py-2 rounded ${btnClass}">${escapeHtml(buttonText)}</button>`;
    return `<form data-replica-form action="${escapeHtml(formActionUrl)}" method="POST" class="rp-form-multistep"><input type="hidden" name="page_id" value="${escapeHtml(pageId)}" />${stepHtml}${navButtons}</form><script>(function(){document.querySelectorAll('.rp-form-multistep').forEach(function(f){var steps=f.querySelectorAll('.rp-form-step');var prev=f.querySelector('.rp-step-prev');var next=f.querySelector('.rp-step-next');var sub=f.querySelector('.rp-step-submit');if(steps.length<2)return;var cur=0;function show(){steps.forEach(function(s,i){s.style.display=i===cur?'block':'none';});prev.style.display=cur>0?'block':'none';next.style.display=cur<steps.length-1?'block':'none';sub.style.display=cur===steps.length-1?'block':'none';}next&&next.addEventListener('click',function(){if(cur<steps.length-1){cur++;show();}});prev&&prev.addEventListener('click',function(){if(cur>0){cur--;show();}});show();});});})();</script>`;
  }

  const fieldsHtml = fields.map((f) => renderFormField(f)).join('');
  return `<form data-replica-form action="${escapeHtml(formActionUrl)}" method="POST"><input type="hidden" name="page_id" value="${escapeHtml(pageId)}" />${fieldsHtml}<button type="submit" class="mt-4 px-4 py-2 rounded ${btnClass}">${escapeHtml(buttonText)}</button></form>`;
}

function renderFormPlaceholder(
  blockId: string,
  props: Record<string, unknown>,
  blocks: Record<string, BaseBlock>,
  forms?: Record<string, FormSchemaData>,
  formActionUrl?: string,
  pageId?: string
): string {
  const formId = props.formId as string | undefined;
  if (!formId) return '';
  const schema = forms?.[formId];
  if (schema && formActionUrl && pageId) {
    return renderFormFromSchema(blockId, formId, schema, formActionUrl, pageId);
  }
  return `<div data-form-block="${escapeHtml(blockId)}" data-form-id="${escapeHtml(formId)}" class="form-block-placeholder">Form: ${escapeHtml(formId)}</div>`;
}

export interface RenderContentOptions {
  forms?: Record<string, FormSchemaData>;
  formActionUrl?: string;
  pageId?: string;
  urlParams?: Record<string, string>;
}

export function renderContentToHtml(
  content: PageContentJson | null | undefined,
  options?: RenderContentOptions
): string {
  if (!content || typeof content !== 'object') return '';
  const blocks = content.blocks ?? {};
  const rootId = content.root;
  if (!rootId || !blocks[rootId]) return '';
  const ctx: RenderContext | undefined =
    options?.forms && options?.formActionUrl && options?.pageId
      ? {
          forms: options.forms,
          formActionUrl: options.formActionUrl,
          pageId: options.pageId,
          urlParams: options.urlParams,
        }
      : options?.urlParams
        ? { urlParams: options.urlParams }
        : undefined;
  const layoutMode = (content as { layoutMode?: string }).layoutMode;
  if (layoutMode === 'canvas') {
    const rootBlock = blocks[rootId];
    const childIds = rootBlock?.children ?? [];
    const parts = childIds.map((id) => {
      const block = blocks[id];
      if (!block) return '';
      const props = (block.props ?? {}) as Record<string, unknown>;
      const x = (props.x as number) ?? 0;
      const y = (props.y as number) ?? 0;
      const w = (props.width as number) ?? 200;
      const h = (props.height as number) ?? 80;
      const inner = renderBlock(block, blocks, 0, ctx);
      return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;min-height:${h}px">${inner}</div>`;
    });
    return `<div class="relative w-full" style="min-height:800px">${parts.join('')}</div>`;
  }
  return renderBlock(blocks[rootId], blocks, 0, ctx);
}

export interface PageSettings {
  backgroundColor?: string;
  fontFamily?: string;
  seoMetaDescription?: string;
  seoOgTitle?: string;
  seoOgImage?: string;
}

export interface StickyBarData {
  id: string;
  root: string;
  blocks: Record<string, BaseBlock>;
  position: 'top' | 'bottom';
  backgroundColor?: string;
}

export interface PopupData {
  id: string;
  root: string;
  blocks: Record<string, BaseBlock>;
  trigger: 'onLoad' | 'delay' | 'exitIntent';
  delaySeconds?: number;
}

export interface RenderPageOptions {
  contentHtml: string;
  pageId: string;
  pageName: string;
  pageSlug: string;
  scripts?: { header?: string; footer?: string } | null;
  globalHeaderScript?: string | null;
  globalFooterScript?: string | null;
  formActionUrl: string;
  embedPolicy?: 'allow' | 'deny' | null;
  pageSettings?: PageSettings | null;
  stickyBars?: StickyBarData[];
  popups?: PopupData[];
  hookedFormBindings?: HookedFormBinding[];
  /** Scoped CSS fragments from imported blocks (PageStylesheet records) */
  scopedStylesheets?: { scopeId: string; cssText: string }[];
}

function renderOverlayContent(blocks: Record<string, BaseBlock>, rootId: string): string {
  const rootBlock = blocks[rootId];
  if (!rootBlock) return '';
  return renderBlock(rootBlock, blocks, 0);
}

function getStickyBarsHtml(bars: StickyBarData[]): string {
  if (!bars?.length) return '';
  return bars
    .map((bar) => {
      const inner = renderOverlayContent(bar.blocks, bar.root);
      const pos = bar.position === 'top' ? 'top:0' : 'bottom:0';
      const safeBg = bar.backgroundColor ? sanitizeCssColor(bar.backgroundColor) : null;
      const bg = safeBg ? `background-color:${safeBg}` : 'background-color:#1e293b';
      const style = `position:fixed;left:0;right:0;${pos};z-index:9999;${bg};color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;max-width:100%;box-sizing:border-box`;
      return `<div class="rp-sticky-bar" data-id="${escapeHtml(bar.id)}" style="${escapeHtml(style)}">${inner}</div>`;
    })
    .join('\n');
}

function getPopupsHtml(popups: PopupData[]): string {
  if (!popups?.length) return '';
  const items = popups.map((p) => ({
    id: p.id,
    trigger: p.trigger,
    delaySeconds: p.delaySeconds ?? 3,
    html: renderOverlayContent(p.blocks, p.root),
  }));
  const popupMarkup = items
    .map(
      (p) =>
        `<div class="rp-popup" id="rp-popup-${escapeHtml(p.id)}" style="display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);padding:20px;box-sizing:border-box;flex-direction:column;align-items:center;justify-content:center">
  <div class="rp-popup-inner" style="background:#fff;border-radius:8px;padding:24px;max-width:400px;width:100%;max-height:90vh;overflow:auto;position:relative">
    <button class="rp-popup-close" data-popup-id="${escapeHtml(p.id)}" type="button" style="position:absolute;top:12px;right:12px;background:none;border:none;cursor:pointer;font-size:20px;line-height:1">&times;</button>
    ${p.html}
  </div>
</div>`
    )
    .join('\n');
  const script = `
(function(){
  var popups = ${JSON.stringify(items.map((p) => ({ id: p.id, trigger: p.trigger, delaySeconds: p.delaySeconds })))};
  var shown = {};
  function show(id){
    var el = document.getElementById('rp-popup-' + id);
    if (el && !shown[id]) { el.style.display = 'flex'; el.style.flexDirection = 'column'; el.style.alignItems = 'center'; el.style.justifyContent = 'center'; shown[id] = true; }
  }
  function hide(id){
    var el = document.getElementById('rp-popup-' + id);
    if (el) { el.style.display = 'none'; }
  }
  document.querySelectorAll('.rp-popup-close').forEach(function(btn){
    btn.addEventListener('click', function(){ hide(btn.getAttribute('data-popup-id')); });
  });
  popups.forEach(function(p){
    if (p.trigger === 'onLoad') { show(p.id); }
    else if (p.trigger === 'delay') { setTimeout(function(){ show(p.id); }, (p.delaySeconds || 3) * 1000); }
    else if (p.trigger === 'exitIntent') {
      document.addEventListener('mouseout', function(e){
        if (e.clientY < 0 && !shown[p.id]) { show(p.id); }
      }, { once: false });
    }
  });
})();
`;
  return popupMarkup + '\n<script>' + script + '</script>';
}

export function renderFullPageHtml(opts: RenderPageOptions): string {
  const {
    contentHtml,
    pageId,
    pageName,
    pageSlug,
    scripts,
    globalHeaderScript,
    globalFooterScript,
    formActionUrl,
    pageSettings,
    stickyBars,
    popups,
    hookedFormBindings,
    scopedStylesheets,
  } = opts;
  const headerScripts = [globalHeaderScript ?? '', scripts?.header ?? '']
    .filter(Boolean)
    .join('\n');
  const scopedCssBlock = (scopedStylesheets ?? [])
    .map((s) => `<style data-import-scope="${escapeHtml(s.scopeId)}">${s.cssText}</style>`)
    .join('\n');
  const footerScripts = [globalFooterScript ?? '', scripts?.footer ?? '']
    .filter(Boolean)
    .join('\n');

  const metaDesc = pageSettings?.seoMetaDescription ?? '';
  const ogTitle = pageSettings?.seoOgTitle ?? pageName;
  const ogImage = pageSettings?.seoOgImage ?? '';
  const bodyStyle: string[] = [];
  if (pageSettings?.backgroundColor) {
    const safeBg = sanitizeCssColor(pageSettings.backgroundColor);
    if (safeBg) bodyStyle.push(`background-color:${safeBg}`);
  }
  if (pageSettings?.fontFamily) {
    const safeFont = sanitizeFontFamily(pageSettings.fontFamily);
    if (safeFont) bodyStyle.push(`font-family:${safeFont}`);
  }
  const bodyStyleAttr = bodyStyle.length ? ` style="${escapeHtml(bodyStyle.join(';'))}"` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageName)}</title>
  ${metaDesc ? `<meta name="description" content="${escapeHtml(metaDesc)}" />` : ''}
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : ''}
  <script>
    window.__REPLICA_PAGE__ = { pageId: "${escapeHtml(pageId)}", pageName: "${escapeHtml(pageName ?? '')}", pageSlug: "${escapeHtml(pageSlug)}", formActionUrl: "${escapeHtml(formActionUrl)}" };
  </script>
  ${scopedCssBlock}
  ${headerScripts}
</head>
<body${bodyStyleAttr}>
  ${getStickyBarsHtml(stickyBars ?? [])}
  <main class="min-h-screen">
    ${contentHtml}
  </main>
  ${getPopupsHtml(popups ?? [])}
  <script>${getUtmCaptureScript()}</script>
  <script>
    (function(){
      var cfg = window.__REPLICA_PAGE__ || {};
      var formAction = cfg.formActionUrl || '/api/v1/submissions';
      document.querySelectorAll('form[data-replica-form]').forEach(function(f){ f.action = formAction; });
      document.querySelectorAll('[data-form-block]').forEach(function(el){
        var formId = el.getAttribute('data-form-id');
        if (formId) { el.innerHTML = '<form data-replica-form action="' + formAction + '" method="POST"><input type="hidden" name="page_id" value="' + (cfg.pageId || '') + '" /><input type="email" name="email" placeholder="Email" required /><button type="submit">Submit</button></form>'; }
      });
    })();
  </script>
  <script>${getFormSubmitHandlerScript()}</script>
  <script>${getCountdownScript()}</script>
  ${hookedFormBindings?.length ? `<script>${getFormInterceptionScript(hookedFormBindings, pageId, formActionUrl)}</script>` : ''}
  ${footerScripts}
</body>
</html>`;
}
