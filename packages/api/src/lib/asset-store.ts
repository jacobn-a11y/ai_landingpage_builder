/**
 * Content-addressed asset storage.
 * Assets are stored by SHA-256 hash to deduplicate within a workspace.
 */

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';

const ASSET_BASE_PATH = process.env.ASSET_STORAGE_PATH || './data/assets';

export interface StoredAsset {
  assetId: string;   // SHA-256 hash
  url: string;       // Public URL path
  filePath: string;  // Filesystem path
  mimeType: string;
  sizeBytes: number;
}

/**
 * Compute SHA-256 hash of a buffer.
 */
export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Get file extension from MIME type.
 */
function getExtension(mimeType: string): string {
  const ext = mime.extension(mimeType);
  return ext || 'bin';
}

/**
 * Validate MIME type is safe to store and serve.
 * Reject executable and dangerous types.
 */
function isAllowedMimeType(mimeType: string): boolean {
  const blocked = [
    'application/javascript',
    'text/javascript',
    'application/x-javascript',
    'application/x-httpd-php',
    'application/x-sh',
    'application/x-csh',
    'application/x-executable',
    'application/x-msdos-program',
    'application/x-msdownload',
    'application/batch',
    'text/html', // Never serve HTML from asset endpoint
  ];
  return !blocked.includes(mimeType.toLowerCase());
}

/**
 * Ensure the workspace asset directory exists.
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Store an asset. Returns metadata including the public URL.
 * Content-addressed: identical content produces the same filename.
 */
export async function storeAsset(
  workspaceId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<StoredAsset> {
  if (!isAllowedMimeType(mimeType)) {
    throw new Error(`Blocked MIME type: ${mimeType}`);
  }

  const hash = hashBuffer(buffer);
  const ext = getExtension(mimeType);
  const filename = `${hash}.${ext}`;
  const dirPath = path.join(ASSET_BASE_PATH, workspaceId);
  const filePath = path.join(dirPath, filename);

  await ensureDir(dirPath);

  // Only write if not already stored (content-addressed dedup)
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, buffer);
  }

  return {
    assetId: hash,
    url: `/api/v1/assets/${workspaceId}/${filename}`,
    filePath,
    mimeType,
    sizeBytes: buffer.length,
  };
}

/**
 * Get the filesystem path for an asset.
 */
export function getAssetPath(workspaceId: string, filename: string): string {
  return path.join(ASSET_BASE_PATH, workspaceId, filename);
}

/**
 * Delete all assets for a workspace.
 */
export async function deleteWorkspaceAssets(workspaceId: string): Promise<void> {
  const dirPath = path.join(ASSET_BASE_PATH, workspaceId);
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch {
    // Directory may not exist
  }
}
