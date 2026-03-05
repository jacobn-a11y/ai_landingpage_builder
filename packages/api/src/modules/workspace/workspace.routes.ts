import { Router, Request, Response } from 'express';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import type { ScriptAllowlist } from '../scripts/scripts.types.js';

export const workspaceRouter = Router();

workspaceRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const workspaceId = req.session.workspaceId;
  if (!workspaceId) {
    res.status(401).json({ error: 'No workspace context' });
    return;
  }
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      allowedEmailDomains: true,
      globalHeaderScript: true,
      globalFooterScript: true,
      scriptAllowlist: true,
    },
  });
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }
  res.json({ workspace });
});

workspaceRouter.get(
  '/:id/users',
  requireAuth,
  requireRole(['Admin']),
  async (req: Request, res: Response) => {
    const workspaceId = req.params.id;
    const sessionWorkspaceId = req.session.workspaceId;

    if (sessionWorkspaceId !== workspaceId) {
      res.status(403).json({ error: 'Access denied to this workspace' });
      return;
    }

    const users = await prisma.user.findMany({
      where: { workspaceId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ users });
  }
);

// PATCH /api/v1/workspaces/:id/settings - Admin only: global scripts and allowlist
workspaceRouter.patch(
  '/:id/settings',
  requireAuth,
  requireRole(['Admin']),
  async (req: Request, res: Response) => {
    const workspaceId = req.params.id;
    const sessionWorkspaceId = req.session.workspaceId;

    if (sessionWorkspaceId !== workspaceId) {
      res.status(403).json({ error: 'Access denied to this workspace' });
      return;
    }

    const {
      name,
      allowedEmailDomains,
      globalHeaderScript,
      globalFooterScript,
      scriptAllowlist,
    } = req.body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) {
      const n = typeof name === 'string' ? name.trim() : '';
      if (!n) {
        res.status(400).json({ error: 'name cannot be empty' });
        return;
      }
      updates.name = n;
    }
    if (allowedEmailDomains !== undefined) {
      if (!Array.isArray(allowedEmailDomains)) {
        res.status(400).json({ error: 'allowedEmailDomains must be an array' });
        return;
      }
      updates.allowedEmailDomains = allowedEmailDomains
        .filter((d: unknown) => typeof d === 'string' && d.trim())
        .map((d: string) => d.trim());
    }
    if (globalHeaderScript !== undefined) {
      updates.globalHeaderScript =
        typeof globalHeaderScript === 'string' ? globalHeaderScript : null;
    }
    if (globalFooterScript !== undefined) {
      updates.globalFooterScript =
        typeof globalFooterScript === 'string' ? globalFooterScript : null;
    }
    if (scriptAllowlist !== undefined) {
      if (!Array.isArray(scriptAllowlist)) {
        res.status(400).json({ error: 'scriptAllowlist must be an array' });
        return;
      }
      const valid: ScriptAllowlist = [];
      for (const entry of scriptAllowlist) {
        if (entry && typeof entry.domain === 'string' && entry.domain.trim()) {
          valid.push({
            domain: entry.domain.trim(),
            pathPrefix:
              typeof entry.pathPrefix === 'string' && entry.pathPrefix.trim()
                ? entry.pathPrefix.trim()
                : undefined,
          });
        }
      }
      updates.scriptAllowlist = valid;
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updates,
    });

    res.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        allowedEmailDomains: workspace.allowedEmailDomains,
        globalHeaderScript: workspace.globalHeaderScript,
        globalFooterScript: workspace.globalFooterScript,
        scriptAllowlist: workspace.scriptAllowlist,
      },
    });
  }
);
