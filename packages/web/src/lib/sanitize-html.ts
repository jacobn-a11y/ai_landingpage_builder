/**
 * Browser-side sanitizer for rich text and custom HTML blocks.
 */

const ALLOWED_RICH_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strike',
  'strong',
  'sub',
  'sup',
  'u',
  'ul',
]);

const BLOCKED_CUSTOM_TAGS = new Set(['script', 'style', 'object', 'embed', 'base', 'meta', 'link']);
const URL_ATTRS = new Set(['href', 'src', 'srcset', 'poster', 'action', 'formaction', 'data', 'background', 'xlink:href']);
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

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

export function sanitizeHtml(html: string): string {
  return sanitizeWithParser(html, 'rich');
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Sanitize custom HTML blocks: strip script, style, event handlers, javascript: URLs.
 * Allows structural HTML for embeds and layouts.
 */
export function sanitizeCustomHtml(html: string): string {
  return sanitizeWithParser(html, 'custom');
}

function sanitizeWithParser(html: string, mode: 'rich' | 'custom'): string {
  if (!html?.trim()) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeText(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (mode === 'rich' && !ALLOWED_RICH_TAGS.has(tag)) {
      return Array.from(node.childNodes).map(walk).join('');
    }
    if (mode === 'custom' && BLOCKED_CUSTOM_TAGS.has(tag)) return '';

    const attrs: string[] = [];
    if (mode === 'rich') {
      if (tag === 'a') {
        const href = sanitizeUrlAttribute('href', el.getAttribute('href') ?? '') ?? '#';
        attrs.push(`href="${escapeAttr(href)}"`);
        attrs.push('target="_blank" rel="noopener noreferrer"');
      }
    } else {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (!name || name.startsWith('on') || name === 'srcdoc') continue;

        if (URL_ATTRS.has(name)) {
          const safe = sanitizeUrlAttribute(name, attr.value);
          if (!safe) continue;
          attrs.push(`${name}="${escapeAttr(safe)}"`);
          continue;
        }

        if (name === 'style') {
          const safeStyle = sanitizeStyleAttribute(attr.value);
          if (safeStyle) attrs.push(`style="${escapeAttr(safeStyle)}"`);
          continue;
        }

        attrs.push(`${name}="${escapeAttr(stripControlChars(attr.value))}"`);
      }

      if (tag === 'a' && (el.getAttribute('target') ?? '').toLowerCase() === '_blank') {
        attrs.push('rel="noopener noreferrer"');
      }
      if (tag === 'iframe' && !attrs.some((a) => a.startsWith('sandbox='))) {
        attrs.push('sandbox="allow-scripts allow-same-origin allow-popups allow-forms"');
      }
    }

    const inner = Array.from(node.childNodes).map(walk).join('');
    if (VOID_TAGS.has(tag)) {
      return `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;
    }
    return `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>${inner}</${tag}>`;
  };

  return Array.from(doc.body.childNodes).map(walk).join('');
}
