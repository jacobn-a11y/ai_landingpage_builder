import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Page, type FolderNode } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FolderTree } from './FolderTree';
import { CreatePageDialog } from './CreatePageDialog';
import { CreateFolderDialog } from './CreateFolderDialog';
import { FormMappingModal } from './FormMappingModal';
import { ImportPageDialog } from './ImportPageDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil, Copy, Trash2, FormInput, FileUp } from 'lucide-react';

function findFolderById(nodes: FolderNode[], id: string): FolderNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findFolderById(node.children, id);
    if (found) return found;
  }
  return null;
}

export function PagesFeature() {
  const navigate = useNavigate();
  const { showError } = useToast();
  const { canEdit } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pages, setPages] = useState<Page[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [createPageOpen, setCreatePageOpen] = useState(false);
  const [importPageOpen, setImportPageOpen] = useState(false);
  const [replaceContentPage, setReplaceContentPage] = useState<Page | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderParent, setCreateFolderParent] = useState<{ id: string; name: string } | null>(null);
  const [deletePage, setDeletePage] = useState<Page | null>(null);
  const [clonePage, setClonePage] = useState<Page | null>(null);
  const [mapFormPage, setMapFormPage] = useState<Page | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPages = useCallback(async () => {
    try {
      const folderId = selectedFolderId === 'root' ? '' : selectedFolderId ?? undefined;
      const { pages: p } = await api.pages.list(folderId);
      setPages(p);
    } catch (e) {
      setPages([]);
      showError(e instanceof Error ? e.message : 'Failed to load pages');
    }
  }, [selectedFolderId, showError]);

  const fetchFolders = useCallback(async () => {
    try {
      const { folders: f } = await api.folders.list();
      setFolders(f);
    } catch (e) {
      setFolders([]);
      showError(e instanceof Error ? e.message : 'Failed to load folders');
    }
  }, [showError]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPages(), fetchFolders()]);
      setLoading(false);
    };
    load();
  }, [fetchPages, fetchFolders]);

  const mapFormId = searchParams.get('mapForm');
  useEffect(() => {
    if (!mapFormId) return;
    const page = pages.find((p) => p.id === mapFormId);
    if (page) {
      setMapFormPage(page);
      setSearchParams({}, { replace: true });
    } else {
      api.pages.get(mapFormId).then(({ page }) => {
        setMapFormPage(page);
        setSearchParams({}, { replace: true });
      }).catch(() => setSearchParams({}, { replace: true }));
    }
  }, [mapFormId, pages, setSearchParams]);

  const handleCreatePage = async (data: { name: string; slug: string; folderId?: string; contentJson?: object }) => {
    await api.pages.create(data);
    await fetchPages();
    await fetchFolders();
  };

  const handleImportPage = async (data: {
    name: string;
    slug: string;
    folderId?: string;
    contentJson: object;
    replacePageId?: string;
  }) => {
    if (data.replacePageId) {
      const { page } = await api.pages.update(data.replacePageId, {
        contentJson: data.contentJson,
      });
      await fetchPages();
      return { page };
    }
    const { page } = await api.pages.create({
      name: data.name,
      slug: data.slug,
      folderId: data.folderId,
      contentJson: data.contentJson,
    });
    await fetchPages();
    await fetchFolders();
    return { page };
  };

  const handleCreateFolder = async (data: { name: string; parentId?: string }) => {
    await api.folders.create(data);
    await fetchFolders();
  };

  const openCreateFolder = (parentId?: string) => {
    if (parentId) {
      const folder = findFolderById(folders, parentId);
      setCreateFolderParent(folder ? { id: folder.id, name: folder.name } : null);
    } else {
      setCreateFolderParent(null);
    }
    setCreateFolderOpen(true);
  };

  const handleDeletePage = async () => {
    if (!deletePage) return;
    setActionLoading(true);
    try {
      await api.pages.delete(deletePage.id);
      await fetchPages();
      setDeletePage(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClonePage = async () => {
    if (!clonePage) return;
    setActionLoading(true);
    try {
      const { page } = await api.pages.clone(clonePage.id);
      setClonePage(null);
      navigate(`/pages/${page.id}/edit`);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getPageStatus = (page: Page) =>
    page.lastPublishedContentJson && Object.keys(page.lastPublishedContentJson as object).length > 0
      ? 'published'
      : 'draft';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <aside className="w-56 shrink-0">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Folders</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={openCreateFolder}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
            />
          </CardContent>
        </Card>
      </aside>

      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Pages</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your landing pages. Create, edit, and organize in folders.
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportPageOpen(true)}>
                <FileUp className="h-4 w-4 mr-2" />
                Import HTML
              </Button>
              <Button onClick={() => setCreatePageOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create page
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last modified</TableHead>
                  {canEdit && <TableHead className="w-32" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No pages yet. Create your first page to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.name}</TableCell>
                      <TableCell className="text-muted-foreground">{page.slug}</TableCell>
                      <TableCell>
                        <Badge variant={getPageStatus(page) === 'published' ? 'default' : 'secondary'}>
                          {getPageStatus(page)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(page.createdAt).toLocaleDateString()}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/pages/${page.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Import HTML to replace content"
                              onClick={() => setReplaceContentPage(page)}
                            >
                              <FileUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Map form"
                              onClick={() => setMapFormPage(page)}
                            >
                              <FormInput className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setClonePage(page)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletePage(page)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <CreatePageDialog
        open={createPageOpen}
        onOpenChange={setCreatePageOpen}
        onSubmit={handleCreatePage}
        folders={folders}
        onImportClick={() => {
          setCreatePageOpen(false);
          setImportPageOpen(true);
        }}
      />

      <ImportPageDialog
        open={importPageOpen || !!replaceContentPage}
        onOpenChange={(open) => {
          if (!open) {
            setImportPageOpen(false);
            setReplaceContentPage(null);
          }
        }}
        onSubmit={handleImportPage}
        onImported={(page, hasForms) => {
          if (hasForms) setMapFormPage(page as Page);
          else navigate(`/pages/${page.id}/edit`);
        }}
        folders={folders}
        replacePageId={replaceContentPage?.id ?? null}
        replacePageName={replaceContentPage?.name}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onSubmit={handleCreateFolder}
        parentFolder={createFolderParent}
      />

      <ConfirmDialog
        open={!!deletePage}
        onOpenChange={(open) => !open && setDeletePage(null)}
        title="Delete page"
        description={
          deletePage
            ? `Are you sure you want to delete "${deletePage.name}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeletePage}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={!!clonePage}
        onOpenChange={(open) => !open && setClonePage(null)}
        title="Clone page"
        description={
          clonePage
            ? `Create a copy of "${clonePage.name}"? You will be redirected to edit the new page.`
            : ''
        }
        confirmLabel="Clone"
        onConfirm={handleClonePage}
        loading={actionLoading}
      />

      {mapFormPage && (
        <FormMappingModal
          page={mapFormPage}
          open={!!mapFormPage}
          onOpenChange={(open) => !open && setMapFormPage(null)}
          onSaved={fetchPages}
        />
      )}
    </div>
  );
}
