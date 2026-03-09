/**
 * MHTML-specific HTML and CSS sanitization.
 *
 * More permissive than the generic sanitizer: preserves structural HTML
 * and <style> tags needed for layout, but aggressively strips scripting,
 * navigation triggers, and dangerous content.
 */

// Dangerous tags to strip entirely (including their content)
const STRIP_TAGS_WITH_CONTENT = new Set([
  'script', 'noscript', 'iframe', 'object', 'embed', 'applet',
  'frame', 'frameset',
]);

// Tags to strip (but keep children)
const STRIP_TAGS_KEEP_CHILDREN = new Set([
  'base',
]);

// Dangerous attribute prefixes/names
const DANGEROUS_ATTR_PATTERNS = [
  /^on/i,           // Event handlers: onclick, onload, etc.
  /^formaction$/i,
  /^xlink:href$/i,  // SVG xlink (can be scripted)
];

// Dangerous URL schemes
const DANGEROUS_SCHEMES = /^(javascript|vbscript|data\s*:\s*text\/html)/i;

// Dangerous CSS patterns
const DANGEROUS_CSS_PATTERNS = [
  /expression\s*\(/gi,
  /-moz-binding\s*:/gi,
  /url\s*\(\s*["']?\s*javascript:/gi,
  /behavior\s*:/gi,
];

export interface SanitizeResult {
  html: string;
  warnings: string[];
}

/**
 * Sanitize HTML from an MHTML document.
 * Uses regex-based approach consistent with existing API sanitizer.
 */
export function sanitizeMhtml(html: string): SanitizeResult {
  const warnings: string[] = [];
  let result = html;

  // 1. Strip dangerous tags with their content
  for (const tag of STRIP_TAGS_WITH_CONTENT) {
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    const matches = result.match(regex);
    if (matches && matches.length > 0) {
      warnings.push(`Stripped ${matches.length} <${tag}> element(s)`);
    }
    result = result.replace(regex, '');
    // Also strip self-closing variants
    result = result.replace(new RegExp(`<${tag}[^>]*\\/?>`, 'gi'), '');
  }

  // 2. Strip tags but keep children
  for (const tag of STRIP_TAGS_KEEP_CHILDREN) {
    result = result.replace(new RegExp(`<\\/?${tag}[^>]*>`, 'gi'), '');
  }

  // 3. Remove <meta http-equiv="refresh"> (navigation trigger)
  result = result.replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');

  // 4. Strip dangerous attributes
  result = result.replace(/<([a-z][a-z0-9]*)\s+([^>]*?)>/gi, (match, tag, attrs) => {
    let cleanAttrs = attrs;

    // Remove event handlers and dangerous attributes
    for (const pattern of DANGEROUS_ATTR_PATTERNS) {
      cleanAttrs = cleanAttrs.replace(
        new RegExp(`\\s*${pattern.source}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]*)`, 'gi'),
        '',
      );
    }

    // Sanitize href/src/action attributes
    cleanAttrs = cleanAttrs.replace(
      /((?:href|src|action|poster|data)\s*=\s*)(["'])([^"']*?)\2/gi,
      (attrMatch: string, prefix: string, quote: string, url: string) => {
        if (DANGEROUS_SCHEMES.test(url.trim())) {
          warnings.push(`Removed dangerous URL: ${url.substring(0, 50)}`);
          return `${prefix}${quote}${quote}`;
        }
        return attrMatch;
      },
    );

    return `<${tag} ${cleanAttrs}>`;
  });

  // 5. Sanitize CSS in <style> tags
  result = result.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_match, css: string) => {
    let cleanCss = css;
    for (const pattern of DANGEROUS_CSS_PATTERNS) {
      if (pattern.test(cleanCss)) {
        warnings.push('Removed dangerous CSS pattern');
      }
      cleanCss = cleanCss.replace(pattern, '/* sanitized */');
    }
    // Remove @import rules pointing to external URLs (keep internal ones that were already rewritten)
    cleanCss = cleanCss.replace(/@import\s+url\s*\(\s*["']?https?:\/\/[^"')]+["']?\s*\)[^;]*;/gi, '/* external @import removed */');
    return `<style>${cleanCss}</style>`;
  });

  // 6. Sanitize inline style attributes
  result = result.replace(/style\s*=\s*"([^"]*)"/gi, (_match, css: string) => {
    let cleanCss = css;
    for (const pattern of DANGEROUS_CSS_PATTERNS) {
      cleanCss = cleanCss.replace(pattern, '/* sanitized */');
    }
    return `style="${cleanCss}"`;
  });

  return { html: result, warnings };
}

/**
 * Sanitize a CSS stylesheet string (extracted from MHTML parts).
 */
export function sanitizeCss(css: string): { css: string; warnings: string[] } {
  const warnings: string[] = [];
  let result = css;

  for (const pattern of DANGEROUS_CSS_PATTERNS) {
    if (pattern.test(result)) {
      warnings.push('Removed dangerous CSS pattern');
    }
    result = result.replace(pattern, '/* sanitized */');
  }

  // Remove external @import
  result = result.replace(/@import\s+url\s*\(\s*["']?https?:\/\/[^"')]+["']?\s*\)[^;]*;/gi, '/* external @import removed */');

  return { css: result, warnings };
}
