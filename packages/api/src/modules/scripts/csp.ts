/**
 * Content-Security-Policy generation from script allowlist.
 * Supports nonce-based inline scripts and allowlisted external domains.
 */

import type { AllowlistEntry, ScriptAllowlist } from './scripts.types.js';

/** Input accepted by all CSP generators: legacy flat list or new AllowlistEntry[]. */
export type CspAllowlistInput = ScriptAllowlist | AllowlistEntry[] | null | undefined;

/**
 * Normalize a domain string to its origin (e.g. "cdn.example.com" -> "https://cdn.example.com").
 */
function normalizeOrigin(domain: string): string {
  let d = domain.trim().toLowerCase();
  if (!d) return '';
  if (!d.startsWith('http://') && !d.startsWith('https://')) {
    d = `https://${d}`;
  }
  try {
    const u = new URL(d);
    return u.origin;
  } catch {
    return '';
  }
}

/**
 * Check if an entry is the new AllowlistEntry shape (has `subdomains` or `pathConstraints`).
 */
function isAllowlistEntry(entry: unknown): entry is AllowlistEntry {
  return !!entry && typeof entry === 'object' && 'domain' in entry && ('subdomains' in entry || 'pathConstraints' in entry);
}

/**
 * Collect unique origins from an allowlist, supporting both legacy ScriptAllowlistEntry
 * and new AllowlistEntry (with subdomain wildcards and path constraints).
 */
function collectAllowedSources(allowlist: CspAllowlistInput): string[] {
  const sources: string[] = [];
  const raw = Array.isArray(allowlist) ? allowlist : [];
  for (const entry of raw) {
    const domain = entry?.domain?.trim();
    if (!domain) continue;

    if (isAllowlistEntry(entry)) {
      // New-style entry: support wildcard subdomains
      const origin = normalizeOrigin(domain);
      if (!origin) continue;
      if (entry.subdomains) {
        // Extract hostname and prepend *. for CSP wildcard
        try {
          const u = new URL(origin);
          const wildcard = `${u.protocol}//*.${u.hostname}`;
          if (!sources.includes(wildcard)) sources.push(wildcard);
        } catch { /* skip */ }
      }
      // Path constraints: add origin+path for each constraint
      if (entry.pathConstraints?.length) {
        for (const pc of entry.pathConstraints) {
          const full = `${origin}${pc.startsWith('/') ? pc : `/${pc}`}`;
          if (!sources.includes(full)) sources.push(full);
        }
      } else if (!sources.includes(origin)) {
        sources.push(origin);
      }
    } else {
      // Legacy ScriptAllowlistEntry
      const prefix = (entry as { pathPrefix?: string })?.pathPrefix?.trim();
      const origin = prefix
        ? `${normalizeOrigin(domain)}${prefix.startsWith('/') ? prefix : `/${prefix}`}`
        : normalizeOrigin(domain);
      if (origin && !sources.includes(origin)) {
        sources.push(origin);
      }
    }
  }
  return sources;
}

/**
 * Build CSP header value from allowlist (no nonce).
 * Kept for backwards compatibility with existing callers.
 *
 * script-src: 'self' plus allowlisted domains
 * connect-src: 'self' plus allowlisted domains
 * style-src: 'self' 'unsafe-inline'
 */
export function buildCspFromAllowlist(allowlist: CspAllowlistInput): string {
  const allowed = collectAllowedSources(allowlist);
  const scriptSrc = ["'self'", ...allowed];
  const connectSrc = ["'self'", ...allowed];

  const directives = [
    `script-src ${scriptSrc.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    "default-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join('; ');
}

/**
 * Generate a full CSP header with nonce support for inline scripts.
 *
 * @param allowlist - Array of allowed domains / path prefixes
 * @param nonce     - A per-request nonce string for inline script tags
 * @returns CSP header value string
 */
export function generateCspHeader(
  allowlist: CspAllowlistInput,
  nonce: string
): string {
  const allowed = collectAllowedSources(allowlist);
  const nonceToken = `'nonce-${nonce}'`;
  const scriptSrc = ["'self'", nonceToken, ...allowed];
  const connectSrc = ["'self'", ...allowed];

  const directives = [
    `script-src ${scriptSrc.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    "default-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join('; ');
}
