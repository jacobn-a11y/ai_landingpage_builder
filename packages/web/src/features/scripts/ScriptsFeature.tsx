import { useState, useEffect } from 'react';
import { api, type Workspace, type ScriptAllowlistEntry } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';

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
  const fullScript = script;
  const urlMatches = fullScript.match(scriptRegex) ?? [];
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
  const missing = domains.filter(
    (d) => !allowlistDomains.has(d.toLowerCase())
  );
  if (missing.length === 0) return null;
  return (
    <p className="mt-1 text-sm text-amber-600 dark:text-amber-500">
      Domain must be in allowlist: {missing.join(', ')}
    </p>
  );
}

export function ScriptsFeature() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globalHeaderScript, setGlobalHeaderScript] = useState('');
  const [globalFooterScript, setGlobalFooterScript] = useState('');
  const [scriptAllowlist, setScriptAllowlist] = useState<ScriptAllowlistEntry[]>([]);
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newPathPrefix, setNewPathPrefix] = useState('');

  const fetchWorkspace = async () => {
    try {
      const { workspace: w } = await api.workspaces.get();
      setWorkspace(w);
      setGlobalHeaderScript(w.globalHeaderScript ?? '');
      setGlobalFooterScript(w.globalFooterScript ?? '');
      setScriptAllowlist(w.scriptAllowlist ?? []);
    } catch {
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const handleSave = async () => {
    if (!workspace) return;
    setSaving(true);
    try {
      const { workspace: w } = await api.workspaces.updateSettings(workspace.id, {
        globalHeaderScript: globalHeaderScript || null,
        globalFooterScript: globalFooterScript || null,
        scriptAllowlist,
      });
      setWorkspace(w);
      setGlobalHeaderScript(w.globalHeaderScript ?? '');
      setGlobalFooterScript(w.globalFooterScript ?? '');
      setScriptAllowlist(w.scriptAllowlist ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = () => {
    const domain = newDomain.trim();
    if (!domain) return;
    if (scriptAllowlist.some((e) => e.domain.toLowerCase() === domain.toLowerCase())) {
      setAddDomainOpen(false);
      setNewDomain('');
      setNewPathPrefix('');
      return;
    }
    setScriptAllowlist([
      ...scriptAllowlist,
      { domain, pathPrefix: newPathPrefix.trim() || undefined },
    ]);
    setAddDomainOpen(false);
    setNewDomain('');
    setNewPathPrefix('');
  };

  const handleRemoveDomain = (index: number) => {
    setScriptAllowlist(scriptAllowlist.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Workspace not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Scripts</h1>
        <p className="mt-2 text-muted-foreground">
          Manage global and page-level scripts and allowlists. Scripts with external URLs require
          domains to be in the allowlist.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global scripts</CardTitle>
          <CardDescription>
            Injected on every published page. Global header before &lt;/head&gt;, global footer
            before &lt;/body&gt;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="global-header">Header code (before &lt;/head&gt;)</Label>
            <Textarea
              id="global-header"
              value={globalHeaderScript}
              onChange={(e) => setGlobalHeaderScript(e.target.value)}
              placeholder="<script src='...'></script> or inline script"
              className="min-h-[120px] font-mono text-sm"
            />
            <DomainWarning script={globalHeaderScript} allowlist={scriptAllowlist} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="global-footer">Footer code (before &lt;/body&gt;)</Label>
            <Textarea
              id="global-footer"
              value={globalFooterScript}
              onChange={(e) => setGlobalFooterScript(e.target.value)}
              placeholder="<script src='...'></script> or inline script"
              className="min-h-[120px] font-mono text-sm"
            />
            <DomainWarning script={globalFooterScript} allowlist={scriptAllowlist} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Script allowlist</CardTitle>
          <CardDescription>
            Domains and subdomains that scripts can load from. CSP is derived from this list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Path prefix (optional)</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scriptAllowlist.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground text-center py-8">
                    No domains. Add domains that your scripts load from.
                  </TableCell>
                </TableRow>
              ) : (
                scriptAllowlist.map((entry, i) => (
                  <TableRow key={`${entry.domain}-${i}`}>
                    <TableCell className="font-mono text-sm">{entry.domain}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {entry.pathPrefix ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveDomain(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setAddDomainOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add domain
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>

      <Dialog open={addDomainOpen} onOpenChange={setAddDomainOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add domain to allowlist</DialogTitle>
            <DialogDescription>
              Enter the domain (e.g. cdn.example.com or https://cdn.example.com) that scripts can
              load from.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-domain">Domain</Label>
              <Input
                id="new-domain"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="cdn.example.com"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-path">Path prefix (optional)</Label>
              <Input
                id="new-path"
                value={newPathPrefix}
                onChange={(e) => setNewPathPrefix(e.target.value)}
                placeholder="/scripts"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDomainOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDomain} disabled={!newDomain.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
