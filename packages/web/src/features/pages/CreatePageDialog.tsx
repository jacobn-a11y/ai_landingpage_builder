import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FolderNode } from '@/lib/api';
import { PAGE_TEMPLATES } from './page-templates';

interface CreatePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; slug: string; folderId?: string; contentJson?: object }) => Promise<void>;
  folders: FolderNode[];
  onImportClick?: () => void;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'page';
}

function flattenFolders(nodes: FolderNode[], prefix = ''): { id: string; name: string; label: string }[] {
  const result: { id: string; name: string; label: string }[] = [];
  for (const node of nodes) {
    const label = prefix ? `${prefix} / ${node.name}` : node.name;
    result.push({ id: node.id, name: node.name, label });
    if (node.children.length > 0) {
      result.push(...flattenFolders(node.children, label));
    }
  }
  return result;
}

export function CreatePageDialog({
  open,
  onOpenChange,
  onSubmit,
  folders,
  onImportClick,
}: CreatePageDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('blank');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatFolders = flattenFolders(folders);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const template = PAGE_TEMPLATES.find((t) => t.id === templateId);
      await onSubmit({
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        folderId: folderId || undefined,
        contentJson: template?.id !== 'blank' ? template?.contentJson : undefined,
      });
      setName('');
      setSlug('');
      setFolderId('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create page</DialogTitle>
          <DialogDescription>
            Add a new landing page. You can edit content in the editor after creating.
            Or{' '}
            <button
              type="button"
              className="underline text-primary hover:no-underline"
              onClick={() => {
                onOpenChange(false);
                onImportClick?.();
              }}
            >
              import from HTML
            </button>{' '}
            instead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Template</label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label} – {t.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Name</label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Landing Page"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-landing-page"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Folder</label>
                <Select value={folderId || '__root__'} onValueChange={(v) => setFolderId(v === '__root__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Root (no folder)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">Root</SelectItem>
                {flatFolders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
