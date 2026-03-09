import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Page } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  RotateCcw,
  Send,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { PublishDialog } from './PublishDialog';
import { EditorProvider } from './editor/EditorContext';
import { EditorCanvas } from './editor/EditorCanvas';
import { BlockToolbar } from './editor/BlockToolbar';
import { LayersPanel } from './editor/LayersPanel';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { useEditor } from './editor/EditorContext';

function SaveIndicator() {
  const { dirty, saving, lastSaved } = useEditor();
  if (saving) return <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>;
  if (dirty) return <span className="text-xs text-amber-500">Unsaved changes</span>;
  if (lastSaved) return <span className="text-xs text-muted-foreground">Saved</span>;
  return null;
}

function EditorToolbar({ onBack, onPublishChange }: { onBack: () => void; onPublishChange?: () => void }) {
  const [publishOpen, setPublishOpen] = useState(false);
  const {
    page,
    previewMode,
    setPreviewMode,
    breakpoint,
    setBreakpoint,
    undo,
    redo,
    canUndo,
    canRedo,
    rollbackToPublished,
    canRollback,
  } = useEditor();

  return (
    <header className="flex items-center justify-between gap-4 px-3 py-1.5 border-b bg-background shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} aria-label="Back to pages">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold truncate max-w-[180px]">
          {page?.name ?? 'Page'}
        </h1>
        <SaveIndicator />
      </div>

      <div className="flex items-center gap-1">
        {/* Undo / Redo */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </Button>
        {canRollback && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={rollbackToPublished} title="Rollback to last published version">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}

        <div className="w-px h-5 bg-border mx-1" />

        {/* Breakpoint switcher */}
        <div className="flex rounded-md border" title="Device preview">
          <Button variant={breakpoint === 'desktop' ? 'secondary' : 'ghost'} size="sm" className="rounded-r-none h-7 px-2" onClick={() => setBreakpoint('desktop')}>
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button variant={breakpoint === 'tablet' ? 'secondary' : 'ghost'} size="sm" className="rounded-none h-7 px-2" onClick={() => setBreakpoint('tablet')}>
            <Tablet className="h-3.5 w-3.5" />
          </Button>
          <Button variant={breakpoint === 'mobile' ? 'secondary' : 'ghost'} size="sm" className="rounded-l-none h-7 px-2" onClick={() => setBreakpoint('mobile')}>
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Preview / External preview */}
        <Button
          variant={previewMode ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7"
          onClick={() => setPreviewMode(!previewMode)}
        >
          {previewMode ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
          {previewMode ? 'Edit' : 'Preview'}
        </Button>
        {page && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => window.open(`/api/v1/serve/preview/${page.id}`, '_blank', 'noopener')}
            title="Open preview in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}

        <div className="w-px h-5 bg-border mx-1" />

        {/* Publish */}
        <Button size="sm" className="h-7" onClick={() => setPublishOpen(true)}>
          <Send className="h-3.5 w-3.5 mr-1" />
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
      </div>
    </header>
  );
}

function EditorLayout({ onBack, onPublishChange }: { onBack: () => void; onPublishChange?: () => void }) {
  const { previewMode } = useEditor();

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] -m-6">
      <EditorToolbar onBack={onBack} onPublishChange={onPublishChange} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar: block toolbar (hidden in preview) */}
        {!previewMode && <BlockToolbar />}

        {/* Center: canvas */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <EditorCanvas />
          </div>

          {/* Right sidebar: layers + properties (hidden in preview) */}
          {!previewMode && <LayersPanel />}
          {!previewMode && <PropertiesPanel />}
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
        document.title = `${p.name} — Editor`;
      })
      .catch(() => {
        setPage(null);
        setError('Page not found');
      })
      .finally(() => setLoading(false));
    return () => { document.title = 'Replica Pages'; };
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
