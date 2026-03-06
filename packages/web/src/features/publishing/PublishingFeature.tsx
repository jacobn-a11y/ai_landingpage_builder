import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Page } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/contexts/ToastContext';

type PublishConfig = {
  targetType?: 'demo' | 'custom';
  status?: 'draft' | 'published' | 'scheduled';
  publishedAt?: string;
  domainId?: string;
};

function getPublishInfo(page: Page): { status: string; variant: 'default' | 'secondary' | 'destructive'; date: string | null } {
  const config = (page.publishConfig ?? {}) as PublishConfig;
  if (config.status === 'published') {
    return {
      status: 'Published',
      variant: 'default',
      date: config.publishedAt ?? page.createdAt,
    };
  }
  if (config.status === 'scheduled') {
    return { status: 'Scheduled', variant: 'secondary', date: null };
  }
  return { status: 'Unpublished', variant: 'secondary', date: null };
}

export function PublishingFeature() {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.pages
      .list()
      .then(({ pages: p }) => setPages(p))
      .catch((e) => showError(e instanceof Error ? e.message : 'Failed to load pages'))
      .finally(() => setLoading(false));
  }, [showError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const published = pages.filter((p) => {
    const config = (p.publishConfig ?? {}) as PublishConfig;
    return config.status === 'published';
  });
  const other = pages.filter((p) => {
    const config = (p.publishConfig ?? {}) as PublishConfig;
    return config.status !== 'published';
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Publishing</h1>
        <p className="mt-2 text-muted-foreground">
          Overview of your published and unpublished pages.
        </p>
      </div>

      {published.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-3">Published pages</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {published.map((page) => {
              const info = getPublishInfo(page);
              return (
                <Card
                  key={page.id}
                  className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-shadow"
                  onClick={() => navigate(`/pages/${page.id}/edit`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{page.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <Badge variant={info.variant}>{info.status}</Badge>
                    {info.date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(info.date).toLocaleDateString()}
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-3">Unpublished pages</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {other.map((page) => {
              const info = getPublishInfo(page);
              return (
                <Card
                  key={page.id}
                  className="cursor-pointer opacity-70 hover:opacity-100 hover:ring-1 hover:ring-primary/30 transition-all"
                  onClick={() => navigate(`/pages/${page.id}/edit`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{page.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={info.variant}>{info.status}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {pages.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          No pages yet. Create pages from the Pages section first.
        </p>
      )}
    </div>
  );
}
