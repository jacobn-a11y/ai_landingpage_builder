/**
 * Server-side HTML sanitizer for rich text. Allows only safe inline formatting tags.
 * No DOM - uses regex for Node.js compatibility.
 */

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Strip dangerous tags/attrs, allow only b,i,u,strong,em,a,br. Sanitize href on <a>. */
export function sanitizeHtml(html: string): string {
  if (!html?.trim()) return '';
  // Remove script, style, iframe, object, embed
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  out = out.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
  out = out.replace(/<embed\b[^>]*\/?>/gi, '');
  out = out.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  out = out.replace(/javascript:/gi, '');
  // Process allowed tags: b, i, u, strong, em, br, a
  out = out.replace(/<(br)\s*\/?>/gi, '<br>');
  out = out.replace(/<\/(b|i|u|strong|em)>/gi, (_, tag) => `</${tag}>`);
  out = out.replace(/<(b|i|u|strong|em)(\s[^>]*)?>/gi, (_, tag) => `<${tag}>`);
  out = out.replace(/<a\s+([^>]*)>/gi, (_, attrs) => {
    const hrefM = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
    let href = hrefM ? hrefM[1].trim() : '#';
    if (!/^(https?:|mailto:|#)/i.test(href)) href = '#';
    return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`;
  });
  out = out.replace(/<\/a>/gi, '</a>');
  // Remove any remaining tags
  out = out.replace(/<[^>]+>/g, (m) => {
    const tag = m.replace(/<\/?(\w+).*/, '$1').toLowerCase();
    if (['b','i','u','strong','em','br','a'].includes(tag)) return m;
    return '';
  });
  return out;
}

/**
 * Sanitize custom HTML blocks: strip script, style, event handlers, javascript: URLs.
 * Allows structural HTML (div, table, iframe with safe src, etc.) for embeds and layouts.
 */
export function sanitizeCustomHtml(html: string): string {
  if (!html?.trim()) return '';
  let out = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
  out = out.replace(/href\s*=\s*["']([^"']*)["']/gi, (_, url) => {
    const u = url.trim();
    if (/^(javascript|data):/i.test(u)) return 'href="#"';
    return `href="${escapeAttr(u)}"`;
  });
  out = out.replace(/src\s*=\s*["']([^"']*)["']/gi, (_, url) => {
    const u = url.trim();
    if (/^(javascript|data):/i.test(u)) return '';
    return `src="${escapeAttr(u)}"`;
  });
  return out;
}
