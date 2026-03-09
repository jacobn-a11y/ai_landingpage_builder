/**
 * Simple HTML sanitizer for rich text. Allows only safe inline formatting tags.
 */

const ALLOWED_TAGS = [
  'b', 'i', 'u', 's', 'strong', 'em', 'a', 'br', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div',
  'ul', 'ol', 'li',
  'sub', 'sup', 'strike', 'del',
  'blockquote', 'pre', 'code',
];

export function sanitizeHtml(html: string): string {
  if (!html?.trim()) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeText(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.includes(tag)) {
      return Array.from(node.childNodes).map(walk).join('');
    }
    const attrs: string[] = [];
    if (tag === 'a') {
      const href = el.getAttribute('href');
      if (href) {
        const safe = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('#')
          ? href
          : '#';
        attrs.push(`href="${escapeAttr(safe)}"`);
      }
      const target = el.getAttribute('target');
      if (target === '_blank') attrs.push('target="_blank" rel="noopener noreferrer"');
    }
    const inner = Array.from(node.childNodes).map(walk).join('');
    return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>${inner}</${tag}>`;
  };
  return Array.from(doc.body.childNodes).map(walk).join('');
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
  if (!html?.trim()) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (['script', 'style'].includes(tag)) return '';
    const attrs: string[] = [];
    for (const a of el.attributes) {
      if (/^on\w+/i.test(a.name)) continue;
      let val = a.value;
      if ((a.name === 'href' || a.name === 'src') && (/^javascript:/i.test(val) || /^data:\s*text\/html/i.test(val))) continue;
      attrs.push(`${a.name}="${escapeAttr(val)}"`);
    }
    const inner = Array.from(node.childNodes).map(walk).join('');
    return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>${inner}</${tag}>`;
  };
  return Array.from(doc.body.childNodes).map(walk).join('');
}
