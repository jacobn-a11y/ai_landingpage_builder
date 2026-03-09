/**
 * Publishing routes: publish, unpublish, schedule, publish-status.
 * Mounted under /api/v1/pages (routes are /:id/publish, /:id/unpublish, etc.).
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireMinRole } from '../auth/auth.middleware.js';
import { requireWorkspace } from '../workspace/workspace.middleware.js';
import {
  publishPage,
  unpublishPage,
  getPublishStatus,
  schedulePage,
  processScheduledPublish,
  checkAllSchedules,
} from './publishing.service.js';
import type { PublishConfig } from './publishing.types.js';
import { PublishTargetType, PublishStatus } from './publishing.types.js';

export const publishingRouter = Router();

const VALID_TARGET_TYPES: string[] = [
  PublishTargetType.Demo,
  PublishTargetType.Custom,
  PublishTargetType.WebflowSubdomain,
];

const readMiddleware = [requireAuth, requireWorkspace];
const writeMiddleware = [requireAuth, requireWorkspace, requireMinRole('Editor')];

// Process scheduled publish/unpublish before returning status (MVP: check on each request)
async function maybeProcessSchedule(pageId: string): Promise<void> {
  await processScheduledPublish(pageId);
}

/**
 * POST /:id/publish - Publish a page to demo, custom domain, or Webflow subdomain.
 */
publishingRouter.post('/:id/publish', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const { targetType, domainId, path, webflowIntegrationId, webflowSubdomain } = req.body;

  if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
    res.status(400).json({ error: `targetType must be one of: ${VALID_TARGET_TYPES.join(', ')}` });
    return;
  }

  const result = await publishPage(id, workspaceId, {
    targetType: targetType as PublishTargetType,
    domainId: domainId ?? undefined,
    path: path ?? undefined,
    webflowIntegrationId: webflowIntegrationId ?? undefined,
    webflowSubdomain: webflowSubdomain ?? undefined,
  });

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  const status = await getPublishStatus(id, workspaceId);
  res.json({ ok: true, publishStatus: status });
});

/**
 * POST /:id/unpublish - Unpublish a page.
 */
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

/**
 * GET /:id/publish-status - Current publish state for a page.
 */
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
 * POST /:id/schedule - Schedule publish and/or unpublish times.
 * Body: { publishAt?, unpublishAt?, targetType?, domainId?, path?, webflowIntegrationId?, webflowSubdomain? }
 */
publishingRouter.post('/:id/schedule', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const { publishAt, unpublishAt, targetType, domainId, path, webflowIntegrationId, webflowSubdomain } = req.body;

  if (!publishAt && !unpublishAt) {
    res.status(400).json({ error: 'At least one of publishAt or unpublishAt is required' });
    return;
  }

  const result = await schedulePage(id, workspaceId, {
    publishAt: publishAt ?? undefined,
    unpublishAt: unpublishAt ?? undefined,
    targetType: targetType ?? undefined,
    domainId: domainId ?? undefined,
    path: path ?? undefined,
    webflowIntegrationId: webflowIntegrationId ?? undefined,
    webflowSubdomain: webflowSubdomain ?? undefined,
  });

  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  await maybeProcessSchedule(id);
  const status = await getPublishStatus(id, workspaceId);
  res.json({ ok: true, publishStatus: status });
});

/**
 * PATCH /:id/publish-schedule - Update schedule (backwards-compatible endpoint).
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

/**
 * POST /check-schedules - Process all due scheduled pages.
 * Can be called by cron or internal task runner.
 */
publishingRouter.post('/check-schedules', requireAuth, async (_req: Request, res: Response) => {
  const processed = await checkAllSchedules();
  res.json({ ok: true, processed });
});
