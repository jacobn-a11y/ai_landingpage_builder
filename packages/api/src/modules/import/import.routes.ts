/**
 * Import Routes — MHTML upload endpoint and job status polling.
 */

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { requireAuth, requireMinRole } from '../auth/auth.middleware.js';
import { enqueueImportJob, getJobStatus } from './import.runner.js';

const router = Router();

// Multer config: memory storage, 50MB limit, .mhtml/.mht only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (ext.endsWith('.mhtml') || ext.endsWith('.mht')) {
      cb(null, true);
    } else {
      cb(new Error('Only .mhtml and .mht files are accepted'));
    }
  },
});

/**
 * POST /api/v1/import/mhtml
 * Upload an MHTML file for import.
 */
router.post(
  '/mhtml',
  requireAuth,
  requireMinRole('Editor'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const workspaceId = req.session?.workspaceId;
      const userId = req.session?.userId;
      if (!workspaceId || !userId) {
        res.status(401).json({ error: 'Workspace context required' });
        return;
      }

      const result = await enqueueImportJob({
        fileBuffer: req.file.buffer,
        fileName: req.file.originalname,
        workspaceId,
        userId,
        pageName: req.body.name as string | undefined,
        pageSlug: req.body.slug as string | undefined,
        folderId: req.body.folderId as string | undefined,
        retainSource: req.body.retainSource === 'true',
        force: req.body.force === 'true',
        includeDebugBundle: req.body.includeDebugBundle === 'true',
      });

      res.status(202).json(result);
    } catch (err) {
      if ((err as Error).message?.includes('Only .mhtml')) {
        res.status(400).json({ error: (err as Error).message });
        return;
      }
      if ((err as Error).message?.includes('File too large')) {
        res.status(413).json({ error: 'File exceeds 50MB limit', code: 'IMPORT_FILE_TOO_LARGE' });
        return;
      }
      console.error('[import] Upload error:', err);
      res.status(500).json({ error: 'Import failed' });
    }
  },
);

/**
 * GET /api/v1/import/jobs/:jobId
 * Get import job status. Supports JSON and SSE.
 */
router.get(
  '/jobs/:jobId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = await getJobStatus(jobId);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      // Check if SSE requested
      if (req.headers.accept === 'text/event-stream') {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send current status
        res.write(`data: ${JSON.stringify(job)}\n\n`);

        // Poll for updates if not terminal
        if (job.status !== 'complete' && job.status !== 'failed') {
          const interval = setInterval(async () => {
            const updated = await getJobStatus(jobId);
            if (updated) {
              res.write(`data: ${JSON.stringify(updated)}\n\n`);
              if (updated.status === 'complete' || updated.status === 'failed') {
                clearInterval(interval);
                res.end();
              }
            }
          }, 2000);

          req.on('close', () => {
            clearInterval(interval);
          });
        } else {
          res.end();
        }
        return;
      }

      res.json(job);
    } catch (err) {
      console.error('[import] Status error:', err);
      res.status(500).json({ error: 'Failed to get job status' });
    }
  },
);

/**
 * DELETE /api/v1/import/jobs/:jobId
 * Cancel a queued/processing import job.
 */
router.delete(
  '/jobs/:jobId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = await getJobStatus(jobId);

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      if (job.status === 'complete' || job.status === 'failed') {
        res.status(400).json({ error: 'Job already finished' });
        return;
      }

      // Mark as failed/cancelled
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorCode: 'IMPORT_CANCELLED',
          errorMessage: 'Cancelled by user',
        },
      });

      res.json({ jobId, status: 'cancelled' });
    } catch (err) {
      console.error('[import] Cancel error:', err);
      res.status(500).json({ error: 'Failed to cancel job' });
    }
  },
);

export { router as importRouter };
