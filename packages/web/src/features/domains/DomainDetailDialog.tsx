import { useState } from 'react';
import { api, type Domain } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DomainDnsRecords } from './DomainDnsRecords';
import { DomainSettings } from './DomainSettings';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'secondary',
  PendingDNS: 'outline',
  Verifying: 'outline',
  Active: 'default',
  Error: 'destructive',
};

interface DomainDetailDialogProps {
  domain: Domain | null;
  onClose: () => void;
  onUpdated: (domain: Domain) => void;
  onDelete: (domain: Domain) => void;
}

export function DomainDetailDialog({
  domain,
  onClose,
  onUpdated,
  onDelete,
}: DomainDetailDialogProps) {
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleVerify = async () => {
    if (!domain) return;
    setVerifyLoading(true);
    try {
      const { domain: updated } = await api.domains.verify(domain.id);
      onUpdated(updated);
    } catch {
      // Error surfaced via domain.verificationError
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleMarkRecordsAdded = async () => {
    if (!domain) return;
    setActionLoading(true);
    try {
      const { domain: updated } = await api.domains.update(domain.id, { status: 'PendingDNS' });
      onUpdated(updated);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog open={!!domain} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Domain details</DialogTitle>
          <DialogDescription>{domain?.hostname}</DialogDescription>
        </DialogHeader>
        {domain && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-sm font-medium">Status</span>
                <div className="mt-1">
                  <Badge variant={STATUS_VARIANTS[domain.status] ?? 'secondary'}>
                    {domain.status}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">Last checked</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {domain.verificationCheckedAt
                    ? new Date(domain.verificationCheckedAt).toLocaleString()
                    : '\u2014'}
                </p>
              </div>
              {domain.sslStatus && (
                <div className="text-right">
                  <span className="text-sm font-medium">SSL</span>
                  <p className="text-sm text-muted-foreground mt-1">{domain.sslStatus}</p>
                </div>
              )}
            </div>

            <DomainDnsRecords
              domain={domain}
              verifyLoading={verifyLoading}
              actionLoading={actionLoading}
              onVerify={handleVerify}
              onMarkRecordsAdded={handleMarkRecordsAdded}
            />

            <hr className="border-border" />

            <DomainSettings domain={domain} onUpdated={onUpdated} />

            <hr className="border-border" />

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onClose();
                onDelete(domain);
              }}
            >
              Delete domain
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
