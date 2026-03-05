import { useState, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { FolderNode } from '@/lib/api';
import type { PageContentJson } from '@replica-pages/blocks';
import { htmlToBlocks, detectFormsFromHtml, extractHtmlFromMhtml } from '@/lib/html-import';
import { FileText } from 'lucide-react';

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Failed to read file'));
    r.readAsText(file, 'utf-8');
  });
}

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('<') ||
    trimmed.startsWith('<!') ||
    /<html[\s>]/i.test(trimmed) ||
    /<body[\s>]/i.test(trimmed) ||
    /<div[\s>]/i.test(trimmed) ||
    /<form[\s>]/i.test(trimmed) ||
    /<section[\s>]/i.test(trimmed)
  );
}

async function extractHtmlFromFile(file: File): Promise<string | null> {
  const name = file.name.toLowerCase();
  const text = await readFileAsText(file);

  if (name.endsWith('.mhtml') || name.endsWith('.mht')) {
    const extracted = extractHtmlFromMhtml(text);
    return extracted ?? (looksLikeHtml(text) ? text : null);
  }
  if (name.endsWith('.html') || name.endsWith('.htm')) {
    return text;
  }
  return looksLikeHtml(text) ? text : null;
}

async function extractHtmlFromFiles(files: FileList | File[]): Promise<string | null> {
  const arr = Array.from(files);
  const htmlExtensions = ['.html', '.htm', '.mhtml', '.mht', '.txt'];
  const htmlFile =
    arr.find((f) => {
      const n = (f as File).name?.toLowerCase() ?? '';
      return htmlExtensions.some((ext) => n.endsWith(ext));
    }) ?? arr[0];
  if (htmlFile) return extractHtmlFromFile(htmlFile);
  return null;
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

function flattenFolders(
  nodes: FolderNode[],
  prefix = ''
): { id: string; name: string; label: string }[] {
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

export interface ImportResult {
  contentJson: PageContentJson;
  detectedForms: { selector: string; fields: { name: string; id: string; type: string; label?: string }[] }[];
}

interface ImportPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    slug: string;
    folderId?: string;
    contentJson: object;
    replacePageId?: string;
  }) => Promise<{ page: { id: string } }>;
  onImported?: (page: { id: string }, hasForms: boolean) => void;
  folders: FolderNode[];
  replacePageId?: string | null;
  replacePageName?: string;
}

export function ImportPageDialog({
  open,
  onOpenChange,
  onSubmit,
  onImported,
  folders,
  replacePageId,
  replacePageName,
}: ImportPageDialogProps) {
  const [file, setFile] = useState<File | FileList | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatFolders = flattenFolders(folders);
  const isReplaceMode = !!replacePageId;

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      setFile(null);
      setImportResult(null);
      setError(null);

      if (!files?.length) return;

      const htmlContent = await extractHtmlFromFiles(files);
      if (!htmlContent) {
        setError('No HTML found. Use .html, .mhtml, .txt, folder, or any file containing HTML (e.g. chatbots, Figma).');
        return;
      }

      try {
        const contentJson = htmlToBlocks(htmlContent, '');
        const detectedForms = detectFormsFromHtml(htmlContent);
        setImportResult({ contentJson, detectedForms });
        setFile(files.length === 1 ? files[0] : files);

        const htmlFile = Array.from(files).find((f) => {
          const n = f.name.toLowerCase();
          return n.endsWith('.html') || n.endsWith('.htm') || n.endsWith('.mhtml') || n.endsWith('.mht');
        });
        const baseName = htmlFile?.name.replace(/\.(html?|mhtml?)$/i, '') ?? 'imported';
        if (!name) setName(baseName);
        if (!slug || slug === slugify(name)) setSlug(slugify(baseName));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse HTML');
      }
    },
    [name, slug]
  );

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importResult?.contentJson) return;
    if (!isReplaceMode && !name.trim()) return;

    setError(null);
    setLoading(true);
    try {
      const { page } = await onSubmit({
        name: name.trim() || replacePageName || 'Imported page',
        slug: slug.trim() || slugify(name) || 'imported',
        folderId: folderId || undefined,
        contentJson: importResult.contentJson,
        replacePageId: replacePageId ?? undefined,
      });
      const hasForms = importResult.detectedForms.length > 0;
      onImported?.(page, hasForms);
      setFile(null);
      setImportResult(null);
      setName('');
      setSlug('');
      setFolderId('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import');
    } finally {
      setLoading(false);
    }
  };

  const blockCount = importResult?.contentJson
    ? Object.keys(importResult.contentJson.blocks ?? {}).length
    : 0;
  const formCount = importResult?.detectedForms.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isReplaceMode ? 'Replace page content' : 'Import HTML'}
          </DialogTitle>
          <DialogDescription>
            {isReplaceMode
              ? `Replace content of "${replacePageName}" with imported HTML.`
              : 'Upload any HTML: .html, .mhtml, .txt, folder, or exports from chatbots/Figma. Forms will prompt field mapping to canonical fields.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-2 block">HTML file or folder</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-md border border-dashed p-4">
                <input
                  type="file"
                  accept=".html,.htm,.mhtml,.mht,.txt,text/html,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                  id="import-html-file"
                />
                <input
                  type="file"
                  {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                  onChange={handleFileChange}
                  className="hidden"
                  id="import-html-folder"
                />
                <label htmlFor="import-html-file">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>Select file</span>
                  </Button>
                </label>
                <label htmlFor="import-html-folder">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>Select folder</span>
                  </Button>
                </label>
                {file && (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Any HTML: .html, .mhtml, .txt, folder. Chatbots, Figma, etc.
              </p>
            </div>
          </div>

          {importResult && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {blockCount} block{blockCount !== 1 ? 's' : ''}
              </Badge>
              {formCount > 0 && (
                <Badge variant="outline">
                  {formCount} form{formCount !== 1 ? 's' : ''} detected
                </Badge>
              )}
            </div>
          )}

          {!isReplaceMode && (
            <>
              <div>
                <Label className="mb-2 block">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="My Landing Page"
                  required
                />
              </div>
              <div>
                <Label className="mb-2 block">Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-landing-page"
                />
              </div>
              <div>
                <Label className="mb-2 block">Folder</Label>
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
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !importResult}
            >
              {loading
                ? 'Importing...'
                : isReplaceMode
                  ? 'Replace content'
                  : 'Create page'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
