import { useState, useEffect } from 'react';
import { api, type Page, type Domain, type PublishStatus } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Loader2, Copy, Check } from 'lucide-react';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: Page;
  onPublished?: () => void;
}

export function PublishDialog({ open, onOpenChange, page, onPublished }: PublishDialogProps) {
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishTarget, setPublishTarget] = useState<'demo' | 'custom'>('demo');
  const [domainId, setDomainId] = useState<string>('');
  const [path, setPath] = useState(page.slug);
  const [schedulePublishAt, setSchedulePublishAt] = useState('');
  const [scheduleUnpublishAt, setScheduleUnpublishAt] = useState('');
  const [copied, setCopied] = useState(false);

  const pathClean = (path.startsWith('/') ? path.slice(1) : path) || page.slug;
  const destinationUrl =
    publishTarget === 'demo'
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/serve/demo/${page.workspaceId}/${pathClean}`
      : domainId
        ? `https://${domains.find((d) => d.id === domainId)?.hostname ?? ''}/${pathClean}`
        : null;

  const copyUrl = () => {
    if (!destinationUrl) return;
    navigator.clipboard.writeText(destinationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!open || !page.id) return;
    setPath(page.slug);
    api.pages
      .getPublishStatus(page.id)
      .then(({ publishStatus }) => {
        setStatus(publishStatus);
        const cfg = publishStatus?.publishConfig;
        if (cfg?.publishAt) {
          try {
            const d = new Date(cfg.publishAt);
            setSchedulePublishAt(d.toISOString().slice(0, 16));
          } catch {
            setSchedulePublishAt('');
          }
        } else setSchedulePublishAt('');
        if (cfg?.unpublishAt) {
          try {
            const d = new Date(cfg.unpublishAt);
            setScheduleUnpublishAt(d.toISOString().slice(0, 16));
          } catch {
            setScheduleUnpublishAt('');
          }
        } else setScheduleUnpublishAt('');
      })
      .catch(() => setStatus(null));
    api.domains
      .list()
      .then(({ domains: d }) => setDomains(d.filter((x) => x.status === 'Active')))
      .catch(() => setDomains([]));
  }, [open, page.id, page.slug]);

  const handlePublish = async () => {
    setLoading(true);
    try {
      const data: { targetType: 'demo' | 'custom'; domainId?: string; path?: string } = {
        targetType: publishTarget,
      };
      if (publishTarget === 'custom') {
        if (!domainId) return;
        data.domainId = domainId;
        data.path = path.startsWith('/') ? path : `/${path}`;
      } else {
        data.path = path.startsWith('/') ? path : `/${path}`;
      }
      await api.pages.publish(page.id, data);
      const { publishStatus } = await api.pages.getPublishStatus(page.id);
      setStatus(publishStatus);
      onPublished?.();
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublish = async () => {
    setLoading(true);
    try {
      await api.pages.unpublish(page.id);
      const { publishStatus } = await api.pages.getPublishStatus(page.id);
      setStatus(publishStatus);
      onPublished?.();
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleUpdate = async () => {
    setLoading(true);
    try {
      await api.pages.updatePublishSchedule(page.id, {
        publishAt: schedulePublishAt || null,
        unpublishAt: scheduleUnpublishAt || null,
      });
      const { publishStatus } = await api.pages.getPublishStatus(page.id);
      setStatus(publishStatus);
      onPublished?.();
    } finally {
      setLoading(false);
    }
  };

  const isPublished = status?.status === 'published';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish</DialogTitle>
          <DialogDescription>
            Publish this page to a demo domain or a verified custom domain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status && (
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">Status</p>
              <p className="text-sm text-muted-foreground">{status.targetLabel}</p>
              {status.url && (
                <a
                  href={status.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View page <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Publish target</Label>
            <Select value={publishTarget} onValueChange={(v) => setPublishTarget(v as 'demo' | 'custom')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">Demo domain</SelectItem>
                <SelectItem value="custom">Custom domain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {publishTarget === 'custom' && (
            <div className="space-y-2">
              <Label>Domain</Label>
              <Select value={domainId} onValueChange={setDomainId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.hostname}
                    </SelectItem>
                  ))}
                  {domains.length === 0 && (
                    <SelectItem value="__none__" disabled>
                      No verified domains
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Path</Label>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={page.slug}
            />
          </div>

          {destinationUrl && (
            <div className="space-y-2">
              <Label>Destination URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={destinationUrl}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyUrl}
                  title="Copy URL"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Append UTM params for tracking, e.g. ?utm_source=newsletter&utm_campaign=launch.
                Page name &quot;{page.name}&quot; is sent with form submissions.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Schedule (optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Publish at</Label>
                <Input
                  type="datetime-local"
                  value={schedulePublishAt}
                  onChange={(e) => setSchedulePublishAt(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Unpublish at</Label>
                <Input
                  type="datetime-local"
                  value={scheduleUnpublishAt}
                  onChange={(e) => setScheduleUnpublishAt(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          {(schedulePublishAt || scheduleUnpublishAt) && (
            <Button variant="outline" onClick={handleScheduleUpdate} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update schedule
            </Button>
          )}
          {isPublished ? (
            <Button variant="destructive" onClick={handleUnpublish} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unpublish
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={loading || (publishTarget === 'custom' && !domainId)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish to {publishTarget === 'demo' ? 'demo' : 'domain'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
