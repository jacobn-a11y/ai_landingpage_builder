import { parseHTML } from 'linkedom';

const ALLOWED_RICH_TAGS = new Set([
  'a',
  'b',
  'br',
  'code',
  'em',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'u',
  'ul',
]);

const BLOCKED_CUSTOM_TAGS = new Set(['script', 'style', 'object', 'embed', 'base', 'meta', 'link', 'srcdoc']);
const URL_ATTRS = new Set(['href', 'src', 'srcset', 'poster', 'action', 'formaction', 'data', 'background', 'xlink:href']);
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

function isDangerousUrl(value: string): boolean {
  const normalized = value.replace(/\s+/g, '').toLowerCase();
  return (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:text/html')
  );
}

function sanitizeUrlAttribute(name: string, rawValue: string): string | null {
  const value = stripControlChars(rawValue);
  if (!value || isDangerousUrl(value)) return null;

  if (name === 'srcset') {
    const safeParts = value
      .split(',')
      .map((item) => item.trim())
      .map((item) => {
        const [url, descriptor] = item.split(/\s+/, 2);
        if (!url || isDangerousUrl(url)) return null;
        return descriptor ? `${url} ${descriptor}` : url;
      })
      .filter((item): item is string => Boolean(item));
    return safeParts.length ? safeParts.join(', ') : null;
  }

  if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(value)) return value;
  if (/^data:image\//i.test(value) && (name === 'src' || name === 'srcset' || name === 'poster')) return value;
  return null;
}

function sanitizeStyleAttribute(value: string): string | null {
  const cleaned = stripControlChars(value);
  if (!cleaned) return null;
  if (/(expression\s*\(|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html)/i.test(cleaned)) {
    return null;
  }
  return cleaned;
}

function sanitizeNode(node: any, mode: 'rich' | 'custom'): string {
  if (!node) return '';
  if (node.nodeType === 3) {
    return escapeText(String(node.textContent ?? ''));
  }
  if (node.nodeType !== 1) return '';

  const tag = String(node.nodeName ?? '').toLowerCase();
  if (!tag) return '';

  if (mode === 'rich' && !ALLOWED_RICH_TAGS.has(tag)) {
    return Array.from(node.childNodes ?? []).map((child) => sanitizeNode(child, mode)).join('');
  }

  if (mode === 'custom' && BLOCKED_CUSTOM_TAGS.has(tag)) {
    return '';
  }

  const attrs: string[] = [];
  if (mode === 'rich') {
    if (tag === 'a') {
      const href = sanitizeUrlAttribute('href', String(node.getAttribute('href') ?? '')) ?? '#';
      attrs.push(`href="${escapeAttr(href)}"`);
      attrs.push('target="_blank" rel="noopener noreferrer"');
    }
  } else {
    const rawAttrs = Array.from(node.attributes ?? []) as Array<{ name: string; value: string }>;
    rawAttrs.forEach((attr) => {
      const name = String(attr.name ?? '').toLowerCase();
      if (!name || name.startsWith('on') || name === 'srcdoc') return;

      if (URL_ATTRS.has(name)) {
        const safe = sanitizeUrlAttribute(name, String(attr.value ?? ''));
        if (!safe) return;
        attrs.push(`${name}="${escapeAttr(safe)}"`);
        return;
      }

      if (name === 'style') {
        const safeStyle = sanitizeStyleAttribute(String(attr.value ?? ''));
        if (safeStyle) attrs.push(`style="${escapeAttr(safeStyle)}"`);
        return;
      }

      attrs.push(`${name}="${escapeAttr(stripControlChars(String(attr.value ?? '')))}"`);
    });

    if (tag === 'a' && String(node.getAttribute('target') ?? '').toLowerCase() === '_blank') {
      attrs.push('rel="noopener noreferrer"');
    }
    if (tag === 'iframe' && !attrs.some((a) => a.startsWith('sandbox='))) {
      attrs.push('sandbox="allow-scripts allow-same-origin allow-popups allow-forms"');
    }
  }

  const attrStr = attrs.length ? ` ${attrs.join(' ')}` : '';
  if (VOID_TAGS.has(tag)) {
    return `<${tag}${attrStr}>`;
  }
  const inner = Array.from(node.childNodes ?? []).map((child) => sanitizeNode(child, mode)).join('');
  return `<${tag}${attrStr}>${inner}</${tag}>`;
}

function sanitizeWithParser(html: string, mode: 'rich' | 'custom'): string {
  if (!html?.trim()) return '';
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const body = (document as any).body;
  return Array.from(body?.childNodes ?? []).map((node) => sanitizeNode(node, mode)).join('');
}

/** Strip dangerous tags/attrs for rich text. */
export function sanitizeHtml(html: string): string {
  return sanitizeWithParser(html, 'rich');
}

/** Sanitize custom HTML while preserving structural markup. */
export function sanitizeCustomHtml(html: string): string {
  return sanitizeWithParser(html, 'custom');
}
