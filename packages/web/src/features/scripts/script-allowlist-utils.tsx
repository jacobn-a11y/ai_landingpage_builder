/**
 * Shared utilities for script allowlist validation and CSP preview.
 * Used by ScriptsFeature and PageScriptsPanel.
 */

import type { ScriptAllowlistEntry } from '@/lib/api';

/** Extract external domains referenced in a script snippet (src/href attrs and bare URLs). */
export function extractDomainsFromScript(script: string): string[] {
  const domains: string[] = [];
  const urlRegex = /(?:src|href)=["']([^"']+)["']/gi;
  const scriptRegex = /(?:https?:)?\/\/[^\s"'<>]+/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRegex.exec(script)) !== null) {
    try {
      const u = new URL(m[1], 'https://example.com');
      if (u.origin !== 'https://example.com') {
        const host = u.hostname;
        if (host && !domains.includes(host)) domains.push(host);
      }
    } catch {
      /* ignore */
    }
  }
  const urlMatches = script.match(scriptRegex) ?? [];
  for (const match of urlMatches) {
    try {
      const url = match.startsWith('http') ? match : `https://${match.replace(/^\/+/, '')}`;
      const u = new URL(url);
      const host = u.hostname;
      if (host && host !== 'example.com' && !domains.includes(host)) {
        domains.push(host);
      }
    } catch {
      /* ignore */
    }
  }
  return domains;
}

/** Warn when script references domains not in the allowlist. */
export function DomainWarning({
  script,
  allowlist,
  className,
}: {
  script: string;
  allowlist: ScriptAllowlistEntry[];
  className?: string;
}) {
  if (!script?.trim()) return null;
  const domains = extractDomainsFromScript(script);
  const allowlistDomains = new Set(
    allowlist.map((e) => e.domain.replace(/^https?:\/\//, '').toLowerCase())
  );
  const missing = domains.filter((d) => !allowlistDomains.has(d.toLowerCase()));
  if (missing.length === 0) return null;
  return (
    <p className={className ?? 'mt-1 text-sm text-amber-600 dark:text-amber-500'}>
      Domain must be in allowlist: {missing.join(', ')}
    </p>
  );
}

/**
 * Build a CSP preview string from the current allowlist (client-side approximation).
 * The actual header uses a per-request nonce; we show a placeholder.
 */
export function buildCspPreview(allowlist: ScriptAllowlistEntry[]): string {
  const origins = allowlist
    .map((e) => {
      let d = e.domain.trim().toLowerCase();
      if (!d) return '';
      if (!d.startsWith('http://') && !d.startsWith('https://')) d = `https://${d}`;
      try {
        const u = new URL(d);
        const base = u.origin;
        return e.pathPrefix
          ? `${base}${e.pathPrefix.startsWith('/') ? e.pathPrefix : `/${e.pathPrefix}`}`
          : base;
      } catch {
        return '';
      }
    })
    .filter(Boolean);
  const scriptSrc = ["'self'", "'nonce-<per-request>'", ...origins].join(' ');
  const connectSrc = ["'self'", ...origins].join(' ');
  return [
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "default-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
