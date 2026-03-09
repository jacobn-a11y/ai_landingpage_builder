import type { Domain } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { CopyButton } from './CopyButton';

function getVerificationTxtName(hostname: string) {
  return `_replica-verify.${hostname}`;
}

interface DomainDnsRecordsProps {
  domain: Domain;
  verifyLoading: boolean;
  actionLoading: boolean;
  onVerify: () => void;
  onMarkRecordsAdded: () => void;
}

export function DomainDnsRecords({
  domain,
  verifyLoading,
  actionLoading,
  onVerify,
  onMarkRecordsAdded,
}: DomainDnsRecordsProps) {
  const showError =
    (domain.status === 'Error' || domain.status === 'PendingDNS') &&
    domain.verificationError;

  const showTip =
    domain.status === 'Error' || domain.status === 'PendingDNS';

  return (
    <div className="space-y-3">
      {showError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Verification failed</p>
              <p className="mt-1 text-destructive/90">{domain.verificationError}</p>
            </div>
          </div>
        </div>
      )}

      {showTip && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/5 p-3 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">
            If using Cloudflare, set proxy to DNS-only (grey cloud) for CNAME verification.
          </p>
        </div>
      )}

      {(domain.verificationTxt || domain.cnameTarget) && (
        <div className="space-y-3">
          <span className="text-sm font-medium">Required DNS records</span>
          <p className="text-xs text-muted-foreground">
            You cannot have both a CNAME and an A record for the same hostname. Remove any existing A record before adding the CNAME.
          </p>

          {domain.verificationTxt && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium text-muted-foreground mb-1">TXT (verification)</p>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <code className="break-all text-foreground">
                      {getVerificationTxtName(domain.hostname)}
                    </code>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Value:</span>{' '}
                    <code className="break-all text-foreground">{domain.verificationTxt}</code>
                  </p>
                </div>
                <CopyButton value={getVerificationTxtName(domain.hostname)} label="TXT name" />
                <CopyButton value={domain.verificationTxt} label="TXT value" />
              </div>
            </div>
          )}

          {domain.cnameTarget && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium text-muted-foreground mb-1">CNAME (traffic)</p>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <code className="break-all text-foreground">{domain.hostname}</code>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Target:</span>{' '}
                    <code className="break-all text-foreground">{domain.cnameTarget}</code>
                  </p>
                </div>
                <CopyButton value={domain.hostname} label="CNAME name" />
                <CopyButton value={domain.cnameTarget} label="CNAME target" />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {(domain.status === 'Draft' || domain.status === 'Error') && (
              <Button variant="outline" onClick={onMarkRecordsAdded} disabled={actionLoading}>
                I&apos;ve added the records
              </Button>
            )}
            <Button onClick={onVerify} disabled={verifyLoading}>
              {verifyLoading ? 'Verifying...' : domain.status === 'Active' ? 'Re-verify' : 'Verify'}
            </Button>
          </div>
        </div>
      )}

      {domain.status === 'Active' && (
        <p className="text-sm text-muted-foreground">
          Domain is verified and ready for publishing.
        </p>
      )}
    </div>
  );
}
