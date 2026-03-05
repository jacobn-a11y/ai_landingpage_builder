import { Router, Request, Response } from 'express';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';

export const usersRouter = Router();

usersRouter.delete(
  '/:id',
  requireAuth,
  requireRole(['Admin']),
  async (req: Request, res: Response) => {
    const workspaceId = req.session.workspaceId;
    const userId = req.session.userId;
    const targetId = req.params.id;

    if (!workspaceId || !userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (targetId === userId) {
      res.status(400).json({ error: 'Cannot remove yourself' });
      return;
    }

    const target = await prisma.user.findFirst({
      where: { id: targetId, workspaceId },
    });

    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await prisma.user.delete({ where: { id: targetId } });
    res.json({ ok: true });
  }
);
