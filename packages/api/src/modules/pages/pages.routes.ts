import { Router, Request, Response } from 'express';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireMinRole } from '../auth/auth.middleware.js';
import { requireWorkspace } from '../workspace/workspace.middleware.js';
import { detectForms, suggestCanonicalField } from './pages.forms.js';

export const pagesRouter = Router();

const readMiddleware = [requireAuth, requireWorkspace];
const writeMiddleware = [requireAuth, requireWorkspace, requireMinRole('Editor')];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateUniqueSlug(base: string, existing: string[]): string {
  let slug = slugify(base) || 'page';
  let candidate = slug;
  let n = 1;
  while (existing.includes(candidate)) {
    candidate = `${slug}-${n}`;
    n++;
  }
  return candidate;
}

pagesRouter.post('/', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { name, slug, folderId, contentJson, scripts, publishConfig, scheduleConfig } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    res.status(400).json({ error: 'name cannot be empty' });
    return;
  }

  const existingSlugs = (
    await prisma.page.findMany({
      where: { workspaceId },
      select: { slug: true },
    })
  ).map((p) => p.slug);

  const pageSlug = slug ? slugify(slug) || 'page' : slugify(trimmed) || 'page';
  const uniqueSlug = generateUniqueSlug(pageSlug, existingSlugs);

  if (folderId != null) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, workspaceId },
    });
    if (!folder) {
      res.status(400).json({ error: 'Folder not found' });
      return;
    }
  }

  const page = await prisma.page.create({
    data: {
      workspaceId,
      name: trimmed,
      slug: uniqueSlug,
      folderId: folderId || null,
      contentJson: contentJson ?? {},
      scripts: scripts ?? {},
      publishConfig: publishConfig ?? {},
      scheduleConfig: scheduleConfig ?? {},
    },
    include: { formBindings: true },
  });
  res.status(201).json({ page });
});

pagesRouter.get('/', ...readMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const folderId = req.query.folderId as string | undefined;

  const where: { workspaceId: string; folderId?: string | null } = { workspaceId };
  if (folderId !== undefined) {
    if (folderId === '' || folderId === 'root') {
      where.folderId = null;
    } else {
      where.folderId = folderId;
    }
  }

  const pages = await prisma.page.findMany({
    where,
    include: { formBindings: true },
    orderBy: { name: 'asc' },
  });
  res.json({ pages });
});

pagesRouter.get('/:id/detected-forms', ...readMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const page = await prisma.page.findFirst({
    where: { id, workspaceId },
    select: { contentJson: true },
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const forms = detectForms(page.contentJson);
  const withSuggestions = forms.map((f) => ({
    selector: f.selector,
    fields: f.fields.map((field) => ({
      ...field,
      suggestedCanonical: suggestCanonicalField(field),
    })),
  }));

  res.json({ forms: withSuggestions });
});

pagesRouter.get('/:id', ...readMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const page = await prisma.page.findFirst({
    where: { id, workspaceId },
    include: { formBindings: { include: { form: true } } },
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  res.json({ page });
});

pagesRouter.patch('/:id', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const {
    name,
    slug,
    folderId,
    contentJson,
    lastPublishedContentJson,
    scripts,
    publishConfig,
    scheduleConfig,
    formBindings,
  } = req.body;

  const page = await prisma.page.findFirst({
    where: { id, workspaceId },
    include: { formBindings: true },
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      res.status(400).json({ error: 'name cannot be empty' });
      return;
    }
    updates.name = trimmed;
  }
  if (slug !== undefined) {
    const newSlug = slugify(typeof slug === 'string' ? slug : '');
    if (!newSlug) {
      res.status(400).json({ error: 'slug cannot be empty' });
      return;
    }
    const existing = await prisma.page.findFirst({
      where: { workspaceId, slug: newSlug, NOT: { id } },
    });
    if (existing) {
      res.status(409).json({ error: 'Slug already in use' });
      return;
    }
    updates.slug = newSlug;
  }
  if (folderId !== undefined) {
    if (folderId === null || folderId === '') {
      updates.folderId = null;
    } else {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, workspaceId },
      });
      if (!folder) {
        res.status(400).json({ error: 'Folder not found' });
        return;
      }
      updates.folderId = folderId;
    }
  }
  if (contentJson !== undefined) updates.contentJson = contentJson;
  if (lastPublishedContentJson !== undefined) updates.lastPublishedContentJson = lastPublishedContentJson;
  if (scripts !== undefined) updates.scripts = scripts;
  if (publishConfig !== undefined) updates.publishConfig = publishConfig;
  if (scheduleConfig !== undefined) updates.scheduleConfig = scheduleConfig;
  if (formBindings !== undefined && Array.isArray(formBindings)) {
    await prisma.pageFormBinding.deleteMany({ where: { pageId: id } });
    for (const b of formBindings) {
      const { formId, type, selector, fieldMappings, blockId } = b;
      if (!type) continue;

      if (type === 'hooked') {
        if (!selector) continue;
        if (formId) {
          const form = await prisma.form.findFirst({
            where: { id: formId, workspaceId },
          });
          if (!form) continue;
        }
        await prisma.pageFormBinding.create({
          data: {
            pageId: id,
            formId: formId || null,
            blockId: null,
            type: 'hooked',
            selector,
            fieldMappings: (fieldMappings && typeof fieldMappings === 'object' ? fieldMappings : {}) as object,
          },
        });
      } else if (type === 'native') {
        if (!formId) continue;
        const form = await prisma.form.findFirst({
          where: { id: formId, workspaceId },
        });
        if (!form) continue;
        await prisma.pageFormBinding.create({
          data: {
            pageId: id,
            formId,
            blockId: blockId ?? null,
            type: 'native',
            selector: null,
            fieldMappings: (fieldMappings && typeof fieldMappings === 'object' ? fieldMappings : {}) as object,
          },
        });
      }
    }
  }

  const updated = await prisma.page.update({
    where: { id },
    data: updates,
    include: { formBindings: true },
  });
  res.json({ page: updated });
});

pagesRouter.delete('/:id', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const page = await prisma.page.findFirst({
    where: { id, workspaceId },
  });

  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  await prisma.page.delete({ where: { id } });
  res.json({ ok: true });
});

pagesRouter.post('/:id/clone', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const { name, slug } = req.body;

  const source = await prisma.page.findFirst({
    where: { id, workspaceId },
    include: { formBindings: true },
  });

  if (!source) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const baseName = name && typeof name === 'string' ? name.trim() : `${source.name} (Copy)`;
  const baseSlug = slug && typeof slug === 'string' ? slug : `${source.slug}-copy`;

  const existingSlugs = (
    await prisma.page.findMany({
      where: { workspaceId },
      select: { slug: true },
    })
  ).map((p) => p.slug);
  const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);

  const cloned = await prisma.page.create({
    data: {
      workspaceId,
      name: baseName,
      slug: uniqueSlug,
      folderId: source.folderId,
      contentJson: (source.contentJson ?? {}) as object,
      lastPublishedContentJson: (source.lastPublishedContentJson ?? {}) as object,
      scripts: (source.scripts ?? {}) as object,
      publishConfig: {},
      scheduleConfig: {},
      version: 1,
    },
  });

  for (const b of source.formBindings) {
    await prisma.pageFormBinding.create({
      data: {
        pageId: cloned.id,
        formId: b.formId,
        blockId: b.blockId,
        type: b.type,
        selector: b.selector,
        fieldMappings: (b.fieldMappings ?? {}) as object,
      },
    });
  }

  const page = await prisma.page.findUnique({
    where: { id: cloned.id },
    include: { formBindings: true },
  });
  res.status(201).json({ page });
});
