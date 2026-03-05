/**
 * Publishing routes: publish, unpublish, publish-status.
 * Mounted under /api/v1/pages (routes are /:id/publish, /:id/unpublish, /:id/publish-status).
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireMinRole } from '../auth/auth.middleware.js';
import { requireWorkspace } from '../workspace/workspace.middleware.js';
import {
  publishPage,
  unpublishPage,
  getPublishStatus,
  processScheduledPublish,
} from './publishing.service.js';
import type { PublishConfig } from './publishing.types.js';
import { PublishTargetType, PublishStatus } from './publishing.types.js';

export const publishingRouter = Router();

const readMiddleware = [requireAuth, requireWorkspace];
const writeMiddleware = [requireAuth, requireWorkspace, requireMinRole('Editor')];

// Process scheduled publish/unpublish before returning status (MVP: check on each request)
async function maybeProcessSchedule(pageId: string): Promise<void> {
  await processScheduledPublish(pageId);
}

publishingRouter.post('/:id/publish', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const { targetType, domainId, path } = req.body;

  if (!targetType || !['demo', 'custom'].includes(targetType)) {
    res.status(400).json({ error: 'targetType must be demo or custom' });
    return;
  }

  const result = await publishPage(id, workspaceId, {
    targetType: targetType as PublishTargetType,
    domainId: domainId ?? undefined,
    path: path ?? undefined,
  });

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  const status = await getPublishStatus(id, workspaceId);
  res.json({ ok: true, publishStatus: status });
});

publishingRouter.post('/:id/unpublish', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const result = await unpublishPage(id, workspaceId);

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  const status = await getPublishStatus(id, workspaceId);
  res.json({ ok: true, publishStatus: status });
});

publishingRouter.get('/:id/publish-status', ...readMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  await maybeProcessSchedule(id);

  const status = await getPublishStatus(id, workspaceId);
  if (!status) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  res.json({ publishStatus: status });
});

/**
 * Schedule publish/unpublish. Updates publishConfig with publishAt, unpublishAt, status.
 */
publishingRouter.patch('/:id/publish-schedule', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const { publishAt, unpublishAt } = req.body;

  const p = await prisma.page.findFirst({
    where: { id, workspaceId },
    select: { publishConfig: true },
  });

  if (!p) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const config = (p.publishConfig ?? {}) as PublishConfig;
  const newPublishAt = publishAt !== undefined ? publishAt : config.publishAt;
  const newUnpublishAt = unpublishAt !== undefined ? unpublishAt : config.unpublishAt;
  const updated: PublishConfig = {
    ...config,
    publishAt: newPublishAt ?? undefined,
    unpublishAt: newUnpublishAt ?? undefined,
    status: newPublishAt ? PublishStatus.Scheduled : config.status,
  };

  await prisma.page.update({
    where: { id },
    data: { publishConfig: updated as object },
  });

  await maybeProcessSchedule(id);
  const status = await getPublishStatus(id, workspaceId);
  res.json({ ok: true, publishStatus: status });
});
