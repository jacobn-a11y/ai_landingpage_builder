/**
 * Render Harness — Headless Chromium render and measurement.
 *
 * Serves sanitized HTML from a local HTTP server with strict network interception,
 * implements readiness protocol, and captures screenshots + DOM snapshots.
 */

import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import type { Browser, Page } from 'puppeteer-core';

const ASSET_BASE_PATH = process.env.ASSET_STORAGE_PATH || './data/assets';

// --- Types ---

export interface RenderViewport {
  width: number;
  height: number;
  label: string; // 'desktop' | 'mobile'
}

export const DEFAULT_VIEWPORTS: RenderViewport[] = [
  { width: 1440, height: 900, label: 'desktop' },
  { width: 375, height: 812, label: 'mobile' },
];

export interface RenderResult {
  viewport: RenderViewport;
  screenshot: Buffer;
  readinessInfo: {
    domContentLoaded: boolean;
    loaded: boolean;
    fontsReady: boolean;
    networkIdle: boolean;
    timeouts: string[];
    readyAt: number;
  };
  blockedRequests: string[];
}

export interface RenderHarnessOptions {
  viewports?: RenderViewport[];
  interactionMode?: 'minimal' | 'scroll' | 'none';
  timeoutMs?: number;
}

// --- Local HTTP Server ---

/**
 * Create a temporary local HTTP server to serve the HTML file and assets.
 * Strict routing: only serves the specific HTML file and workspace assets.
 */
async function createLocalServer(
  htmlPath: string,
  workspaceId: string,
): Promise<{ server: http.Server; port: number; url: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const reqUrl = req.url || '/';

      try {
        if (reqUrl === '/' || reqUrl === '/index.html') {
          // Serve the main HTML file
          const content = await fs.readFile(htmlPath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        } else if (reqUrl.startsWith('/api/v1/assets/')) {
          // Serve assets from the asset store
          const assetPath = reqUrl.replace('/api/v1/assets/', '');
          const fullPath = path.join(ASSET_BASE_PATH, assetPath);

          // Security: prevent directory traversal
          const resolvedPath = path.resolve(fullPath);
          const assetBase = path.resolve(ASSET_BASE_PATH);
          if (!resolvedPath.startsWith(assetBase)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
          }

          try {
            const data = await fs.readFile(resolvedPath);
            const ext = path.extname(resolvedPath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
              '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
              '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
              '.eot': 'application/vnd.ms-fontobject', '.css': 'text/css',
              '.ico': 'image/x-icon', '.avif': 'image/avif',
            };
            res.writeHead(200, {
              'Content-Type': mimeTypes[ext] || 'application/octet-stream',
              'X-Content-Type-Options': 'nosniff',
            });
            res.end(data);
          } catch {
            res.writeHead(404);
            res.end('Not Found');
          }
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } catch (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }
      const port = addr.port;
      const url = `http://127.0.0.1:${port}`;
      resolve({ server, port, url });
    });
  });
}

// --- Readiness Protocol ---

/**
 * Wait for page readiness with timeouts.
 */
async function waitForReadiness(
  page: Page,
  timeoutMs: number,
): Promise<RenderResult['readinessInfo']> {
  const timeouts: string[] = [];
  const startTime = Date.now();

  // DOMContentLoaded and load are already waited for by goto's waitUntil
  let domContentLoaded = true;
  let loaded = true;

  // Wait for fonts
  let fontsReady = false;
  try {
    await page.evaluate(() => document.fonts.ready);
    fontsReady = true;
  } catch {
    timeouts.push('fonts.ready');
  }

  // Wait for network idle (no requests for 500ms)
  let networkIdle = false;
  try {
    await page.waitForNetworkIdle({ idleTime: 500, timeout: Math.min(5000, timeoutMs) });
    networkIdle = true;
  } catch {
    timeouts.push('networkIdle');
  }

  // Pause all animations and transitions
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = '__import_animation_pause';
    style.textContent = `
      *, *::before, *::after {
        animation-play-state: paused !important;
        transition: none !important;
      }
    `;
    document.head.appendChild(style);
  });

  return {
    domContentLoaded,
    loaded,
    fontsReady,
    networkIdle,
    timeouts,
    readyAt: Date.now() - startTime,
  };
}

// --- Interaction ---

/**
 * Perform minimal scroll simulation to trigger lazy-loaded content.
 */
async function performScrollSimulation(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const totalHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const step = viewportHeight;

    // Scroll down incrementally
    for (let y = 0; y < totalHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }

    // Scroll back to top
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });
}

// --- Main Render Function ---

/**
 * Render HTML in headless Chromium and capture screenshots.
 *
 * @param browser - A puppeteer-core Browser instance (caller manages lifecycle)
 * @param htmlPath - Path to the HTML file to render
 * @param workspaceId - Workspace ID for asset serving
 * @param options - Render configuration
 */
export async function renderAndCapture(
  browser: Browser,
  htmlPath: string,
  workspaceId: string,
  options: RenderHarnessOptions = {},
): Promise<RenderResult[]> {
  const viewports = options.viewports || DEFAULT_VIEWPORTS;
  const timeoutMs = options.timeoutMs || 30000;
  const interactionMode = options.interactionMode || 'scroll';

  // Start local server
  const { server, url } = await createLocalServer(htmlPath, workspaceId);

  try {
    const results: RenderResult[] = [];

    for (const viewport of viewports) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();

      try {
        // Set viewport
        await page.setViewport({ width: viewport.width, height: viewport.height });

        // Network interception: block all external requests
        const blockedRequests: string[] = [];
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const reqUrl = req.url();
          if (reqUrl.startsWith(url)) {
            req.continue();
          } else {
            blockedRequests.push(reqUrl);
            req.abort('blockedbyclient');
          }
        });

        // Navigate
        await page.goto(`${url}/index.html`, {
          waitUntil: 'load',
          timeout: timeoutMs,
        });

        // Readiness protocol
        const readinessInfo = await waitForReadiness(page, timeoutMs);

        // Interaction
        if (interactionMode === 'scroll') {
          await performScrollSimulation(page);
        }

        // Capture full-page screenshot
        const screenshot = await page.screenshot({
          fullPage: true,
          type: 'png',
        }) as Buffer;

        results.push({
          viewport,
          screenshot,
          readinessInfo,
          blockedRequests,
        });
      } finally {
        await page.close();
        await context.close();
      }
    }

    return results;
  } finally {
    server.close();
  }
}
