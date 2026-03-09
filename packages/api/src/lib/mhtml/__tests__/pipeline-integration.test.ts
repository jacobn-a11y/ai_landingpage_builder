/**
 * Integration test: run the full MHTML pipeline against a real MHTML file.
 * Uses the Vitally landing page MHTML from the repo.
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { unpackMhtml } from '../mhtml-unpacker.js';
import { detectSections } from '../section-detector.js';
import { buildBlocks } from '../block-builder.js';
import type { ElementSnapshot, PageSnapshot } from '../extract-snapshot.js';

const MHTML_PATH = '/tmp/test-vitally.mhtml';

// Helper: build DOM snapshot from linkedom (same as import.runner.ts)
function buildDomSnapshot(body: any): { elements: ElementSnapshot[]; rootImportId: string } {
  const elements: ElementSnapshot[] = [];
  let idCounter = 0;

  function traverse(node: any, parentId: string | null, depth: number): string | null {
    if (!node || depth > 50) return null;
    if (node.nodeType !== 1) return null;

    const id = `imp_${idCounter++}`;
    const tagName = (node.tagName || '').toLowerCase();
    const childIds: string[] = [];

    let textContent = '';
    for (const child of node.childNodes || []) {
      if (child.nodeType === 3) {
        textContent += child.textContent || '';
      }
    }

    for (const child of node.children || []) {
      const childId = traverse(child, id, depth + 1);
      if (childId) childIds.push(childId);
    }

    const attributes: Record<string, string> = {};
    for (const attr of node.attributes || []) {
      attributes[attr.name] = attr.value;
    }

    const style = node.getAttribute?.('style') || '';
    const computedStyle = parseInlineStyle(style);
    computedStyle.display = computedStyle.display || 'block';

    elements.push({
      importId: id,
      tagName,
      boundingBox: { x: 0, y: elements.length * 100, width: 1440, height: 100 },
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

  const rootId = traverse(body, null, 0) || 'imp_0';
  return { elements, rootImportId: rootId };
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

describe('Vitally MHTML pipeline integration', () => {
  it('unpacks the MHTML file successfully', async () => {
    const fileBuffer = await fs.readFile(MHTML_PATH);
    const mhtmlContent = fileBuffer.toString('binary');

    const unpacked = await unpackMhtml(mhtmlContent, 'test-workspace');

    expect(unpacked.html).toBeTruthy();
    expect(unpacked.html.length).toBeGreaterThan(1000);
    expect(unpacked.metadata.title).toBeTruthy();

    console.log('=== UNPACK RESULTS ===');
    console.log(`HTML length: ${unpacked.html.length}`);
    console.log(`Title: ${unpacked.metadata.title}`);
    console.log(`Stylesheets: ${unpacked.stylesheets.length}`);
    console.log(`Assets: ${unpacked.assets.length}`);
    console.log(`Warnings: ${unpacked.warnings.length}`);
    if (unpacked.warnings.length > 0) {
      console.log('Warnings:', unpacked.warnings.slice(0, 10));
    }
  }, 30000);

  it('detects sections from unpacked HTML', async () => {
    const fileBuffer = await fs.readFile(MHTML_PATH);
    const mhtmlContent = fileBuffer.toString('binary');
    const unpacked = await unpackMhtml(mhtmlContent, 'test-workspace');

    // Inject stylesheets into HTML
    let fullHtml = unpacked.html;
    const styleInjection = unpacked.stylesheets
      .map((s) => `<style>${s.content}</style>`)
      .join('\n');
    fullHtml = fullHtml.replace('</head>', `${styleInjection}\n</head>`);

    // Parse with linkedom
    const { parseHTML } = await import('linkedom');
    const { document } = parseHTML(fullHtml);
    const { elements, rootImportId } = buildDomSnapshot(document.body);

    expect(elements.length).toBeGreaterThan(0);

    const pageSnapshot: PageSnapshot = {
      viewport: { width: 1440, height: 900, label: 'desktop' },
      documentSize: { width: 1440, height: 5000 },
      elements,
      rootImportId,
    };

    const sections = detectSections(pageSnapshot);

    expect(sections.length).toBeGreaterThan(0);

    console.log('=== SECTION DETECTION ===');
    console.log(`Total elements: ${elements.length}`);
    console.log(`Sections detected: ${sections.length}`);
    for (const s of sections) {
      console.log(`  - ${s.semanticType} (confidence: ${s.confidence.toFixed(2)}, elements: ${s.elements.length})`);
    }
  }, 30000);

  it('builds blocks from the full pipeline', async () => {
    const fileBuffer = await fs.readFile(MHTML_PATH);
    const mhtmlContent = fileBuffer.toString('binary');
    const unpacked = await unpackMhtml(mhtmlContent, 'test-workspace');

    let fullHtml = unpacked.html;
    const styleInjection = unpacked.stylesheets
      .map((s) => `<style>${s.content}</style>`)
      .join('\n');
    fullHtml = fullHtml.replace('</head>', `${styleInjection}\n</head>`);

    const { parseHTML } = await import('linkedom');
    const { document } = parseHTML(fullHtml);
    const { elements, rootImportId } = buildDomSnapshot(document.body);

    const pageSnapshot: PageSnapshot = {
      viewport: { width: 1440, height: 900, label: 'desktop' },
      documentSize: { width: 1440, height: 5000 },
      elements,
      rootImportId,
    };

    const sections = detectSections(pageSnapshot);
    const result = buildBlocks(pageSnapshot, sections);

    expect(result.content).toBeDefined();
    expect(result.content.root).toBeTruthy();
    expect(result.content.blocks).toBeDefined();

    const blockCount = Object.keys(result.content.blocks).length;
    expect(blockCount).toBeGreaterThan(0);

    console.log('=== BLOCK BUILD RESULTS ===');
    console.log(`Root block: ${result.content.root}`);
    console.log(`Total blocks: ${blockCount}`);
    console.log(`Stats:`, JSON.stringify(result.stats, null, 2));
    console.log(`Scoped styles: ${result.scopedStyles.length}`);

    // Check tier distribution
    const blocks = Object.values(result.content.blocks);
    const tiers: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, none: 0 };
    for (const block of blocks) {
      const meta = (block.props as any)?._importMeta;
      if (meta?.tier) {
        tiers[meta.tier] = (tiers[meta.tier] || 0) + 1;
      } else {
        tiers.none++;
      }
    }
    console.log('Tier distribution:', tiers);

    // Check block types
    const types: Record<string, number> = {};
    for (const block of blocks) {
      types[block.type] = (types[block.type] || 0) + 1;
    }
    console.log('Block types:', types);

    // Verify no empty blocks
    expect(blockCount).toBeGreaterThan(1); // At least root + some children

    // Verify scoped styles reference valid scope IDs
    for (const style of result.scopedStyles) {
      expect(style.scopeId).toMatch(/^is_/);
      expect(style.cssText.length).toBeGreaterThan(0);
    }
  }, 60000);
});
