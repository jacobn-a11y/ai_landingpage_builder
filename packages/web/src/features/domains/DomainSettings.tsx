import { useState, useEffect } from 'react';
import { api, type Domain, type SecurityHeaders, type Page } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DomainSettingsProps {
  domain: Domain;
  onUpdated: (domain: Domain) => void;
}

export function DomainSettings({ domain, onUpdated }: DomainSettingsProps) {
  const [embedPolicy, setEmbedPolicy] = useState(domain.embedPolicy ?? '');
  const [custom404PageId, setCustom404PageId] = useState(domain.custom404PageId ?? '');
  const [hstsEnabled, setHstsEnabled] = useState(
    (domain.securityHeaders as SecurityHeaders | null)?.hstsEnabled ?? false,
  );
  const [xFrameOptions, setXFrameOptions] = useState<string>(
    (domain.securityHeaders as SecurityHeaders | null)?.xFrameOptions ?? '',
  );
  const [pages, setPages] = useState<Page[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.pages.list().then(({ pages: p }) => setPages(p)).catch(() => {});
  }, []);

  useEffect(() => {
    setEmbedPolicy(domain.embedPolicy ?? '');
    setCustom404PageId(domain.custom404PageId ?? '');
    const sh = domain.securityHeaders as SecurityHeaders | null;
    setHstsEnabled(sh?.hstsEnabled ?? false);
    setXFrameOptions(sh?.xFrameOptions ?? '');
  }, [domain]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const securityHeaders: SecurityHeaders = {
        hstsEnabled,
        xFrameOptions: xFrameOptions === 'DENY' || xFrameOptions === 'SAMEORIGIN'
          ? xFrameOptions
          : null,
      };
      const { domain: updated } = await api.domains.updateSettings(domain.id, {
        embedPolicy: embedPolicy === 'allow' ? 'allow' : embedPolicy === 'deny' ? 'deny' : null,
        custom404PageId: custom404PageId || null,
        securityHeaders,
      });
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Settings</h4>

      <div className="space-y-2">
        <Label>Custom 404 page</Label>
        <Select
          value={custom404PageId || '__none__'}
          onValueChange={(v) => setCustom404PageId(v === '__none__' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Default 404" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Default 404</SelectItem>
            {pages.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.slug})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Embed policy</Label>
        <Select
          value={embedPolicy || '__default__'}
          onValueChange={(v) => setEmbedPolicy(v === '__default__' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">Default</SelectItem>
            <SelectItem value="allow">Allow iframe</SelectItem>
            <SelectItem value="deny">Deny iframe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Security headers</Label>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">HSTS (Strict-Transport-Security)</span>
          <Switch checked={hstsEnabled} onCheckedChange={setHstsEnabled} />
        </div>
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">X-Frame-Options</span>
          <Select
            value={xFrameOptions || '__none__'}
            onValueChange={(v) => setXFrameOptions(v === '__none__' ? '' : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              <SelectItem value="DENY">DENY</SelectItem>
              <SelectItem value="SAMEORIGIN">SAMEORIGIN</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save settings'}
      </Button>
    </div>
  );
}
