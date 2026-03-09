import { useState, useEffect } from 'react';
import { api, type Page, type Domain, type PublishStatus, type PublishTargetType } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Loader2, Calendar, Globe } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { PublishScheduleSection } from './PublishScheduleSection';
import { PublishUrlDisplay } from './PublishUrlDisplay';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: Page;
  onPublished?: () => void;
}

export function PublishDialog({ open, onOpenChange, page, onPublished }: PublishDialogProps) {
  const { showError, showSuccess } = useToast();
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishTarget, setPublishTarget] = useState<PublishTargetType>('demo');
  const [domainId, setDomainId] = useState<string>('');
  const [path, setPath] = useState(page.slug);
  const [webflowSubdomain, setWebflowSubdomain] = useState('');
  const [schedulePublishAt, setSchedulePublishAt] = useState('');
  const [scheduleUnpublishAt, setScheduleUnpublishAt] = useState('');
  const pathClean = (path.startsWith('/') ? path.slice(1) : path) || page.slug;

  const getDestinationUrl = (): string | null => {
    if (publishTarget === 'demo') {
      return `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/serve/demo/${page.workspaceId}/${pathClean}`;
    }
    if (publishTarget === 'custom' && domainId) {
      const hostname = domains.find((d) => d.id === domainId)?.hostname ?? '';
      return `https://${hostname}/${pathClean}`;
    }
    if (publishTarget === 'webflow_subdomain' && webflowSubdomain) {
      return `https://${webflowSubdomain}.webflow.io/${pathClean}`;
    }
    return null;
  };

  const destinationUrl = getDestinationUrl();

  useEffect(() => {
    if (!open || !page.id) return;
    setPath(page.slug);
    api.pages
      .getPublishStatus(page.id)
      .then(({ publishStatus }) => {
        setStatus(publishStatus);
        const cfg = publishStatus?.publishConfig;
        if (cfg?.targetType) setPublishTarget(cfg.targetType);
        if (cfg?.webflowSubdomain) setWebflowSubdomain(cfg.webflowSubdomain);
        if (cfg?.publishAt) {
          try {
            setSchedulePublishAt(new Date(cfg.publishAt).toISOString().slice(0, 16));
          } catch {
            setSchedulePublishAt('');
          }
        } else setSchedulePublishAt('');
        if (cfg?.unpublishAt) {
          try {
            setScheduleUnpublishAt(new Date(cfg.unpublishAt).toISOString().slice(0, 16));
          } catch {
            setScheduleUnpublishAt('');
          }
        } else setScheduleUnpublishAt('');
      })
      .catch((e) => {
        setStatus(null);
        showError(e instanceof Error ? e.message : 'Failed to load publish status');
      });
    api.domains
      .list()
      .then(({ domains: d }) => setDomains(d.filter((x) => x.status === 'Active')))
      .catch((e) => {
        setDomains([]);
        showError(e instanceof Error ? e.message : 'Failed to load domains');
      });
  }, [open, page.id, page.slug]);

  const handlePublish = async () => {
    setLoading(true);
    try {
      const data: Parameters<typeof api.pages.publish>[1] = {
        targetType: publishTarget,
        path: path.startsWith('/') ? path : `/${path}`,
      };
      if (publishTarget === 'custom') {
        if (!domainId) return;
        data.domainId = domainId;
      }
      if (publishTarget === 'webflow_subdomain') {
        if (!webflowSubdomain) return;
        data.webflowSubdomain = webflowSubdomain;
      }
      await api.pages.publish(page.id, data);
      const { publishStatus } = await api.pages.getPublishStatus(page.id);
      setStatus(publishStatus);
      showSuccess('Page published successfully');
      onPublished?.();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to publish');
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
      showSuccess('Page unpublished');
      onPublished?.();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to unpublish');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleUpdate = async () => {
    setLoading(true);
    try {
      await api.pages.schedule(page.id, {
        publishAt: schedulePublishAt || undefined,
        unpublishAt: scheduleUnpublishAt || undefined,
        targetType: publishTarget,
        domainId: publishTarget === 'custom' ? domainId : undefined,
        path: path.startsWith('/') ? path : `/${path}`,
        webflowSubdomain: publishTarget === 'webflow_subdomain' ? webflowSubdomain : undefined,
      });
      const { publishStatus } = await api.pages.getPublishStatus(page.id);
      setStatus(publishStatus);
      showSuccess('Schedule updated');
      onPublished?.();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to update schedule');
    } finally {
      setLoading(false);
    }
  };

  const isPublished = status?.status === 'published';
  const isScheduled = status?.status === 'scheduled';
  const publishDisabled = loading || (publishTarget === 'custom' && !domainId) || (publishTarget === 'webflow_subdomain' && !webflowSubdomain);

  const targetLabel = publishTarget === 'demo' ? 'demo' : publishTarget === 'webflow_subdomain' ? 'Webflow' : 'domain';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish</DialogTitle>
          <DialogDescription>
            Publish this page to a demo domain, custom domain, or Webflow subdomain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current status */}
          {status && (
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">Status</p>
              <p className="text-sm text-muted-foreground">{status.targetLabel}</p>
              {isScheduled && status.publishConfig?.publishAt && (
                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Publishes {new Date(status.publishConfig.publishAt).toLocaleString()}
                </p>
              )}
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

          {/* Target selector */}
          <div className="space-y-2">
            <Label>Publish target</Label>
            <Select value={publishTarget} onValueChange={(v) => setPublishTarget(v as PublishTargetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">Demo domain</SelectItem>
                <SelectItem value="custom">Custom domain</SelectItem>
                <SelectItem value="webflow_subdomain">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Webflow subdomain
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom domain selector */}
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

          {/* Webflow subdomain input */}
          {publishTarget === 'webflow_subdomain' && (
            <div className="space-y-2">
              <Label>Webflow subdomain</Label>
              <div className="flex items-center gap-1">
                <Input
                  value={webflowSubdomain}
                  onChange={(e) => setWebflowSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="mysite"
                  className="max-w-[200px]"
                />
                <span className="text-sm text-muted-foreground">.webflow.io</span>
              </div>
            </div>
          )}

          {/* Path */}
          <div className="space-y-2">
            <Label>Path</Label>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={page.slug}
            />
          </div>

          {/* Destination URL with copy */}
          {destinationUrl && <PublishUrlDisplay url={destinationUrl} />}

          {/* Schedule */}
          <PublishScheduleSection
            schedulePublishAt={schedulePublishAt}
            scheduleUnpublishAt={scheduleUnpublishAt}
            onPublishAtChange={setSchedulePublishAt}
            onUnpublishAtChange={setScheduleUnpublishAt}
          />
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
            <Button onClick={handlePublish} disabled={publishDisabled}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish to {targetLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
