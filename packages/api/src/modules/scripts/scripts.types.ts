/**
 * Script allowlist, CSP, and global/page script types.
 */

/** A single entry in the script domain allowlist. */
export interface AllowlistEntry {
  /** Domain (e.g. "cdn.example.com" or "https://cdn.example.com"). */
  domain: string;
  /** Whether to include all subdomains (e.g. *.example.com). */
  subdomains?: boolean;
  /** Optional path constraints to restrict allowed URLs (e.g. ["/js/", "/analytics/"]). */
  pathConstraints?: string[];
}

/** Backwards-compatible alias used by existing code. */
export interface ScriptAllowlistEntry {
  domain: string;
  pathPrefix?: string;
}

export type ScriptAllowlist = ScriptAllowlistEntry[];

/** Global scripts injected on every published page in a workspace. */
export interface GlobalScripts {
  /** Code injected before </head> on every page. */
  headerCode: string | null;
  /** Code injected before </body> on every page. */
  footerCode: string | null;
}

/** Per-page scripts set in the page editor. */
export interface PageScripts {
  /** Code injected before </head> on this page only. */
  headerCode: string | null;
  /** Code injected before </body> on this page only. */
  footerCode: string | null;
}
