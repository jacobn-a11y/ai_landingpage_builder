import { Router, Request, Response } from 'express';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireMinRole } from '../auth/auth.middleware.js';
import { requireWorkspace } from '../workspace/workspace.middleware.js';
import type { BaseBlock, PageContentJson } from '@replica-pages/blocks';

const libraryRouter = Router();
const editorMiddleware = [requireAuth, requireWorkspace, requireMinRole('Editor')];

function blockToItemName(block: BaseBlock): string {
  const type = block.type;
  if (block.type === 'text' && block.props?.text) {
    const t = String(block.props.text).slice(0, 40);
    return t.length < 40 ? t : t + '…';
  }
  if (block.type === 'image') return 'Image';
  if (block.type === 'button' && block.props?.text) return String(block.props.text).slice(0, 30);
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Import blocks from page content into library (folder = page name)
// For composite blocks (with children), store full subtree as { root, blocks }
libraryRouter.post('/import', ...editorMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { pageName, contentJson } = req.body as { pageName: string; contentJson: PageContentJson };
  if (!pageName?.trim() || !contentJson?.blocks) {
    res.status(400).json({ error: 'pageName and contentJson.blocks are required' });
    return;
  }
  const folder = await prisma.blockLibraryFolder.create({
    data: { workspaceId, name: pageName.trim() },
  });
  const allBlocks = contentJson.blocks as Record<string, BaseBlock>;

  function getSubtree(blockId: string): Record<string, BaseBlock> {
    const result: Record<string, BaseBlock> = {};
    const visit = (id: string) => {
      const b = allBlocks[id];
      if (!b) return;
      result[id] = b;
      for (const cid of b.children ?? []) visit(cid);
    };
    visit(blockId);
    return result;
  }

  for (const block of Object.values(allBlocks)) {
    const itemType = block.children?.length ? 'block' : 'element';
    const name = blockToItemName(block);
    const blockJson =
      itemType === 'block'
        ? ({ root: block.id, blocks: getSubtree(block.id) } as object)
        : (block as object);
    await prisma.blockLibraryItem.create({
      data: {
        folderId: folder.id,
        name,
        type: itemType,
        blockJson,
      },
    });
  }
  const withItems = await prisma.blockLibraryFolder.findUnique({
    where: { id: folder.id },
    include: { items: true },
  });
  res.json({ folder: withItems });
});

// List folders with items
libraryRouter.get('/folders', ...editorMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const folders = await prisma.blockLibraryFolder.findMany({
    where: { workspaceId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ folders });
});

// Create folder (when uploading a new page)
libraryRouter.post('/folders', ...editorMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { name } = req.body as { name: string };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const folder = await prisma.blockLibraryFolder.create({
    data: { workspaceId, name: name.trim() },
  });
  res.json({ folder });
});

// Delete folder (items cascade)
libraryRouter.delete('/folders/:id', ...editorMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const folder = await prisma.blockLibraryFolder.findFirst({
    where: { id, workspaceId },
  });
  if (!folder) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }
  await prisma.blockLibraryFolder.delete({ where: { id } });
  res.json({ ok: true });
});

// Add item to folder
libraryRouter.post('/folders/:folderId/items', ...editorMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { folderId } = req.params;
  const { name, type, blockJson } = req.body as { name: string; type: string; blockJson: object };
  const folder = await prisma.blockLibraryFolder.findFirst({
    where: { id: folderId, workspaceId },
  });
  if (!folder) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }
  if (!name?.trim() || !type || !blockJson) {
    res.status(400).json({ error: 'name, type, and blockJson are required' });
    return;
  }
  const item = await prisma.blockLibraryItem.create({
    data: { folderId, name: name.trim(), type, blockJson: blockJson as object },
  });
  res.json({ item });
});

// Delete item
libraryRouter.delete('/items/:id', ...editorMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const item = await prisma.blockLibraryItem.findFirst({
    where: { id },
    include: { folder: true },
  });
  if (!item || item.folder.workspaceId !== workspaceId) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  await prisma.blockLibraryItem.delete({ where: { id } });
  res.json({ ok: true });
});

export { libraryRouter };
