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
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Plus, Settings } from 'lucide-react';
import { DomainDetailDialog } from './DomainDetailDialog';

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
  const [deleteDomain, setDeleteDomain] = useState<Domain | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const handleDomainUpdated = (domain: Domain) => {
    setDetailDomain(domain);
    setDomains((prev) => prev.map((d) => (d.id === domain.id ? domain : d)));
  };

  const handleDelete = async () => {
    if (!deleteDomain) return;
    setDeleteLoading(true);
    try {
      await api.domains.delete(deleteDomain.id);
      setDomains((prev) => prev.filter((d) => d.id !== deleteDomain.id));
      setDeleteDomain(null);
      setDetailDomain(null);
    } finally {
      setDeleteLoading(false);
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
                        : '\u2014'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {domain.embedPolicy ?? '\u2014'}
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

      {/* Add domain dialog */}
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

      {/* Domain detail dialog */}
      <DomainDetailDialog
        domain={detailDomain}
        onClose={() => setDetailDomain(null)}
        onUpdated={handleDomainUpdated}
        onDelete={setDeleteDomain}
      />

      {/* Delete confirmation dialog */}
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
        loading={deleteLoading}
      />
    </div>
  );
}
