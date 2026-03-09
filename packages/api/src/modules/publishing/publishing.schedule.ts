/**
 * Schedule-related publishing logic: process due schedules, batch check.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/db.js';
import type { PublishConfig, ScheduleConfig } from './publishing.types.js';
import { PublishStatus as PS } from './publishing.types.js';

export function isScheduledDue(config: PublishConfig, now: Date): {
  shouldPublish: boolean;
  shouldUnpublish: boolean;
} {
  const publishAt = config.publishAt ? new Date(config.publishAt) : null;
  const unpublishAt = config.unpublishAt ? new Date(config.unpublishAt) : null;
  return {
    shouldPublish: !!publishAt && publishAt <= now && config.status === PS.Scheduled,
    shouldUnpublish: !!unpublishAt && unpublishAt <= now && config.status === PS.Published,
  };
}

export async function processScheduledPublish(pageId: string): Promise<boolean> {
  const page = await prisma.page.findFirst({
    where: { id: pageId },
    select: { publishConfig: true, contentJson: true, lastPublishedContentJson: true },
  });
  if (!page) return false;

  const config = (page.publishConfig ?? {}) as PublishConfig;
  const now = new Date();
  const { shouldPublish, shouldUnpublish } = isScheduledDue(config, now);

  if (shouldPublish) {
    await prisma.page.update({
      where: { id: pageId },
      data: {
        publishConfig: {
          ...config,
          status: PS.Published,
          isPublished: true,
          publishedAt: now.toISOString(),
        } as Prisma.InputJsonValue,
        lastPublishedContentJson: page.contentJson as Prisma.InputJsonValue,
      },
    });
    return true;
  }

  if (shouldUnpublish) {
    await prisma.page.update({
      where: { id: pageId },
      data: {
        publishConfig: {
          ...config,
          status: PS.Draft,
          isPublished: false,
          publishedAt: null,
        } as Prisma.InputJsonValue,
        lastPublishedContentJson: Prisma.DbNull,
      },
    });
    return true;
  }

  return false;
}

/**
 * Process all pages with pending schedules. Called by cron endpoint.
 */
export async function checkAllSchedules(): Promise<number> {
  const candidates = await prisma.page.findMany({
    where: {
      OR: [
        { publishConfig: { path: ['status'], equals: PS.Scheduled } },
        {
          AND: [
            { publishConfig: { path: ['status'], equals: PS.Published } },
            { publishConfig: { path: ['unpublishAt'], not: Prisma.DbNull } },
          ],
        },
      ],
    },
    select: { id: true },
  });

  let processed = 0;
  for (const page of candidates) {
    const did = await processScheduledPublish(page.id);
    if (did) processed++;
  }
  return processed;
}

/**
 * Save schedule config for a page.
 */
export async function schedulePage(
  pageId: string,
  workspaceId: string,
  schedule: ScheduleConfig
): Promise<{ ok: boolean; error?: string }> {
  const page = await prisma.page.findFirst({
    where: { id: pageId, workspaceId },
    select: { id: true, slug: true, publishConfig: true },
  });
  if (!page) return { ok: false, error: 'Page not found' };

  if (schedule.publishAt) {
    const publishDate = new Date(schedule.publishAt);
    if (isNaN(publishDate.getTime())) return { ok: false, error: 'Invalid publishAt date' };
  }
  if (schedule.unpublishAt) {
    const unpublishDate = new Date(schedule.unpublishAt);
    if (isNaN(unpublishDate.getTime())) return { ok: false, error: 'Invalid unpublishAt date' };
  }
  if (schedule.publishAt && schedule.unpublishAt) {
    if (new Date(schedule.publishAt) >= new Date(schedule.unpublishAt)) {
      return { ok: false, error: 'publishAt must be before unpublishAt' };
    }
  }

  const existing = (page.publishConfig ?? {}) as PublishConfig;
  const updated: PublishConfig = {
    ...existing,
    publishAt: schedule.publishAt,
    unpublishAt: schedule.unpublishAt,
    status: schedule.publishAt ? PS.Scheduled : existing.status,
    targetType: schedule.targetType ?? existing.targetType,
    domainId: schedule.domainId ?? existing.domainId,
    path: schedule.path ?? existing.path ?? `/${page.slug}`,
    webflowIntegrationId: schedule.webflowIntegrationId ?? existing.webflowIntegrationId,
    webflowSubdomain: schedule.webflowSubdomain ?? existing.webflowSubdomain,
  };

  await prisma.page.update({
    where: { id: pageId },
    data: {
      publishConfig: updated as Prisma.InputJsonValue,
      scheduleConfig: schedule as Prisma.InputJsonValue,
    },
  });

  return { ok: true };
}
