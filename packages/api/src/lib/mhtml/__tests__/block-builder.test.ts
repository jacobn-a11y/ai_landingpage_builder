import { describe, it, expect } from 'vitest';
import { buildBlocks } from '../block-builder.js';
import type { ElementSnapshot, PageSnapshot } from '../extract-snapshot.js';
import type { DetectedSection } from '../section-detector.js';

function makeElement(overrides: Partial<ElementSnapshot> & { importId: string; tagName: string }): ElementSnapshot {
  return {
    boundingBox: { x: 0, y: 0, width: 1440, height: 100 },
    computedStyle: { display: 'block' },
    isVisible: true,
    isOverlay: false,
    isFixed: false,
    textContent: '',
    childImportIds: [],
    attributes: {},
    parentImportId: null,
    depth: 0,
    ...overrides,
  };
}

describe('buildBlocks', () => {
  it('creates a page with root block and section blocks', () => {
    const root = makeElement({ importId: 'imp_0', tagName: 'body', childImportIds: ['imp_1'] });
    const sectionEl = makeElement({
      importId: 'imp_1',
      tagName: 'section',
      parentImportId: 'imp_0',
      childImportIds: ['imp_2'],
      boundingBox: { x: 0, y: 0, width: 1440, height: 300 },
    });
    const heading = makeElement({
      importId: 'imp_2',
      tagName: 'h1',
      parentImportId: 'imp_1',
      textContent: 'Welcome to our site',
      computedStyle: { display: 'block', fontSize: '32px' },
    });

    const snapshot: PageSnapshot = {
      viewport: { width: 1440, height: 900, label: 'desktop' },
      documentSize: { width: 1440, height: 300 },
      elements: [root, sectionEl, heading],
      rootImportId: 'imp_0',
    };

    const sections: DetectedSection[] = [{
      elements: [sectionEl, heading],
      rootElement: sectionEl,
      semanticType: 'hero',
      confidence: 0.8,
      bounds: { x: 0, y: 0, width: 1440, height: 300 },
    }];

    const result = buildBlocks(snapshot, sections);

    expect(result.content).toBeDefined();
    expect(result.content.root).toBeDefined();
    expect(result.content.blocks).toBeDefined();
    expect(Object.keys(result.content.blocks!).length).toBeGreaterThan(0);
    expect(result.stats).toBeDefined();
    expect(result.stats.blocksCreated).toBeGreaterThan(0);
  });

  it('includes import metadata in blocks', () => {
    const root = makeElement({ importId: 'imp_0', tagName: 'body', childImportIds: ['imp_1'] });
    const div = makeElement({
      importId: 'imp_1',
      tagName: 'div',
      parentImportId: 'imp_0',
      childImportIds: ['imp_2'],
    });
    const p = makeElement({
      importId: 'imp_2',
      tagName: 'p',
      parentImportId: 'imp_1',
      textContent: 'Hello world',
    });

    const snapshot: PageSnapshot = {
      viewport: { width: 1440, height: 900, label: 'desktop' },
      documentSize: { width: 1440, height: 200 },
      elements: [root, div, p],
      rootImportId: 'imp_0',
    };

    const sections: DetectedSection[] = [{
      elements: [div, p],
      rootElement: div,
      semanticType: 'generic',
      confidence: 0.3,
      bounds: { x: 0, y: 0, width: 1440, height: 200 },
    }];

    const result = buildBlocks(snapshot, sections);
    const blocks = result.content.blocks!;
    const blockValues = Object.values(blocks);

    // Find a block with _importMeta
    const importedBlock = blockValues.find((b) => (b.props as any)?._importMeta);
    expect(importedBlock).toBeDefined();
    expect((importedBlock!.props as any)._importMeta.tier).toBeDefined();
  });

  it('returns stats with tier distribution', () => {
    const root = makeElement({ importId: 'imp_0', tagName: 'body', childImportIds: ['imp_1'] });
    const section = makeElement({
      importId: 'imp_1',
      tagName: 'section',
      parentImportId: 'imp_0',
      childImportIds: [],
    });

    const snapshot: PageSnapshot = {
      viewport: { width: 1440, height: 900, label: 'desktop' },
      documentSize: { width: 1440, height: 100 },
      elements: [root, section],
      rootImportId: 'imp_0',
    };

    const sections: DetectedSection[] = [{
      elements: [section],
      rootElement: section,
      semanticType: 'generic',
      confidence: 0.3,
      bounds: { x: 0, y: 0, width: 1440, height: 100 },
    }];

    const result = buildBlocks(snapshot, sections);
    expect(result.stats).toHaveProperty('blocksCreated');
    expect(result.stats).toHaveProperty('tierA');
    expect(result.stats).toHaveProperty('sectionsDetected');
  });
});
