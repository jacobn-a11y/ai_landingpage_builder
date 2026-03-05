import { useEffect, useState } from 'react';
import { api, type Submission, type Page } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';

const CANONICAL_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'company', 'title'];

function getPayloadValue(payload: Record<string, unknown>, key: string): string {
  const v = payload[key];
  return typeof v === 'string' ? v : v != null ? String(v) : '';
}

export function SubmissionsFeature() {
  const { showError } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [pageId, setPageId] = useState<string>('');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.pages
      .list()
      .then(({ pages: p }) => setPages(p))
      .catch((e) => {
        setPages([]);
        showError(e instanceof Error ? e.message : 'Failed to load pages');
      });
  }, [showError]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.submissions
      .list(pageId || undefined)
      .then(({ submissions: s }) => setSubmissions(s))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [pageId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage form submissions from your published pages.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Submissions</CardTitle>
          <Select value={pageId || '__all__'} onValueChange={(v) => setPageId(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All pages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All pages</SelectItem>
              {pages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : submissions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => {
                  const payload = (s.payloadJson || {}) as Record<string, unknown>;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.page?.name ?? '-'}</TableCell>
                      <TableCell>{getPayloadValue(payload, 'email')}</TableCell>
                      <TableCell>
                        {[getPayloadValue(payload, 'first_name'), getPayloadValue(payload, 'last_name')]
                          .filter(Boolean)
                          .join(' ') || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.deliveryStatus === 'delivered'
                              ? 'default'
                              : s.deliveryStatus === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {s.deliveryStatus ?? 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.createdAt
                          ? new Date(s.createdAt).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelected(selected?.id === s.id ? null : s)}
                        >
                          {selected?.id === s.id ? 'Hide' : 'View'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <SubmissionDetail
          submission={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function SubmissionDetail({
  submission,
  onClose,
}: {
  submission: Submission;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Submission | null>(null);
  useEffect(() => {
    api.submissions.get(submission.id).then(({ submission: s }) => setDetail(s));
  }, [submission.id]);

  if (!detail) return null;
  const payload = (detail.payloadJson || {}) as Record<string, unknown>;
  const custom = (payload.custom_fields as Record<string, string>) || {};
  const consent = (payload.consent_fields as Record<string, boolean>) || {};

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Submission details</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          {CANONICAL_FIELDS.map((k) => {
            const v = getPayloadValue(payload, k);
            if (!v) return null;
            return (
              <div key={k} className="flex gap-2">
                <span className="font-medium capitalize">{k.replace('_', ' ')}:</span>
                <span>{v}</span>
              </div>
            );
          })}
          {Object.keys(custom).length > 0 && (
            <>
              <div className="mt-2 font-medium">Custom fields</div>
              {Object.entries(custom).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-medium">{k}:</span>
                  <span>{v}</span>
                </div>
              ))}
            </>
          )}
          {Object.keys(consent).length > 0 && (
            <>
              <div className="mt-2 font-medium">Consent</div>
              {Object.entries(consent).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-medium">{k}:</span>
                  <span>{v ? 'Yes' : 'No'}</span>
                </div>
              ))}
            </>
          )}
          <div className="mt-2 flex gap-2">
            <span className="font-medium">Delivery:</span>
            <Badge
              variant={
                detail.deliveryStatus === 'delivered'
                  ? 'default'
                  : detail.deliveryStatus === 'failed'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {detail.deliveryStatus ?? 'pending'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
