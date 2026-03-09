import { describe, it, expect } from 'vitest';
import { buildPageSummary } from '../page-context';
import { buildSectionMap } from '../section-map';
import { summarizeBlock, summarizeTree } from '../block-summary';
import type { EditorContentJson, EditorBlock } from '../../pages/editor/types';

// ---------------------------------------------------------------------------
// Test fixture: a realistic 3-section page
// ---------------------------------------------------------------------------
function makeTestPage(): EditorContentJson {
  const blocks: Record<string, EditorBlock> = {
    root: {
      id: 'root',
      type: 'section',
      children: ['hero_1', 'features_1', 'section_3'],
    },
    hero_1: {
      id: 'hero_1',
      type: 'hero',
      children: ['headline_1', 'para_1', 'btn_1', 'img_1'],
    },
    headline_1: {
      id: 'headline_1',
      type: 'headline',
      props: {
        text: 'Welcome to Our Amazing Product',
        fontSize: 48,
        fontWeight: 'bold',
        tag: 'h1',
        textColor: '#1F2937',
        fontFamily: 'Inter',
      },
    },
    para_1: {
      id: 'para_1',
      type: 'paragraph',
      props: {
        text: 'The best solution for your business needs. Start your free trial today and see the difference.',
        textColor: '#6B7280',
        fontFamily: 'Open Sans',
      },
    },
    btn_1: {
      id: 'btn_1',
      type: 'button',
      props: {
        text: 'Get Started',
        backgroundColor: '#3B82F6',
        buttonBgColor: '#3B82F6',
        textColor: '#FFFFFF',
        fontFamily: 'Inter',
      },
    },
    img_1: {
      id: 'img_1',
      type: 'image',
      props: { src: 'https://example.com/hero.jpg', alt: 'Hero image' },
    },
    features_1: {
      id: 'features_1',
      type: 'features',
      children: ['headline_2', 'grid_1'],
    },
    headline_2: {
      id: 'headline_2',
      type: 'headline',
      props: {
        text: 'Our Features',
        fontSize: 32,
        tag: 'h2',
        textColor: '#1F2937',
        fontFamily: 'Inter',
      },
    },
    grid_1: {
      id: 'grid_1',
      type: 'grid',
      children: ['para_2', 'para_3'],
    },
    para_2: {
      id: 'para_2',
      type: 'paragraph',
      props: { text: 'Feature one description here' },
    },
    para_3: {
      id: 'para_3',
      type: 'paragraph',
      props: { text: 'Feature two description here' },
    },
    section_3: {
      id: 'section_3',
      type: 'section',
      children: ['form_1'],
    },
    form_1: {
      id: 'form_1',
      type: 'form',
      props: { backgroundColor: '#F3F4F6' },
    },
  };

  return { root: 'root', blocks, layoutMode: 'fluid' };
}

// ---------------------------------------------------------------------------
// buildPageSummary
// ---------------------------------------------------------------------------
describe('buildPageSummary', () => {
  it('counts sections (root children)', () => {
    const summary = buildPageSummary(makeTestPage());
    expect(summary.sectionCount).toBe(3);
  });

  it('counts all blocks', () => {
    const summary = buildPageSummary(makeTestPage());
    // 13 blocks total (including root)
    expect(summary.blockCount).toBe(13);
  });

  it('counts blocks by type', () => {
    const summary = buildPageSummary(makeTestPage());
    expect(summary.blockCountByType.headline).toBe(2);
    expect(summary.blockCountByType.paragraph).toBe(3);
    expect(summary.blockCountByType.button).toBe(1);
    expect(summary.blockCountByType.image).toBe(1);
    expect(summary.blockCountByType.form).toBe(1);
  });

  it('extracts unique colors', () => {
    const summary = buildPageSummary(makeTestPage());
    expect(summary.colorPalette).toContain('#1F2937');
    expect(summary.colorPalette).toContain('#3B82F6');
    expect(summary.colorPalette).toContain('#FFFFFF');
    expect(summary.colorPalette).toContain('#6B7280');
    expect(summary.colorPalette).toContain('#F3F4F6');
  });

  it('extracts unique font families', () => {
    const summary = buildPageSummary(makeTestPage());
    expect(summary.fontFamilies).toContain('Inter');
    expect(summary.fontFamilies).toContain('Open Sans');
    expect(summary.fontFamilies.length).toBe(2);
  });

  it('counts images with src', () => {
    const summary = buildPageSummary(makeTestPage());
    expect(summary.imageCount).toBe(1);
  });

  it('detects forms', () => {
    const summary = buildPageSummary(makeTestPage());
    expect(summary.hasForm).toBe(true);
  });

  it('reports layoutMode', () => {
    const summary = buildPageSummary(makeTestPage());
    expect(summary.layoutMode).toBe('fluid');
  });

  it('collects text snippets truncated to 100 chars', () => {
    const summary = buildPageSummary(makeTestPage());
    expect(summary.textSnippets.length).toBeGreaterThanOrEqual(4);
    const headline = summary.textSnippets.find((s) => s.blockId === 'headline_1');
    expect(headline?.text).toBe('Welcome to Our Amazing Product');
    const btn = summary.textSnippets.find((s) => s.blockId === 'btn_1');
    expect(btn?.text).toBe('Get Started');
    for (const snippet of summary.textSnippets) {
      expect(snippet.text.length).toBeLessThanOrEqual(100);
    }
  });

  it('handles empty content', () => {
    const summary = buildPageSummary({ root: '', blocks: {} });
    expect(summary.sectionCount).toBe(0);
    expect(summary.blockCount).toBe(0);
    expect(summary.colorPalette).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildSectionMap
// ---------------------------------------------------------------------------
describe('buildSectionMap', () => {
  it('returns one entry per top-level section', () => {
    const map = buildSectionMap(makeTestPage());
    expect(map.length).toBe(3);
  });

  it('assigns correct ordinal indices', () => {
    const map = buildSectionMap(makeTestPage());
    expect(map[0].index).toBe(0);
    expect(map[1].index).toBe(1);
    expect(map[2].index).toBe(2);
  });

  it('labels pattern blocks with readable names', () => {
    const map = buildSectionMap(makeTestPage());
    expect(map[0].label).toBe('Hero Section');
    expect(map[1].label).toBe('Features Section');
  });

  it('labels generic sections with ordinal', () => {
    const map = buildSectionMap(makeTestPage());
    expect(map[2].label).toBe('Section 3');
  });

  it('records block types', () => {
    const map = buildSectionMap(makeTestPage());
    expect(map[0].type).toBe('hero');
    expect(map[1].type).toBe('features');
    expect(map[2].type).toBe('section');
  });

  it('counts descendants', () => {
    const map = buildSectionMap(makeTestPage());
    // hero_1 + headline_1 + para_1 + btn_1 + img_1 = 5
    expect(map[0].blockCount).toBe(5);
  });

  it('collects child types', () => {
    const map = buildSectionMap(makeTestPage());
    expect(map[0].childTypes).toEqual(['headline', 'paragraph', 'button', 'image']);
  });

  it('collects text snippets (max 50 chars)', () => {
    const map = buildSectionMap(makeTestPage());
    expect(map[0].textSnippets).toContain('Welcome to Our Amazing Product');
    expect(map[0].textSnippets).toContain('Get Started');
    for (const snippet of map[0].textSnippets) {
      expect(snippet.length).toBeLessThanOrEqual(50);
    }
  });

  it('handles missing root', () => {
    const map = buildSectionMap({ root: '', blocks: {} });
    expect(map).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// summarizeBlock / summarizeTree
// ---------------------------------------------------------------------------
describe('summarizeBlock', () => {
  it('produces one-line summary with type, id, text, and props', () => {
    const block: EditorBlock = {
      id: 'b_123',
      type: 'headline',
      props: { text: 'Welcome to Our Site', fontSize: 32, tag: 'h1', fontWeight: 'bold' },
    };
    const line = summarizeBlock(block, 0);
    expect(line).toContain('headline#b_123');
    expect(line).toContain("'Welcome to Our Site'");
    expect(line).toContain('32px');
    expect(line).toContain('h1');
    expect(line).toContain('bold');
  });

  it('indents based on depth', () => {
    const block: EditorBlock = { id: 'x', type: 'paragraph', props: { text: 'Hi' } };
    const line = summarizeBlock(block, 3);
    expect(line.startsWith('      ')).toBe(true); // 6 spaces = 3 * 2
  });

  it('shows locked/hidden meta', () => {
    const block: EditorBlock = { id: 'x', type: 'spacer', meta: { locked: true, hidden: true } };
    const line = summarizeBlock(block, 0);
    expect(line).toContain('locked');
    expect(line).toContain('hidden');
  });
});

describe('summarizeTree', () => {
  it('produces a multi-line indented tree', () => {
    const tree = summarizeTree(makeTestPage());
    const lines = tree.split('\n');
    expect(lines.length).toBeGreaterThan(5);
    // Root at depth 0
    expect(lines[0]).toMatch(/^section#root/);
    // hero at depth 1
    expect(lines[1]).toMatch(/^\s{2}hero#hero_1/);
  });

  it('handles empty content', () => {
    const tree = summarizeTree({ root: '', blocks: {} });
    expect(tree).toBe('');
  });
});
