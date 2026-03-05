/**
 * Script allowlist and CSP types.
 */

export interface ScriptAllowlistEntry {
  domain: string;
  pathPrefix?: string;
}

export type ScriptAllowlist = ScriptAllowlistEntry[];
