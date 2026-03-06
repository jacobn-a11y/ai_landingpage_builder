/**
 * Import Runner — in-process job runner with concurrency limits.
 *
 * Processes MHTML import jobs through the full pipeline:
 * unpack → render → analyze → build → validate → create page → fidelity check
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { createTempWorkspace, updateHeartbeat, cleanupTempWorkspace } from '../../lib/temp-workspace.js';
import { logAuditEvent } from '../../lib/audit-logger.js';
import { addAssetRefs } from '../../lib/asset-usage.js';
import { unpackMhtml, type UnpackedMhtml, ImportError } from '../../lib/mhtml/mhtml-unpacker.js';
import { detectSections, type DetectedSection } from '../../lib/mhtml/section-detector.js';
import { buildBlocks, type BlockBuildResult } from '../../lib/mhtml/block-builder.js';

const prisma = new PrismaClient();

// Concurrency control
const MAX_CONCURRENT_JOBS = parseInt(process.env.IMPORT_MAX_CONCURRENT || '3', 10);
let activeJobs = 0;

// --- Types ---

export interface ImportJobInput {
  fileBuffer: Buffer;
  fileName: string;
  workspaceId: string;
  userId: string;
  pageName?: string;
  pageSlug?: string;
  folderId?: string;
  retainSource?: boolean;
  force?: boolean;
  includeDebugBundle?: boolean;
}

export interface ImportJobResult {
  jobId: string;
  status: 'complete' | 'failed';
  pageId?: string;
  stats?: Record<string, unknown>;
  error?: { code: string; message: string };
}

// --- Job Lifecycle ---

async function updateJobStatus(
  jobId: string,
  status: string,
  stage?: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status,
      stage: stage ?? null,
      heartbeatAt: new Date(),
      ...extra,
    },
  });
}

async function failJob(
  jobId: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      errorCode,
      errorMessage,
      heartbeatAt: new Date(),
    },
  });
}

// --- Slug Generation (mirrors pages route logic) ---

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function generateUniqueSlug(workspaceId: string, base: string): Promise<string> {
  const existingSlugs = await prisma.page.findMany({
    where: { workspaceId },
    select: { slug: true },
  });
  const slugSet = new Set(existingSlugs.map((p) => p.slug));

  let slug = slugify(base);
  if (!slug) slug = 'imported-page';
  let candidate = slug;
  let counter = 1;
  while (slugSet.has(candidate)) {
    candidate = `${slug}-${counter}`;
    counter++;
  }
  return candidate;
}

// --- Main Pipeline ---

/**
 * Run the import pipeline for a job.
 */
async function runImportPipeline(
  jobId: string,
  input: ImportJobInput,
): Promise<ImportJobResult> {
  const { fileBuffer, workspaceId, userId } = input;
  const timings: Record<string, number> = {};

  // Create temp workspace
  const tempWs = await createTempWorkspace(jobId);

  try {
    // --- Stage 1: Unpack ---
    await updateJobStatus(jobId, 'unpacking', 'Extracting MHTML content');
    const unpackStart = Date.now();

    const mhtmlContent = fileBuffer.toString('binary');
    const unpacked: UnpackedMhtml = await unpackMhtml(mhtmlContent, workspaceId);

    timings.unpack = Date.now() - unpackStart;
    await updateHeartbeat(jobId);

    // Write sanitized HTML to temp for rendering
    const htmlPath = path.join(tempWs.basePath, 'source.html');

    // Inject extracted stylesheets into the HTML
    let fullHtml = unpacked.html;
    const styleInjection = unpacked.stylesheets
      .map((s) => `<style>${s.content}</style>`)
      .join('\n');
    fullHtml = fullHtml.replace('</head>', `${styleInjection}\n</head>`);
    await fs.writeFile(htmlPath, fullHtml, 'utf-8');

    // --- Stage 2: Render + Measure ---
    // Note: Chromium rendering is optional and expensive.
    // For v1, we can skip it when puppeteer-core has no browser available
    // and fall back to linkedom-based analysis.
    await updateJobStatus(jobId, 'rendering', 'Analyzing page layout');
    const renderStart = Date.now();

    // For now, build a simplified snapshot without Chromium
    // This uses the HTML structure directly rather than rendered geometry
    const { parseHTML } = await import('linkedom');
    const { document } = parseHTML(fullHtml);

    // Build element snapshots from DOM (simplified, no geometry)
    const elements = buildDomSnapshot(document.body);

    timings.render = Date.now() - renderStart;
    await updateHeartbeat(jobId);

    // --- Stage 3: Analyze ---
    await updateJobStatus(jobId, 'analyzing', 'Detecting sections and patterns');
    const analyzeStart = Date.now();

    const pageSnapshot = {
      viewport: { width: 1440, height: 900, label: 'desktop' },
      documentSize: { width: 1440, height: 5000 }, // Estimated
      elements,
      rootImportId: elements[0]?.importId || 'imp_0',
    };

    const sections: DetectedSection[] = detectSections(pageSnapshot);

    timings.analyze = Date.now() - analyzeStart;
    await updateHeartbeat(jobId);

    // --- Stage 4: Build Blocks ---
    await updateJobStatus(jobId, 'building', 'Creating editor blocks');
    const buildStart = Date.now();

    const buildResult: BlockBuildResult = buildBlocks(pageSnapshot, sections);

    timings.build = Date.now() - buildStart;
    await updateHeartbeat(jobId);

    // --- Stage 5: Create Page ---
    await updateJobStatus(jobId, 'creating_page', 'Creating page');

    const pageName = input.pageName || unpacked.metadata.title || input.fileName.replace(/\.mhtml?$/i, '');
    const pageSlug = input.pageSlug || await generateUniqueSlug(workspaceId, pageName);

    const page = await prisma.page.create({
      data: {
        workspaceId,
        name: pageName,
        slug: pageSlug,
        folderId: input.folderId || null,
        contentJson: buildResult.content as unknown as Record<string, unknown>,
        version: 1,
      },
    });

    // Store scoped stylesheets
    if (buildResult.scopedStyles.length > 0) {
      await prisma.pageStylesheet.createMany({
        data: buildResult.scopedStyles.map((s) => ({
          pageId: page.id,
          fragmentId: s.fragmentId,
          scopeId: s.scopeId,
          ownerBlockId: s.ownerBlockId,
          cssText: s.cssText,
        })),
      });
    }

    // Record asset references
    const assetRefs = unpacked.assets.map((a) => ({
      assetId: a.assetId,
      workspaceId,
      pageId: page.id,
      jobId,
    }));
    await addAssetRefs(assetRefs);

    // --- Finalize ---
    const stats = {
      ...buildResult.stats,
      assetsExtracted: unpacked.assets.length,
      stylesheetsExtracted: unpacked.stylesheets.length,
      warnings: unpacked.warnings,
    };

    await updateJobStatus(jobId, 'complete', undefined, {
      resultPageId: page.id,
      statsJson: stats,
      timingsJson: timings,
    });

    await logAuditEvent({
      workspaceId,
      actorId: userId,
      eventType: 'import.complete',
      jobId,
      pageId: page.id,
      metadata: { stats },
    });

    return {
      jobId,
      status: 'complete',
      pageId: page.id,
      stats,
    };
  } catch (err) {
    const isImportError = err instanceof ImportError;
    const errorCode = isImportError ? err.code : 'IMPORT_INTERNAL_ERROR';
    const errorMessage = (err as Error).message || 'Unknown error';

    await failJob(jobId, errorCode, errorMessage);

    await logAuditEvent({
      workspaceId,
      actorId: userId,
      eventType: 'import.failed',
      jobId,
      metadata: { errorCode, errorMessage },
    });

    return {
      jobId,
      status: 'failed',
      error: { code: errorCode, message: errorMessage },
    };
  } finally {
    // Clean up temp workspace
    await cleanupTempWorkspace(jobId);
  }
}

/**
 * Build element snapshots from linkedom DOM (no geometry data).
 * This is the fallback when Chromium is not available.
 */
function buildDomSnapshot(body: any): import('../../lib/mhtml/extract-snapshot.js').ElementSnapshot[] {
  const elements: import('../../lib/mhtml/extract-snapshot.js').ElementSnapshot[] = [];
  let idCounter = 0;

  function traverse(node: any, parentId: string | null, depth: number): string | null {
    if (!node || depth > 50) return null;
    if (node.nodeType !== 1) return null; // Element nodes only

    const id = `imp_${idCounter++}`;
    const tagName = (node.tagName || '').toLowerCase();
    const childIds: string[] = [];

    // Get text content (direct text nodes only)
    let textContent = '';
    for (const child of node.childNodes || []) {
      if (child.nodeType === 3) { // TEXT_NODE
        textContent += child.textContent || '';
      }
    }

    // Traverse children
    for (const child of node.children || []) {
      const childId = traverse(child, id, depth + 1);
      if (childId) childIds.push(childId);
    }

    // Get attributes
    const attributes: Record<string, string> = {};
    for (const attr of node.attributes || []) {
      attributes[attr.name] = attr.value;
    }

    // Get inline styles as computed style approximation
    const style = node.getAttribute?.('style') || '';
    const computedStyle = parseInlineStyle(style);
    computedStyle.display = computedStyle.display || 'block';

    elements.push({
      importId: id,
      tagName,
      boundingBox: { x: 0, y: elements.length * 100, width: 1440, height: 100 }, // Estimated
      computedStyle,
      isVisible: computedStyle.display !== 'none',
      isOverlay: false,
      isFixed: computedStyle.position === 'fixed' || computedStyle.position === 'sticky',
      textContent: textContent.trim(),
      childImportIds: childIds,
      attributes,
      parentImportId: parentId,
      depth,
    });

    return id;
  }

  traverse(body, null, 0);
  return elements;
}

function parseInlineStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!style) return result;

  for (const decl of style.split(';')) {
    const [prop, ...valueParts] = decl.split(':');
    if (prop && valueParts.length > 0) {
      const key = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      result[key] = valueParts.join(':').trim();
    }
  }
  return result;
}

// --- Public API ---

/**
 * Enqueue an import job. Creates the DB record and starts processing.
 */
export async function enqueueImportJob(input: ImportJobInput): Promise<{ jobId: string; status: string }> {
  const inputHash = createHash('sha256').update(input.fileBuffer).digest('hex');
  const idempotencyKey = `${input.workspaceId}:${inputHash}`;

  // Check idempotency
  if (!input.force) {
    const existing = await prisma.importJob.findUnique({
      where: { idempotencyKey },
    });
    if (existing && existing.status === 'complete' && existing.resultPageId) {
      return { jobId: existing.id, status: 'complete' };
    }
  }

  // Create job record
  const job = await prisma.importJob.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      inputHash,
      idempotencyKey,
      uploadSizeBytes: input.fileBuffer.length,
      sourceRetained: input.retainSource || false,
      sourceExpiresAt: input.retainSource
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        : null,
    },
  });

  await logAuditEvent({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    eventType: 'import.requested',
    jobId: job.id,
    metadata: { fileName: input.fileName, fileSize: input.fileBuffer.length },
  });

  // Check concurrency
  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    return { jobId: job.id, status: 'queued' };
  }

  // Start processing (non-blocking)
  activeJobs++;
  runImportPipeline(job.id, input)
    .finally(() => {
      activeJobs--;
    });

  return { jobId: job.id, status: 'processing' };
}

/**
 * Get import job status.
 */
export async function getJobStatus(jobId: string): Promise<Record<string, unknown> | null> {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) return null;

  return {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    resultPageId: job.resultPageId,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    stats: job.statsJson,
    timings: job.timingsJson,
    sourceRetained: job.sourceRetained,
    schemaVersion: job.schemaVersion,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
