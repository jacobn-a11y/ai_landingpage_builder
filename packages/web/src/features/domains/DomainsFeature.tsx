import { useState, useEffect } from 'react';
import { api, type Domain } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Plus, Settings, Copy, Check, AlertCircle } from 'lucide-react';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={handleCopy}
      title={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'secondary',
  PendingDNS: 'outline',
  Verifying: 'outline',
  Active: 'default',
  Error: 'destructive',
};

export function DomainsFeature() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [hostname, setHostname] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [detailDomain, setDetailDomain] = useState<Domain | null>(null);
  const [embedPolicy, setEmbedPolicy] = useState<string>('');
  const [deleteDomain, setDeleteDomain] = useState<Domain | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const fetchDomains = async () => {
    try {
      const { domains: d } = await api.domains.list();
      setDomains(d);
    } catch {
      setDomains([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  useEffect(() => {
    if (detailDomain) {
      setEmbedPolicy(detailDomain.embedPolicy ?? '');
    }
  }, [detailDomain]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostname.trim()) return;
    setAddError(null);
    setAddLoading(true);
    try {
      const { domain } = await api.domains.create({ hostname: hostname.trim() });
      setHostname('');
      setAddOpen(false);
      await fetchDomains();
      setDetailDomain(domain);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdateEmbedPolicy = async () => {
    if (!detailDomain) return;
    setActionLoading(true);
    try {
      const { domain } = await api.domains.update(detailDomain.id, {
        embedPolicy: embedPolicy === 'allow' ? 'allow' : embedPolicy === 'deny' ? 'deny' : null,
      });
      setDetailDomain(domain);
      await fetchDomains();
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!detailDomain) return;
    setVerifyLoading(true);
    try {
      const { domain } = await api.domains.verify(detailDomain.id);
      setDetailDomain(domain);
      await fetchDomains();
    } catch {
      // Error already surfaced via domain.verificationError from 200 response
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleMarkRecordsAdded = async () => {
    if (!detailDomain) return;
    setActionLoading(true);
    try {
      const { domain } = await api.domains.update(detailDomain.id, { status: 'PendingDNS' });
      setDetailDomain(domain);
      await fetchDomains();
    } finally {
      setActionLoading(false);
    }
  };

  const getVerificationTxtName = (hostname: string) => `_replica-verify.${hostname}`;

  const handleDelete = async () => {
    if (!deleteDomain) return;
    setActionLoading(true);
    try {
      await api.domains.delete(deleteDomain.id);
      await fetchDomains();
      setDeleteDomain(null);
      setDetailDomain(null);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Domains</h1>
          <p className="mt-1 text-muted-foreground">
            Add and verify custom domains. Admin only.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add domain
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last checked</TableHead>
                <TableHead>Embed policy</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No domains yet. Add a domain to get started.
                  </TableCell>
                </TableRow>
              ) : (
                domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.hostname}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[domain.status] ?? 'secondary'}>
                        {domain.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {domain.verificationCheckedAt
                        ? new Date(domain.verificationCheckedAt).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {domain.embedPolicy ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetailDomain(domain)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add domain</DialogTitle>
            <DialogDescription>
              Enter the hostname (e.g. www.example.com). After creating, you will see the required DNS records.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDomain} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Hostname</label>
              <Input
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="www.example.com"
                required
              />
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading ? 'Adding...' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailDomain} onOpenChange={(open) => !open && setDetailDomain(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Domain details</DialogTitle>
            <DialogDescription>
              {detailDomain?.hostname}
            </DialogDescription>
          </DialogHeader>
          {detailDomain && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-medium">Status</span>
                  <div className="mt-1">
                    <Badge variant={STATUS_VARIANTS[detailDomain.status] ?? 'secondary'}>
                      {detailDomain.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">Last checked</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {detailDomain.verificationCheckedAt
                      ? new Date(detailDomain.verificationCheckedAt).toLocaleString()
                      : '—'}
                  </p>
                </div>
              </div>

              {(detailDomain.status === 'Error' || detailDomain.status === 'PendingDNS') && detailDomain.verificationError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Verification failed</p>
                      <p className="mt-1 text-destructive/90">{detailDomain.verificationError}</p>
                    </div>
                  </div>
                </div>
              )}

              {(detailDomain.status === 'Error' || detailDomain.status === 'PendingDNS') && (
                <div className="rounded-md border border-amber-500/50 bg-amber-500/5 p-3 text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    If using Cloudflare, set proxy to DNS-only (grey cloud) for CNAME verification.
                  </p>
                </div>
              )}

              {(detailDomain.verificationTxt || detailDomain.cnameTarget) && (
                <div className="space-y-3">
                  <span className="text-sm font-medium">Required DNS records</span>
                  <p className="text-xs text-muted-foreground">
                    You cannot have both a CNAME and an A record for the same hostname. Remove any existing A record before adding the CNAME.
                  </p>
                  {detailDomain.verificationTxt && (
                    <div className="rounded-md bg-muted p-3 text-sm">
                      <p className="font-medium text-muted-foreground mb-1">TXT (verification)</p>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p><span className="text-muted-foreground">Name:</span>{' '}
                            <code className="break-all text-foreground">{getVerificationTxtName(detailDomain.hostname)}</code>
                          </p>
                          <p><span className="text-muted-foreground">Value:</span>{' '}
                            <code className="break-all text-foreground">{detailDomain.verificationTxt}</code>
                          </p>
                        </div>
                        <CopyButton value={getVerificationTxtName(detailDomain.hostname)} label="TXT name" />
                        <CopyButton value={detailDomain.verificationTxt} label="TXT value" />
                      </div>
                    </div>
                  )}
                  {detailDomain.cnameTarget && (
                    <div className="rounded-md bg-muted p-3 text-sm">
                      <p className="font-medium text-muted-foreground mb-1">CNAME (traffic)</p>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p><span className="text-muted-foreground">Name:</span>{' '}
                            <code className="break-all text-foreground">{detailDomain.hostname}</code>
                          </p>
                          <p><span className="text-muted-foreground">Target:</span>{' '}
                            <code className="break-all text-foreground">{detailDomain.cnameTarget}</code>
                          </p>
                        </div>
                        <CopyButton value={detailDomain.hostname} label="CNAME name" />
                        <CopyButton value={detailDomain.cnameTarget} label="CNAME target" />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {(detailDomain.status === 'Draft' || detailDomain.status === 'Error') && (
                      <Button
                        variant="outline"
                        onClick={handleMarkRecordsAdded}
                        disabled={actionLoading}
                      >
                        I&apos;ve added the records
                      </Button>
                    )}
                    <Button
                      onClick={handleVerify}
                      disabled={verifyLoading}
                    >
                      {verifyLoading ? 'Verifying...' : detailDomain.status === 'Active' ? 'Re-verify' : 'Verify'}
                    </Button>
                  </div>
                </div>
              )}

              {detailDomain.status === 'Active' && (
                <p className="text-sm text-muted-foreground">
                  Domain is verified and ready for publishing.
                </p>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Embed policy</label>
                <Select value={embedPolicy || '__default__'} onValueChange={(v) => setEmbedPolicy(v === '__default__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Default</SelectItem>
                    <SelectItem value="allow">Allow iframe</SelectItem>
                    <SelectItem value="deny">Deny iframe</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={handleUpdateEmbedPolicy}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDetailDomain(null);
                  setDeleteDomain(detailDomain);
                }}
              >
                Delete domain
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteDomain}
        onOpenChange={(open) => !open && setDeleteDomain(null)}
        title="Delete domain"
        description={
          deleteDomain
            ? `Are you sure you want to delete "${deleteDomain.hostname}"?`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={actionLoading}
      />
    </div>
  );
}
