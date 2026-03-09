/**
 * Asset reference counting for garbage collection.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AssetRef {
  assetId: string;
  workspaceId: string;
  pageId?: string;
  blockId?: string;
  jobId?: string;
}

/**
 * Record a reference to an asset.
 */
export async function addAssetRef(ref: AssetRef): Promise<void> {
  await prisma.assetUsage.create({
    data: {
      assetId: ref.assetId,
      workspaceId: ref.workspaceId,
      pageId: ref.pageId ?? null,
      blockId: ref.blockId ?? null,
      jobId: ref.jobId ?? null,
    },
  });
}

/**
 * Record multiple asset references in a batch.
 */
export async function addAssetRefs(refs: AssetRef[]): Promise<void> {
  if (refs.length === 0) return;
  await prisma.assetUsage.createMany({
    data: refs.map((ref) => ({
      assetId: ref.assetId,
      workspaceId: ref.workspaceId,
      pageId: ref.pageId ?? null,
      blockId: ref.blockId ?? null,
      jobId: ref.jobId ?? null,
    })),
  });
}

/**
 * Remove all asset references for a page.
 */
export async function removePageAssetRefs(pageId: string): Promise<void> {
  await prisma.assetUsage.deleteMany({ where: { pageId } });
}

/**
 * Remove all asset references for a specific block.
 */
export async function removeBlockAssetRefs(blockId: string): Promise<void> {
  await prisma.assetUsage.deleteMany({ where: { blockId } });
}

/**
 * Get asset IDs with zero references in a workspace (candidates for GC).
 */
export async function getOrphanedAssets(
  workspaceId: string,
): Promise<string[]> {
  // Get all referenced asset IDs
  const refs = await prisma.assetUsage.findMany({
    where: { workspaceId },
    select: { assetId: true },
    distinct: ['assetId'],
  });
  return refs.map((r) => r.assetId);
}
