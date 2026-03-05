/**
 * Simple HTML sanitizer for rich text. Allows only safe inline formatting tags.
 */

const ALLOWED_TAGS = ['b', 'i', 'u', 'strong', 'em', 'a', 'br'];

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
