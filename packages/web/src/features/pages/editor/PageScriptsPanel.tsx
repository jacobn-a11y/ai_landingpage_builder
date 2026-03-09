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
import { DomainWarning } from '@/features/scripts/script-allowlist-utils';

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
        <DomainWarning script={scripts?.header ?? ''} allowlist={allowlist} className="mt-1 text-xs text-amber-600 dark:text-amber-500" />
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
        <DomainWarning script={scripts?.footer ?? ''} allowlist={allowlist} className="mt-1 text-xs text-amber-600 dark:text-amber-500" />
      </div>
    </div>
  );
}
