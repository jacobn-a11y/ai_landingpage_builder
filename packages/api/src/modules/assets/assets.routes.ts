/**
 * Asset Routes — serves content-addressed assets with security hardening.
 */

import { Router, type Request, type Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';

const router = Router();
const ASSET_BASE_PATH = process.env.ASSET_STORAGE_PATH || './data/assets';

/**
 * GET /api/v1/assets/:workspaceId/:filename
 * Serve a stored asset with security headers.
 */
router.get('/:workspaceId/:filename', async (req: Request, res: Response) => {
  try {
    const { workspaceId, filename } = req.params;

    // Validate filename format (hash.ext only, no path traversal)
    if (!/^[a-f0-9]{64}\.[a-z0-9]+$/i.test(filename)) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    const filePath = path.join(ASSET_BASE_PATH, workspaceId, filename);

    // Prevent directory traversal
    const resolved = path.resolve(filePath);
    const base = path.resolve(ASSET_BASE_PATH);
    if (!resolved.startsWith(base)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Check file exists
    try {
      await fs.access(filePath);
    } catch {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    // Determine content type from extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = mime.lookup(ext) || 'application/octet-stream';

    // Security: never serve HTML from asset endpoint
    if (contentType === 'text/html' || contentType === 'application/xhtml+xml') {
      contentType = 'text/plain';
    }

    // Read and serve
    const data = await fs.readFile(filePath);

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', data.length.toString());

    // Extra SVG hardening
    if (contentType === 'image/svg+xml') {
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'");
    }

    res.send(data);
  } catch (err) {
    console.error('[assets] Serve error:', err);
    res.status(500).json({ error: 'Failed to serve asset' });
  }
});

export { router as assetsRouter };
