/**
 * Content-Security-Policy generation from script allowlist.
 */

import type { ScriptAllowlist } from './scripts.types.js';

/**
 * Build CSP header value from allowlist.
 * script-src: 'self' plus allowlisted domains
 * style-src: 'self' 'unsafe-inline' (for editor/inline styles)
 */
export function buildCspFromAllowlist(allowlist: ScriptAllowlist | null | undefined): string {
  const scriptSrc = ["'self'"];
  const raw = Array.isArray(allowlist) ? allowlist : [];
  for (const entry of raw) {
    const domain = entry?.domain?.trim();
    if (!domain) continue;
    const prefix = entry?.pathPrefix?.trim();
    const origin = prefix
      ? `${normalizeOrigin(domain)}${prefix.startsWith('/') ? prefix : `/${prefix}`}`
      : normalizeOrigin(domain);
    if (origin && !scriptSrc.includes(origin)) {
      scriptSrc.push(origin);
    }
  }

  const directives = [
    `script-src ${scriptSrc.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    "default-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
  ];
  return directives.join('; ');
}

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
