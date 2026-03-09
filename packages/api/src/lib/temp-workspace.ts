/**
 * Temporary working directory management for import jobs.
 * Each job gets an isolated temp dir that is cleaned up after completion.
 */

import { promises as fs } from 'fs';
import path from 'path';

const TEMP_BASE_PATH = process.env.TEMP_STORAGE_PATH || './data/tmp';
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export interface TempWorkspace {
  jobId: string;
  basePath: string;
}

/**
 * Create a temporary workspace directory for a job.
 */
export async function createTempWorkspace(jobId: string): Promise<TempWorkspace> {
  const basePath = path.join(TEMP_BASE_PATH, jobId);
  await fs.mkdir(basePath, { recursive: true });

  // Write a heartbeat file
  await fs.writeFile(path.join(basePath, '.heartbeat'), Date.now().toString());

  return { jobId, basePath };
}

/**
 * Update the heartbeat for a temp workspace.
 */
export async function updateHeartbeat(jobId: string): Promise<void> {
  const heartbeatPath = path.join(TEMP_BASE_PATH, jobId, '.heartbeat');
  await fs.writeFile(heartbeatPath, Date.now().toString());
}

/**
 * Clean up a temp workspace.
 */
export async function cleanupTempWorkspace(jobId: string): Promise<void> {
  const basePath = path.join(TEMP_BASE_PATH, jobId);
  try {
    await fs.rm(basePath, { recursive: true, force: true });
  } catch {
    // Already cleaned or doesn't exist
  }
}

/**
 * Sweep stale temp directories that have no recent heartbeat.
 */
export async function sweepStaleTempDirs(): Promise<number> {
  let cleaned = 0;
  try {
    const entries = await fs.readdir(TEMP_BASE_PATH, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const heartbeatPath = path.join(TEMP_BASE_PATH, entry.name, '.heartbeat');
      try {
        const content = await fs.readFile(heartbeatPath, 'utf-8');
        const lastHeartbeat = parseInt(content, 10);
        if (now - lastHeartbeat > STALE_THRESHOLD_MS) {
          await fs.rm(path.join(TEMP_BASE_PATH, entry.name), { recursive: true, force: true });
          cleaned++;
        }
      } catch {
        // No heartbeat file — check directory age
        const stat = await fs.stat(path.join(TEMP_BASE_PATH, entry.name));
        if (now - stat.mtimeMs > STALE_THRESHOLD_MS) {
          await fs.rm(path.join(TEMP_BASE_PATH, entry.name), { recursive: true, force: true });
          cleaned++;
        }
      }
    }
  } catch {
    // Temp base may not exist yet
  }
  return cleaned;
}

/**
 * Start periodic sweep (call at app startup).
 */
export function startTempSweeper(intervalMs = 15 * 60 * 1000): NodeJS.Timeout {
  // Sweep immediately on startup
  sweepStaleTempDirs().catch(console.error);
  return setInterval(() => {
    sweepStaleTempDirs().catch(console.error);
  }, intervalMs);
}
