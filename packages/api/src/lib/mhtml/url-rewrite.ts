/**
 * URL rewriting for MHTML content.
 *
 * Rewrites all resource references in HTML (src, href, srcset, poster, data,
 * CSS url(), @import, cid: references) to point to stored asset URLs.
 */

export type UrlMap = Map<string, string>; // originalUrl -> storedUrl

/**
 * Normalize a URL for matching against Content-Location keys.
 * - Lowercase scheme and host
 * - Remove fragment
 * - Preserve query for uniqueness
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    // Not a valid absolute URL; return as-is (for relative URLs)
    return url.split('#')[0];
  }
}

/**
 * Resolve a relative URL against a base URL.
 */
export function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch {
    return relativeUrl;
  }
}

/**
 * Rewrite all resource references in HTML.
 */
export function rewriteHtmlUrls(
  html: string,
  urlMap: UrlMap,
  baseUrl?: string,
): string {
  let result = html;

  // 1. Extract and resolve <base href> if present, then remove it
  const baseHrefMatch = result.match(/<base[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/i);
  const effectiveBase = baseHrefMatch ? baseHrefMatch[1] : baseUrl;
  result = result.replace(/<base[^>]*>/gi, '');

  // 2. Rewrite src, href, poster, data attributes
  result = result.replace(
    /((?:src|href|poster|data)\s*=\s*)(["'])([^"']*?)\2/gi,
    (_match, prefix, quote, url) => {
      const rewritten = rewriteUrl(url, urlMap, effectiveBase);
      return `${prefix}${quote}${rewritten}${quote}`;
    },
  );

  // 3. Rewrite srcset attribute (comma-separated URLs with optional descriptors)
  result = result.replace(
    /(srcset\s*=\s*)(["'])([^"']*?)\2/gi,
    (_match, prefix, quote, srcset) => {
      const rewritten = srcset
        .split(',')
        .map((entry: string) => {
          const parts = entry.trim().split(/\s+/);
          if (parts.length > 0) {
            parts[0] = rewriteUrl(parts[0], urlMap, effectiveBase);
          }
          return parts.join(' ');
        })
        .join(', ');
      return `${prefix}${quote}${rewritten}${quote}`;
    },
  );

  // 4. Rewrite CSS url() in inline styles and <style> blocks
  result = rewriteCssUrls(result, urlMap, effectiveBase);

  // 5. Remove meta refresh tags
  result = result.replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');

  return result;
}

/**
 * Rewrite CSS url() references in any string (works for both HTML with inline CSS and pure CSS).
 */
export function rewriteCssUrls(
  content: string,
  urlMap: UrlMap,
  baseUrl?: string,
): string {
  return content.replace(
    /url\(\s*["']?([^"')]+?)["']?\s*\)/gi,
    (_match, url) => {
      // Don't rewrite internal fragment references (e.g., url(#gradient))
      if (url.startsWith('#')) return _match;
      // Don't rewrite data URIs (they're self-contained)
      if (url.startsWith('data:')) return _match;

      const rewritten = rewriteUrl(url.trim(), urlMap, baseUrl);
      return `url("${rewritten}")`;
    },
  );
}

/**
 * Rewrite @import url() in CSS.
 */
export function rewriteCssImports(
  css: string,
  urlMap: UrlMap,
  baseUrl?: string,
): string {
  return css.replace(
    /@import\s+url\(\s*["']?([^"')]+?)["']?\s*\)/gi,
    (_match, url) => {
      const rewritten = rewriteUrl(url.trim(), urlMap, baseUrl);
      return `@import url("${rewritten}")`;
    },
  );
}

/**
 * Rewrite a single URL using the URL map.
 * Tries exact match, then normalized match, then cid: resolution.
 */
function rewriteUrl(url: string, urlMap: UrlMap, baseUrl?: string): string {
  // Direct match
  if (urlMap.has(url)) return urlMap.get(url)!;

  // Normalize and match
  const normalized = normalizeUrl(url);
  if (urlMap.has(normalized)) return urlMap.get(normalized)!;

  // Resolve relative URL against base and try again
  if (baseUrl) {
    const resolved = resolveUrl(url, baseUrl);
    if (urlMap.has(resolved)) return urlMap.get(resolved)!;
    const normalizedResolved = normalizeUrl(resolved);
    if (urlMap.has(normalizedResolved)) return urlMap.get(normalizedResolved)!;
  }

  // Handle cid: references
  if (url.startsWith('cid:')) {
    const cidKey = url; // cid: references are stored with 'cid:' prefix in map
    if (urlMap.has(cidKey)) return urlMap.get(cidKey)!;
  }

  // No match; return original URL
  return url;
}
