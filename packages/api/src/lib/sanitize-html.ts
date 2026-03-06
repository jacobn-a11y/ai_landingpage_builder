/**
 * Server-side HTML sanitizer for rich text. Allows only safe inline formatting tags.
 * No DOM - uses regex for Node.js compatibility.
 *
 * Uses a strict whitelist approach: all non-allowed tags are stripped,
 * all event handlers and dangerous URI schemes are removed.
 */

const ALLOWED_TAGS = new Set(['b', 'i', 'u', 'strong', 'em', 'a', 'br']);

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip dangerous tags/attrs, allow only b,i,u,strong,em,a,br. Sanitize href on <a>. */
export function sanitizeHtml(html: string): string {
  if (!html?.trim()) return '';
  // Remove dangerous tags including their content
  let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '');
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '');
  out = out.replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, '');
  out = out.replace(/<embed\b[^>]*\/?>/gi, '');
  out = out.replace(/<base\b[^>]*\/?>/gi, '');
  out = out.replace(/<form\b[^>]*>[\s\S]*?<\/form\s*>/gi, '');
  out = out.replace(/<meta\b[^>]*\/?>/gi, '');
  out = out.replace(/<link\b[^>]*\/?>/gi, '');
  // Remove all event handlers (handle unquoted values too)
  out = out.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Remove dangerous URI schemes anywhere in attributes
  out = out.replace(/javascript\s*:/gi, '#blocked:');
  out = out.replace(/vbscript\s*:/gi, '#blocked:');
  out = out.replace(/data\s*:\s*text\/html/gi, '#blocked:');
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
  // Remove any remaining non-allowed tags
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g, (m, tag) => {
    if (ALLOWED_TAGS.has(tag.toLowerCase())) return m;
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
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<base\b[^>]*\/?>/gi, '')
    .replace(/<meta\b[^>]*\/?>/gi, '')
    .replace(/<link\b[^>]*\/?>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '#blocked:')
    .replace(/vbscript\s*:/gi, '#blocked:');
  out = out.replace(/href\s*=\s*["']([^"']*)["']/gi, (_, url) => {
    const u = url.trim();
    if (/^(javascript|vbscript|data\s*:\s*text\/html)/i.test(u)) return 'href="#"';
    return `href="${escapeAttr(u)}"`;
  });
  out = out.replace(/src\s*=\s*["']([^"']*)["']/gi, (_, url) => {
    const u = url.trim();
    if (/^(javascript|vbscript|data\s*:\s*text\/html)/i.test(u)) return '';
    return `src="${escapeAttr(u)}"`;
  });
  return out;
}
