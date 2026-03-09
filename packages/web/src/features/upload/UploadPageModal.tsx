/**
 * Upload page modal: drag-and-drop or click to upload HTML / Chrome saved webpage.
 * Supports all Chrome save formats:
 * - Webpage, HTML Only (.html)
 * - Webpage, Single File (.mhtml)
 * - Webpage, Complete (folder with .html + _files assets)
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { htmlToBlocks, detectFormsFromHtml } from '@/lib/html-import';
import { extractHtmlFromMhtml } from '@/lib/html-import';
import { api, type FolderNode } from '@/lib/api';
import type { PageContentJson } from '@replica-pages/blocks';
import { Upload, FileText, Loader2 } from 'lucide-react';

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
  // Find HTML file: prefer index.html or first .html in root, else any .html/.htm/.mhtml
  const htmlExtensions = ['.html', '.htm', '.mhtml', '.mht', '.txt'];
  const htmlFile =
    arr.find((f) => {
      const n = (f as File).name?.toLowerCase() ?? '';
      const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
      const inRoot = path.split('/').length <= 2;
      return inRoot && (n === 'index.html' || n === 'index.htm');
    }) ??
    arr.find((f) => {
      const n = (f as File).name?.toLowerCase() ?? '';
      const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
      const inRoot = path.split('/').length <= 2;
      return inRoot && htmlExtensions.some((ext) => n.endsWith(ext));
    }) ??
    arr.find((f) => {
      const n = (f as File).name?.toLowerCase() ?? '';
      return htmlExtensions.some((ext) => n.endsWith(ext));
    }) ??
    arr.find((f) => (f as File).name); // Any file - try parsing as HTML
  if (htmlFile) return extractHtmlFromFile(htmlFile);
  return null;
}

interface UploadPageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderNode[];
  onFormMapping?: (pageId: string, hasForms: boolean) => void;
}

export function UploadPageModal({
  open,
  onOpenChange,
  folders,
  onFormMapping,
}: UploadPageModalProps) {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [contentJson, setContentJson] = useState<PageContentJson | null>(null);
  const [detectedForms, setDetectedForms] = useState<{ selector: string; fields: { name: string; id: string; type: string; label?: string }[] }[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [folderId, setFolderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importStage, setImportStage] = useState<string | null>(null);
  const [mhtmlFile, setMhtmlFile] = useState<File | null>(null);

  const flatFolders = flattenFolders(folders);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const arr = Array.from(files);
      const firstFile = arr[0];

      // Check if MHTML — route to server-side pipeline, but also parse client-side for form detection
      if (firstFile && (firstFile.name.toLowerCase().endsWith('.mhtml') || firstFile.name.toLowerCase().endsWith('.mht'))) {
        setMhtmlFile(firstFile);
        const pageName = firstFile.name.replace(/\.mhtml?$/i, '');
        if (!name) setName(pageName || 'Imported page');
        if (!slug) setSlug(slugify(pageName || 'imported-page'));

        // Client-side parse for preview: extract HTML, detect forms and count blocks
        try {
          const htmlContent = await extractHtmlFromFiles(files);
          if (htmlContent) {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const blocks = htmlToBlocks(htmlContent, baseUrl);
            setContentJson(blocks);
            const forms = detectFormsFromHtml(htmlContent);
            setDetectedForms(forms);
          }
        } catch {
          // Non-fatal: server-side pipeline will handle the actual import
        }
        return;
      }

      // HTML files — use existing client-side path
      const htmlContent = await extractHtmlFromFiles(files);
      if (!htmlContent) {
        setError('No HTML found. Use .html, .htm, .mhtml, .txt, Chrome formats, or any file containing HTML (e.g. from chatbots, Figma).');
        return;
      }
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const blocks = htmlToBlocks(htmlContent, baseUrl);
      setContentJson(blocks);
      const forms = detectFormsFromHtml(htmlContent);
      setDetectedForms(forms);
      if (!name) setName('Imported page');
      if (!slug) setSlug('imported-page');
    },
    [name, slug]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const { files } = e.dataTransfer;
      if (files?.length) handleFiles(files);
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files?.length) handleFiles(files);
      e.target.value = '';
    },
    [handleFiles]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!contentJson && !mhtmlFile) || !name.trim()) return;
    setError(null);
    setLoading(true);

    try {
      // MHTML: server-side import pipeline
      if (mhtmlFile) {
        setImportStage('Uploading...');
        const { jobId, status } = await api.import.mhtml(mhtmlFile, {
          name: name.trim(),
          slug: slug.trim() || slugify(name),
          folderId: folderId || undefined,
        });
        setImportJobId(jobId);

        // Poll for completion
        const stages = ['Extracting resources...', 'Analyzing layout...', 'Creating blocks...', 'Validating fidelity...', 'Creating page...'];
        let stageIdx = 0;

        const pollResult = await new Promise<{ pageId?: string; error?: string }>((resolve) => {
          const interval = setInterval(async () => {
            try {
              const job = await api.import.status(jobId);
              setImportStage(job.stage || stages[Math.min(stageIdx++, stages.length - 1)]);

              if (job.status === 'complete' && job.resultPageId) {
                clearInterval(interval);
                resolve({ pageId: job.resultPageId });
              } else if (job.status === 'failed') {
                clearInterval(interval);
                resolve({ error: job.errorMessage || 'Import failed' });
              }
            } catch {
              clearInterval(interval);
              resolve({ error: 'Failed to check import status' });
            }
          }, 2000);

          // Timeout after 5 minutes
          setTimeout(() => {
            clearInterval(interval);
            resolve({ error: 'Import timed out' });
          }, 300000);
        });

        if (pollResult.error) {
          setError(pollResult.error);
          return;
        }

        onOpenChange(false);
        const hasForms = detectedForms.length > 0;
        if (hasForms && onFormMapping && pollResult.pageId) {
          onFormMapping(pollResult.pageId, true);
        } else {
          navigate(`/pages/${pollResult.pageId}/edit`);
        }
        return;
      }

      // HTML: existing client-side path
      const { page } = await api.pages.create({
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        folderId: folderId || undefined,
        contentJson: contentJson!,
      });
      await api.library.importFromPage(name.trim(), contentJson!);
      onOpenChange(false);
      const hasForms = detectedForms.length > 0;
      if (hasForms && onFormMapping) {
        onFormMapping(page.id, true);
      } else {
        navigate(`/pages/${page.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
      setImportJobId(null);
      setImportStage(null);
    }
  };

  const reset = () => {
    setContentJson(null);
    setDetectedForms([]);
    setName('');
    setSlug('');
    setFolderId('');
    setError(null);
    setImportJobId(null);
    setImportStage(null);
    setMhtmlFile(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const blockCount = contentJson ? Object.keys(contentJson.blocks ?? {}).length : 0;
  const formCount = detectedForms.length;
  const hasContent = contentJson || mhtmlFile;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload page</DialogTitle>
          <DialogDescription>
            Accepts any HTML: Chrome formats (.html, .mhtml, folder), chatbots, Figma exports, or any file containing HTML. Forms will prompt field mapping to canonical fields.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center mb-2">
              Drag files here or click to browse
            </p>
            <input
              type="file"
              accept=".html,.htm,.mhtml,.mht,.txt,text/html,text/plain"
              onChange={handleFileInput}
              className="hidden"
              id="upload-page-input"
            />
            <input
              type="file"
              {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
              onChange={handleFileInput}
              className="hidden"
              id="upload-page-folder"
            />
            <div className="flex gap-2">
              <label htmlFor="upload-page-input">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>Select file</span>
                </Button>
              </label>
              <label htmlFor="upload-page-folder">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>Select folder</span>
                </Button>
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Any HTML: .html, .mhtml, .txt, folder. Chatbots, Figma, etc.
            </p>
          </div>

          {hasContent && (
            <>
              <div className="flex gap-2">
                {mhtmlFile ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                    <FileText className="h-3 w-3" />
                    MHTML file ({(mhtmlFile.size / 1024 / 1024).toFixed(1)}MB)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                    <FileText className="h-3 w-3" />
                    {blockCount} block{blockCount !== 1 ? 's' : ''}
                  </span>
                )}
                {formCount > 0 && (
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs">
                    {formCount} form{formCount !== 1 ? 's' : ''} detected
                  </span>
                )}
              </div>

              <div>
                <Label>Page name</Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value));
                  }}
                  placeholder="My Landing Page"
                  required
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-landing-page"
                />
              </div>
              <div>
                <Label>Folder</Label>
                <Select value={folderId || '__root__'} onValueChange={(v) => setFolderId(v === '__root__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Root" />
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !hasContent}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {importStage || 'Uploading...'}
                </>
              ) : (
                'Upload & open editor'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
