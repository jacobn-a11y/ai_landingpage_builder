/**
 * Utility helpers for block conversion: DOM inspection, style extraction, serialization.
 */

/** Generate a unique block ID. */
export function generateId(): string {
  return `block-${Math.random().toString(36).slice(2, 11)}`;
}

/** Get the full outer HTML of an element. */
export function getElementHtml(el: Element): string {
  return el.outerHTML;
}

/** Serialize an element by wrapping in a temporary div. */
export function serializeElement(el: Element): string {
  const div = el.ownerDocument.createElement('div');
  div.appendChild(el.cloneNode(true));
  return div.innerHTML;
}

/**
 * Extract inline styles from an element's style attribute.
 * Returns undefined if no meaningful styles are present.
 */
export function extractInlineStyles(el: Element): Record<string, string> | undefined {
  const styleAttr = el.getAttribute('style');
  if (!styleAttr?.trim()) return undefined;

  const styles: Record<string, string> = {};
  const declarations = styleAttr.split(';');
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim();
    const value = decl.slice(colonIdx + 1).trim();
    if (prop && value) {
      styles[prop] = value;
    }
  }

  return Object.keys(styles).length > 0 ? styles : undefined;
}

/** Get the inner HTML content, preserving inline formatting tags. */
export function getInnerHtml(el: Element): string {
  return el.innerHTML.trim();
}

/** Check if an element contains inline formatting (bold, italic, links, etc.). */
export function hasInlineFormatting(el: Element): boolean {
  const inlineTags = ['strong', 'b', 'em', 'i', 'a', 'span', 'code', 'u', 'mark', 'sub', 'sup', 'br'];
  for (const tag of inlineTags) {
    if (el.querySelector(tag)) return true;
  }
  return false;
}

/** Check if element should be treated as Custom HTML (tables, complex layouts). */
export function isComplexHtml(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  return tag === 'table' || tag === 'iframe' || tag === 'video' || tag === 'audio';
}

/** Resolve an image src against a base URL. */
export function resolveImageSrc(src: string, baseUrl: string): string {
  if (!src || !baseUrl) return src;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}
