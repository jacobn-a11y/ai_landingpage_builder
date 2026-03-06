import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Page } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, EyeOff, Undo2, Redo2, RotateCcw, Send, LayoutGrid, Layout, Monitor, Tablet, Smartphone, ExternalLink } from 'lucide-react';
import { PublishDialog } from './PublishDialog';
import { EditorProvider } from './editor/EditorContext';
import { EditorCanvas } from './editor/EditorCanvas';
import { BlockToolbar } from './editor/BlockToolbar';
import { LayersPanel } from './editor/LayersPanel';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { useEditor } from './editor/EditorContext';

function EditorLayout({ onBack, onPublishChange }: { onBack: () => void; onPublishChange?: () => void }) {
  const [publishOpen, setPublishOpen] = useState(false);
  const {
    page,
    previewMode,
    setPreviewMode,
    breakpoint,
    setBreakpoint,
    layoutMode,
    setLayoutMode,
    undo,
    redo,
    canUndo,
    canRedo,
    rollbackToPublished,
    canRollback,
    dirty,
    saving,
    lastSaved,
  } = useEditor();

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] -m-6">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to pages">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold truncate max-w-[200px]">
            {page?.name ?? 'Page'}
          </h1>
          {dirty && (
            <span className="text-xs text-muted-foreground">Unsaved</span>
          )}
          {saving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          {lastSaved && !dirty && (
            <span className="text-xs text-muted-foreground">
              Saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          {canRollback && (
            <Button
              variant="ghost"
              size="icon"
              onClick={rollbackToPublished}
              title="Rollback to published"
              aria-label="Rollback to published"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {!previewMode && (
            <div className="flex rounded-md border" title="Device preview">
              <Button variant={breakpoint === 'desktop' ? 'secondary' : 'ghost'} size="sm" className="rounded-r-none" onClick={() => setBreakpoint('desktop')}>
                <Monitor className="h-4 w-4" />
              </Button>
              <Button variant={breakpoint === 'tablet' ? 'secondary' : 'ghost'} size="sm" className="rounded-none" onClick={() => setBreakpoint('tablet')}>
                <Tablet className="h-4 w-4" />
              </Button>
              <Button variant={breakpoint === 'mobile' ? 'secondary' : 'ghost'} size="sm" className="rounded-l-none" onClick={() => setBreakpoint('mobile')}>
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          )}
          {!previewMode && (
            <div className="flex rounded-md border">
              <Button
                variant={layoutMode === 'fluid' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setLayoutMode('fluid')}
                title="Fluid grid"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Grid
              </Button>
              <Button
                variant={layoutMode === 'canvas' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setLayoutMode('canvas')}
                title="Freeform canvas"
              >
                <Layout className="h-4 w-4 mr-1" />
                Canvas
              </Button>
            </div>
          )}
          {page && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/v1/serve/preview/${page.id}`, '_blank', 'noopener')}
              title="Preview draft in new tab"
              aria-label="Preview draft in new tab"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Preview
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setPublishOpen(true)}>
            <Send className="h-4 w-4 mr-1" />
            Publish
          </Button>
          {page && (
            <PublishDialog
              open={publishOpen}
              onOpenChange={setPublishOpen}
              page={page}
              onPublished={onPublishChange}
            />
          )}
          <Button
            variant={previewMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main editor area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <BlockToolbar />
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-auto">
            <EditorCanvas />
          </div>
          <LayersPanel />
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}

export function PageEditFeature() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.pages
      .get(id)
      .then(({ page: p }) => {
        setPage(p);
        setError(null);
      })
      .catch(() => {
        setPage(null);
        setError('Page not found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground">
          {error ?? 'The page could not be loaded.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/pages')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to pages
        </Button>
      </div>
    );
  }

  const handlePublishChange = async () => {
    if (!id) return;
    const { page: updated } = await api.pages.get(id);
    setPage(updated);
    setRefreshKey((k) => k + 1);
  };

  return (
    <EditorProvider page={page} key={refreshKey}>
      <EditorLayout
        onBack={() => navigate('/pages')}
        onPublishChange={handlePublishChange}
      />
    </EditorProvider>
  );
}
