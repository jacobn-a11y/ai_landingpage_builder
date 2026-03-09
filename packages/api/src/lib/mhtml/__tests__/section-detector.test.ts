import { describe, it, expect } from 'vitest';
import { detectSections } from '../section-detector.js';
import type { ElementSnapshot, PageSnapshot } from '../extract-snapshot.js';

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

describe('detectSections', () => {
  it('returns empty array for empty elements', () => {
    const snapshot: PageSnapshot = {
      viewport: { width: 1440, height: 900, label: 'desktop' },
      documentSize: { width: 1440, height: 5000 },
      elements: [],
      rootImportId: 'imp_0',
    };
    expect(detectSections(snapshot)).toEqual([]);
  });

  it('creates single generic section when no visible top-level children', () => {
    const root = makeElement({
      importId: 'imp_0',
      tagName: 'body',
      childImportIds: ['imp_1'],
    });
    const child = makeElement({
      importId: 'imp_1',
      tagName: 'div',
      parentImportId: 'imp_0',
      isVisible: false,
    });
    const snapshot: PageSnapshot = {
      viewport: { width: 1440, height: 900, label: 'desktop' },
      documentSize: { width: 1440, height: 5000 },
      elements: [root, child],
      rootImportId: 'imp_0',
    };
    const sections = detectSections(snapshot);
    expect(sections).toHaveLength(1);
    expect(sections[0].semanticType).toBe('generic');
  });

  it('detects header from <header> landmark', () => {
    const root = makeElement({ importId: 'imp_0', tagName: 'body', childImportIds: ['imp_1', 'imp_2'] });
    const header = makeElement({
      importId: 'imp_1',
      tagName: 'header',
      parentImportId: 'imp_0',
      boundingBox: { x: 0, y: 0, width: 1440, height: 80 },
    });
    const main = makeElement({
      importId: 'imp_2',
      tagName: 'main',
      parentImportId: 'imp_0',
      boundingBox: { x: 0, y: 80, width: 1440, height: 500 },
    });
    const snapshot: PageSnapshot = {
      viewport: { width: 1440, height: 900, label: 'desktop' },
      documentSize: { width: 1440, height: 580 },
      elements: [root, header, main],
      rootImportId: 'imp_0',
    };
    const sections = detectSections(snapshot);
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections[0].semanticType).toBe('header');
  });

  it('detects footer from <footer> landmark', () => {
    const root = makeElement({ importId: 'imp_0', tagName: 'body', childImportIds: ['imp_1', 'imp_2'] });
    const main = makeElement({
      importId: 'imp_1',
      tagName: 'main',
      parentImportId: 'imp_0',
      boundingBox: { x: 0, y: 0, width: 1440, height: 500 },
    });
    const footer = makeElement({
      importId: 'imp_2',
      tagName: 'footer',
      parentImportId: 'imp_0',
      boundingBox: { x: 0, y: 500, width: 1440, height: 100 },
    });
    const snapshot: PageSnapshot = {
      viewport: { width: 1440, height: 900, label: 'desktop' },
      documentSize: { width: 1440, height: 600 },
      elements: [root, main, footer],
      rootImportId: 'imp_0',
    };
    const sections = detectSections(snapshot);
    const footerSection = sections.find((s) => s.semanticType === 'footer');
    expect(footerSection).toBeDefined();
    expect(footerSection!.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('detects FAQ section from dt/dd elements', () => {
    const root = makeElement({ importId: 'imp_0', tagName: 'body', childImportIds: ['imp_1'] });
    const section = makeElement({
      importId: 'imp_1',
      tagName: 'section',
      parentImportId: 'imp_0',
      childImportIds: ['imp_2', 'imp_3'],
      boundingBox: { x: 0, y: 0, width: 1440, height: 400 },
    });
    const dt = makeElement({
      importId: 'imp_2',
      tagName: 'dt',
      parentImportId: 'imp_1',
      textContent: 'What is this?',
    });
    const dd = makeElement({
      importId: 'imp_3',
      tagName: 'dd',
      parentImportId: 'imp_1',
      textContent: 'An answer.',
    });
    const snapshot: PageSnapshot = {
      viewport: { width: 1440, height: 900, label: 'desktop' },
      documentSize: { width: 1440, height: 400 },
      elements: [root, section, dt, dd],
      rootImportId: 'imp_0',
    };
    const sections = detectSections(snapshot);
    expect(sections.some((s) => s.semanticType === 'faq')).toBe(true);
  });
});
