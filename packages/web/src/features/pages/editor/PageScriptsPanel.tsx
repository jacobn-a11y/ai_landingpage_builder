/**
 * Page-level scripts: header and footer code.
 * Shown when no block is selected in the Properties panel.
 */

import { useState, useEffect } from 'react';
import { useEditor } from './EditorContext';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, type ScriptAllowlistEntry } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

function extractDomainsFromScript(script: string): string[] {
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

function DomainWarning({
  script,
  allowlist,
}: {
  script: string;
  allowlist: ScriptAllowlistEntry[];
}) {
  if (!script?.trim()) return null;
  const domains = extractDomainsFromScript(script);
  const allowlistDomains = new Set(
    allowlist.map((e) => e.domain.replace(/^https?:\/\//, '').toLowerCase())
  );
  const missing = domains.filter((d) => !allowlistDomains.has(d.toLowerCase()));
  if (missing.length === 0) return null;
  return (
    <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
      Domain must be in allowlist: {missing.join(', ')}. Add in Scripts (admin).
    </p>
  );
}

export function PageScriptsPanel() {
  const { scripts, updateScripts } = useEditor();
  const { showError } = useToast();
  const [allowlist, setAllowlist] = useState<ScriptAllowlistEntry[]>([]);

  useEffect(() => {
    api.workspaces
      .get()
      .then(({ workspace }) => setAllowlist(workspace.scriptAllowlist ?? []))
      .catch((e) => {
        setAllowlist([]);
        showError(e instanceof Error ? e.message : 'Failed to load script allowlist');
      });
  }, [showError]);

  return (
    <div className="space-y-4 p-3">
      <div className="space-y-2">
        <Label htmlFor="page-header-script" className="text-xs">
          Header code (before &lt;/head&gt;)
        </Label>
        <Textarea
          id="page-header-script"
          value={scripts?.header ?? ''}
          onChange={(e) => updateScripts({ header: e.target.value })}
          placeholder="<script src='...'></script>"
          className="min-h-[80px] font-mono text-xs"
        />
        <DomainWarning script={scripts?.header ?? ''} allowlist={allowlist} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="page-footer-script" className="text-xs">
          Footer code (before &lt;/body&gt;)
        </Label>
        <Textarea
          id="page-footer-script"
          value={scripts?.footer ?? ''}
          onChange={(e) => updateScripts({ footer: e.target.value })}
          placeholder="<script src='...'></script>"
          className="min-h-[80px] font-mono text-xs"
        />
        <DomainWarning script={scripts?.footer ?? ''} allowlist={allowlist} />
      </div>
    </div>
  );
}
