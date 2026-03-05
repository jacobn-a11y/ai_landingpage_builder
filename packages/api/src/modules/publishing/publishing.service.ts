/**
 * Publishing service: publish, unpublish, schedule checks.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/db.js';
import type { PublishConfig, PublishStatus, PublishTargetType } from './publishing.types.js';
import { PublishStatus as PS, PublishTargetType as PT } from './publishing.types.js';
import { DomainStatus } from '../domains/domains.types.js';

const API_BASE = process.env.API_URL ?? process.env.WEB_URL ?? 'http://localhost:5173';

export function getDemoUrl(workspaceId: string, pageSlug: string): string {
  const base = API_BASE.replace(/\/$/, '');
  return `${base}/api/v1/serve/demo/${workspaceId}/${pageSlug}`;
}

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

export async function publishPage(
  pageId: string,
  workspaceId: string,
  target: { targetType: PublishTargetType; domainId?: string; path?: string }
): Promise<{ ok: boolean; error?: string }> {
  const page = await prisma.page.findFirst({
    where: { id: pageId, workspaceId },
    select: { id: true, slug: true, contentJson: true },
  });
  if (!page) return { ok: false, error: 'Page not found' };

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

  const path = target.path ?? page.slug;
  const config: PublishConfig = {
    domainId: target.domainId,
    targetType: target.targetType,
    path: path.startsWith('/') ? path : `/${path}`,
    status: PS.Published,
    isPublished: true,
    publishedAt: new Date().toISOString(),
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

export async function unpublishPage(pageId: string, workspaceId: string): Promise<{ ok: boolean; error?: string }> {
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

export async function getPublishStatus(
  pageId: string,
  workspaceId: string
): Promise<{
  publishConfig: PublishConfig;
  status: PublishStatus;
  targetLabel: string;
  url?: string;
} | null> {
  const page = await prisma.page.findFirst({
    where: { id: pageId, workspaceId },
    include: { workspace: { select: { id: true } } },
  });
  if (!page) return null;

  const config = (page.publishConfig ?? {}) as PublishConfig;
  const status = (config.status ?? (config.isPublished ? PS.Published : PS.Draft)) as PublishStatus;

  let targetLabel = 'Not published';
  let url: string | undefined;

  if (config.targetType === PT.Demo) {
    targetLabel = `Published to demo`;
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
  }

  if (status === PS.Scheduled && config.publishAt) {
    targetLabel = `Scheduled for ${new Date(config.publishAt).toLocaleString()}`;
  }

  return { publishConfig: config, status, targetLabel, url };
}
