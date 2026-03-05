import { Router, Request, Response } from 'express';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireMinRole } from '../auth/auth.middleware.js';
import { requireWorkspace } from '../workspace/workspace.middleware.js';

export const foldersRouter = Router();

const readMiddleware = [requireAuth, requireWorkspace];
const writeMiddleware = [requireAuth, requireWorkspace, requireMinRole('Editor')];

interface FolderNode {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
  children: FolderNode[];
}

function buildTree(folders: { id: string; workspaceId: string; parentId: string | null; name: string }[], parentId: string | null): FolderNode[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .map((f) => ({
      id: f.id,
      workspaceId: f.workspaceId,
      parentId: f.parentId,
      name: f.name,
      children: buildTree(folders, f.id),
    }));
}

foldersRouter.post('/', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { name, parentId } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    res.status(400).json({ error: 'name cannot be empty' });
    return;
  }

  if (parentId != null) {
    const parent = await prisma.folder.findFirst({
      where: { id: parentId, workspaceId },
    });
    if (!parent) {
      res.status(400).json({ error: 'Parent folder not found' });
      return;
    }
  }

  const folder = await prisma.folder.create({
    data: {
      workspaceId,
      name: trimmed,
      parentId: parentId || null,
    },
  });
  res.status(201).json({ folder });
});

foldersRouter.get('/', ...readMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;

  const folders = await prisma.folder.findMany({
    where: { workspaceId },
    select: { id: true, workspaceId: true, parentId: true, name: true },
    orderBy: { name: 'asc' },
  });

  const tree = buildTree(folders, null);
  res.json({ folders: tree });
});

foldersRouter.patch('/:id', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const { name, parentId } = req.body;

  const folder = await prisma.folder.findFirst({
    where: { id, workspaceId },
  });

  if (!folder) {
    res.status(404).json({ error: 'Folder not found' });
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
  if (parentId !== undefined) {
    if (parentId === null || parentId === '') {
      updates.parentId = null;
    } else {
      if (parentId === id) {
        res.status(400).json({ error: 'Folder cannot be its own parent' });
        return;
      }
      const parent = await prisma.folder.findFirst({
        where: { id: parentId, workspaceId },
      });
      if (!parent) {
        res.status(400).json({ error: 'Parent folder not found' });
        return;
      }
      updates.parentId = parentId;
    }
  }

  const updated = await prisma.folder.update({
    where: { id },
    data: updates,
  });
  res.json({ folder: updated });
});

foldersRouter.delete('/:id', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const folder = await prisma.folder.findFirst({
    where: { id, workspaceId },
    include: { children: true },
  });

  if (!folder) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  if (folder.children.length > 0) {
    res.status(400).json({ error: 'Cannot delete folder with subfolders. Delete or move children first.' });
    return;
  }

  await prisma.folder.delete({ where: { id } });
  res.json({ ok: true });
});
