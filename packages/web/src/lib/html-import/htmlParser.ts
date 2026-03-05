/**
 * Parse HTML string into a DOM Document for traversal.
 * Uses DOMParser for client-side parsing.
 */

/**
 * Parse HTML string to Document.
 * Extracts the body element for block conversion (skips head, scripts, etc.).
 */
export function parseHtml(html: string): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc;
}

/**
 * Get the main content container from the document.
 * Prefers body > main > first section, or body itself.
 */
export function getContentRoot(doc: Document): Element {
  const body = doc.body;
  if (!body) return doc.documentElement;

  const main = body.querySelector('main');
  if (main) return main;

  const firstSection = body.querySelector('section');
  if (firstSection) return firstSection;

  return body;
}

/**
 * Extract text content from an element, stripping extra whitespace.
 */
export function getTextContent(el: Element): string {
  return (el.textContent ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * Check if element has button-like styling (common class patterns).
 */
export function looksLikeButton(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === 'button') return true;
  if (tag !== 'a') return false;

  const cls = (el.getAttribute('class') ?? '').toLowerCase();
  const role = el.getAttribute('role')?.toLowerCase();
  const href = el.getAttribute('href');

  const buttonClasses = ['btn', 'button', 'cta', 'primary', 'secondary'];
  if (buttonClasses.some((c) => cls.includes(c))) return true;
  if (role === 'button') return true;
  if (href && (cls.includes('btn') || cls.includes('button'))) return true;

  return false;
}

/**
 * Check if element is a section-like container (section, div.section, etc.).
 */
export function isSectionLike(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === 'section') return true;
  if (tag === 'div') {
    const cls = (el.getAttribute('class') ?? '').toLowerCase();
    return cls.includes('section') || cls.includes('block') || cls.includes('hero');
  }
  return false;
}
