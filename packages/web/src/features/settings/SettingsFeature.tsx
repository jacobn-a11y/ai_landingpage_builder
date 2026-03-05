import { useState, useEffect } from 'react';
import { api, type Workspace } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SettingsFeature() {
  const { isAdmin } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [allowedEmailDomains, setAllowedEmailDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { workspace: w } = await api.workspaces.get();
      setWorkspace(w);
      setName(w.name);
      setAllowedEmailDomains(w.allowedEmailDomains ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveName = async () => {
    if (!workspace || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { workspace: w } = await api.workspaces.updateSettings(workspace.id, {
        name: name.trim(),
      });
      setWorkspace(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDomains = async () => {
    if (!workspace || !isAdmin) return;
    setSaving(true);
    setError(null);
    try {
      const { workspace: w } = await api.workspaces.updateSettings(workspace.id, {
        allowedEmailDomains,
      });
      setWorkspace(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase();
    if (!d || allowedEmailDomains.includes(d)) return;
    setAllowedEmailDomains([...allowedEmailDomains, d]);
    setNewDomain('');
  };

  const removeDomain = (domain: string) => {
    setAllowedEmailDomains(allowedEmailDomains.filter((d) => d !== domain));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div>
        <p className="text-destructive">Failed to load workspace.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Workspace and account configuration.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Workspace name</CardTitle>
          <CardDescription>
            Display name for your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace name"
              className="max-w-sm"
            />
            <Button onClick={handleSaveName} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Allowed email domains</CardTitle>
            <CardDescription>
              Restrict invites to these email domains (e.g. company.com). Leave empty to allow any domain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="max-w-sm"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDomain())}
              />
              <Button variant="outline" onClick={addDomain}>
                Add
              </Button>
            </div>
            {allowedEmailDomains.length > 0 && (
              <ul className="space-y-1">
                {allowedEmailDomains.map((d) => (
                  <li key={d} className="flex items-center gap-2">
                    <span className="text-sm">{d}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDomain(d)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button onClick={handleSaveDomains} disabled={saving}>
              {saving ? 'Saving...' : 'Save domains'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
