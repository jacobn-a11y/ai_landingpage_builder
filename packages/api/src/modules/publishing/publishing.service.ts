/**
 * Publishing service: publish, unpublish, schedule checks, Webflow subdomain.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/db.js';
import type { PublishConfig, ScheduleConfig } from './publishing.types.js';
import { PublishStatus as PS, PublishTargetType as PT } from './publishing.types.js';
import { DomainStatus } from '../domains/domains.types.js';

const API_BASE = process.env.API_URL ?? process.env.WEB_URL ?? 'http://localhost:5173';

/* ---------- URL helpers ---------- */

export function getDemoUrl(workspaceId: string, pageSlug: string): string {
  const base = API_BASE.replace(/\/$/, '');
  return `${base}/api/v1/serve/demo/${workspaceId}/${pageSlug}`;
}

export function getWebflowSubdomainUrl(subdomain: string, path?: string): string {
  const cleanPath = (path ?? '/').replace(/^\//, '');
  return `https://${subdomain}.webflow.io/${cleanPath}`;
}

/* ---------- Schedule helpers ---------- */

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
  const now = new Date().toISOString();
  // Find pages that are scheduled or published with unpublishAt
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

/* ---------- Publish ---------- */

interface PublishTarget {
  targetType: PT;
  domainId?: string;
  path?: string;
  webflowIntegrationId?: string;
  webflowSubdomain?: string;
}

export async function publishPage(
  pageId: string,
  workspaceId: string,
  target: PublishTarget
): Promise<{ ok: boolean; error?: string }> {
  const page = await prisma.page.findFirst({
    where: { id: pageId, workspaceId },
    select: { id: true, slug: true, contentJson: true },
  });
  if (!page) return { ok: false, error: 'Page not found' };

  // Validate custom domain target
  if (target.targetType === PT.Custom) {
    if (!target.domainId) return { ok: false, error: 'domainId required for custom domain' };
    const domain = await prisma.domain.findFirst({
      where: { id: target.domainId, workspaceId },
    });
    if (!domain) return { ok: false, error: 'Domain not found' };
    if (domain.status !== DomainStatus.Active) {
      return { ok: false, error: 'Domain must be Active to publish' };
    }
  }

  // Validate Webflow subdomain target
  if (target.targetType === PT.WebflowSubdomain) {
    if (!target.webflowSubdomain) {
      return { ok: false, error: 'webflowSubdomain is required for Webflow publishing' };
    }
    // Publish to Webflow (fire-and-forget for now, real integration would call Webflow API)
    const wfResult = await publishToWebflow(pageId, workspaceId, target);
    if (!wfResult.ok) return wfResult;
  }

  const path = target.path ?? page.slug;
  const config: PublishConfig = {
    domainId: target.domainId,
    targetType: target.targetType,
    path: path.startsWith('/') ? path : `/${path}`,
    status: PS.Published,
    isPublished: true,
    publishedAt: new Date().toISOString(),
    webflowIntegrationId: target.webflowIntegrationId,
    webflowSubdomain: target.webflowSubdomain,
  };

  await prisma.page.update({
    where: { id: pageId },
    data: {
      publishConfig: config as Prisma.InputJsonValue,
      lastPublishedContentJson: page.contentJson as Prisma.InputJsonValue,
    },
  });
  return { ok: true };
}

/* ---------- Webflow subdomain publish ---------- */

async function publishToWebflow(
  pageId: string,
  workspaceId: string,
  target: PublishTarget
): Promise<{ ok: boolean; error?: string }> {
  // Look up integration credentials if integrationId provided
  if (target.webflowIntegrationId) {
    const integration = await prisma.integration.findFirst({
      where: {
        id: target.webflowIntegrationId,
        workspaceId,
        type: 'webflow',
      },
    });
    if (!integration) {
      return { ok: false, error: 'Webflow integration not found' };
    }
    // In production, this would decrypt configEncrypted and call Webflow API:
    // - Create or update page via POST/PUT /sites/:siteId/pages
    // - Publish the site via POST /sites/:siteId/publish
    // For now we accept the publish and store the config for future API calls.
  }

  return { ok: true };
}

/* ---------- Unpublish ---------- */

export async function unpublishPage(
  pageId: string,
  workspaceId: string
): Promise<{ ok: boolean; error?: string }> {
  const page = await prisma.page.findFirst({
    where: { id: pageId, workspaceId },
  });
  if (!page) return { ok: false, error: 'Page not found' };

  const config = (page.publishConfig ?? {}) as PublishConfig;
  const updated: PublishConfig = {
    ...config,
    status: PS.Draft,
    isPublished: false,
    publishedAt: undefined,
  };

  await prisma.page.update({
    where: { id: pageId },
    data: {
      publishConfig: updated as Prisma.InputJsonValue,
      lastPublishedContentJson: Prisma.DbNull,
    },
  });
  return { ok: true };
}

/* ---------- Schedule ---------- */

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

  // Validate dates
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

/* ---------- Status ---------- */

export async function getPublishStatus(
  pageId: string,
  workspaceId: string
): Promise<{
  publishConfig: PublishConfig;
  status: string;
  targetLabel: string;
  url?: string;
} | null> {
  const page = await prisma.page.findFirst({
    where: { id: pageId, workspaceId },
    include: { workspace: { select: { id: true } } },
  });
  if (!page) return null;

  const config = (page.publishConfig ?? {}) as PublishConfig;
  const status = (config.status ?? (config.isPublished ? PS.Published : PS.Draft)) as string;

  let targetLabel = 'Not published';
  let url: string | undefined;

  if (config.targetType === PT.Demo) {
    targetLabel = 'Published to demo';
    url = getDemoUrl(page.workspaceId, config.path?.replace(/^\//, '') ?? page.slug);
  } else if (config.targetType === PT.Custom && config.domainId) {
    const domain = await prisma.domain.findFirst({
      where: { id: config.domainId, workspaceId },
    });
    targetLabel = domain ? `Published to ${domain.hostname}${config.path ?? ''}` : 'Custom domain';
    if (domain) {
      const path = (config.path ?? `/${page.slug}`).replace(/^\//, '');
      url = `https://${domain.hostname}/${path}`;
    }
  } else if (config.targetType === PT.WebflowSubdomain && config.webflowSubdomain) {
    targetLabel = `Published to ${config.webflowSubdomain}.webflow.io`;
    url = getWebflowSubdomainUrl(config.webflowSubdomain, config.path);
  }

  if (status === PS.Scheduled && config.publishAt) {
    targetLabel = `Scheduled for ${new Date(config.publishAt).toLocaleString()}`;
  }

  return { publishConfig: config, status, targetLabel, url };
}
