/**
 * Debug Bundle — packages import artifacts for debugging.
 *
 * Contains: sanitized HTML/CSS, mapping data, screenshots,
 * block JSON, logs, charset info.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const BUNDLE_BASE_PATH = process.env.DEBUG_BUNDLE_PATH || './data/debug-bundles';
const DEFAULT_RETENTION_DAYS = 7;

export interface DebugBundleInput {
  jobId: string;
  workspaceId: string;
  sanitizedHtml: string;
  stylesheets: Array<{ url: string; content: string }>;
  screenshots: Map<string, Buffer>;
  blockJson: Record<string, unknown>;
  logs: string[];
  charsetInfo: { detected: string; conflicts: string[] };
  warnings: string[];
}

export interface DebugBundle {
  bundleId: string;
  path: string;
  expiresAt: Date;
}

/**
 * Create a debug bundle from import artifacts.
 */
export async function createDebugBundle(input: DebugBundleInput): Promise<DebugBundle> {
  const bundleId = randomUUID();
  const bundlePath = path.join(BUNDLE_BASE_PATH, input.workspaceId, bundleId);
  await fs.mkdir(bundlePath, { recursive: true });

  // Write HTML
  await fs.writeFile(path.join(bundlePath, 'source.html'), input.sanitizedHtml, 'utf-8');

  // Write stylesheets
  for (let i = 0; i < input.stylesheets.length; i++) {
    await fs.writeFile(
      path.join(bundlePath, `stylesheet-${i}.css`),
      input.stylesheets[i].content,
      'utf-8',
    );
  }

  // Write screenshots
  for (const [label, buffer] of input.screenshots) {
    await fs.writeFile(path.join(bundlePath, `screenshot-${label}.png`), buffer);
  }

  // Write block JSON
  await fs.writeFile(
    path.join(bundlePath, 'blocks.json'),
    JSON.stringify(input.blockJson, null, 2),
    'utf-8',
  );

  // Write logs
  await fs.writeFile(
    path.join(bundlePath, 'import.log'),
    input.logs.join('\n'),
    'utf-8',
  );

  // Write manifest
  const expiresAt = new Date(Date.now() + DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const manifest = {
    bundleId,
    jobId: input.jobId,
    workspaceId: input.workspaceId,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    charsetInfo: input.charsetInfo,
    warnings: input.warnings,
  };
  await fs.writeFile(
    path.join(bundlePath, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  return { bundleId, path: bundlePath, expiresAt };
}

/**
 * Clean up expired debug bundles.
 */
export async function cleanupExpiredBundles(): Promise<number> {
  let cleaned = 0;
  try {
    const workspaces = await fs.readdir(BUNDLE_BASE_PATH, { withFileTypes: true });
    for (const ws of workspaces) {
      if (!ws.isDirectory()) continue;
      const wsPath = path.join(BUNDLE_BASE_PATH, ws.name);
      const bundles = await fs.readdir(wsPath, { withFileTypes: true });
      for (const bundle of bundles) {
        if (!bundle.isDirectory()) continue;
        const manifestPath = path.join(wsPath, bundle.name, 'manifest.json');
        try {
          const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
          if (new Date(manifest.expiresAt) < new Date()) {
            await fs.rm(path.join(wsPath, bundle.name), { recursive: true, force: true });
            cleaned++;
          }
        } catch {
          // Missing manifest — check directory age
          const stat = await fs.stat(path.join(wsPath, bundle.name));
          if (Date.now() - stat.mtimeMs > DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000) {
            await fs.rm(path.join(wsPath, bundle.name), { recursive: true, force: true });
            cleaned++;
          }
        }
      }
    }
  } catch {
    // Base path may not exist
  }
  return cleaned;
}
