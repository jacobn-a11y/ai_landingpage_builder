/**
 * Page Context Service — Block 6
 *
 * Builds a compact summary of the current page so the AI layer
 * can reason about it without scanning every block.
 */

import type { EditorContentJson, EditorBlock } from '../pages/editor/types';

export interface PageSummary {
  sectionCount: number;
  blockCount: number;
  blockCountByType: Record<string, number>;
  colorPalette: string[];
  fontFamilies: string[];
  imageCount: number;
  hasForm: boolean;
  layoutMode: 'fluid' | 'canvas';
  textSnippets: { blockId: string; type: string; text: string }[];
}

const TEXT_BLOCK_TYPES = new Set(['headline', 'paragraph', 'text', 'button']);

const COLOR_PROPS = [
  'backgroundColor',
  'textColor',
  'buttonBgColor',
  'color',
  'borderColor',
  'buttonTextColor',
] as const;

const FONT_PROPS = [
  'fontFamily',
  'titleFontFamily',
  'headlineFontFamily',
  'paragraphFontFamily',
  'buttonFontFamily',
] as const;

function extractTextContent(block: EditorBlock): string {
  const props = block.props ?? {};
  // Try common text property names
  for (const key of ['text', 'content', 'label', 'title', 'heading', 'html']) {
    const val = props[key];
    if (typeof val === 'string' && val.length > 0) {
      // Strip HTML tags for cleaner snippets
      return val.replace(/<[^>]*>/g, '').trim();
    }
  }
  return '';
}

export function buildPageSummary(content: EditorContentJson): PageSummary {
  const blocks = content.blocks ?? {};
  const rootBlock = content.root ? blocks[content.root] : undefined;
  const topLevelChildren = rootBlock?.children ?? [];

  const blockCountByType: Record<string, number> = {};
  const colorSet = new Set<string>();
  const fontSet = new Set<string>();
  let imageCount = 0;
  let hasForm = false;
  const textSnippets: PageSummary['textSnippets'] = [];

  for (const block of Object.values(blocks)) {
    // Count by type
    blockCountByType[block.type] = (blockCountByType[block.type] ?? 0) + 1;

    const props = block.props ?? {};

    // Extract colors
    for (const cp of COLOR_PROPS) {
      const v = props[cp];
      if (typeof v === 'string' && v.length > 0) {
        colorSet.add(v);
      }
    }

    // Extract fonts
    for (const fp of FONT_PROPS) {
      const v = props[fp];
      if (typeof v === 'string' && v.length > 0) {
        fontSet.add(v);
      }
    }

    // Count images with a src
    if (block.type === 'image' && typeof props.src === 'string' && props.src.length > 0) {
      imageCount++;
    }

    // Detect forms
    if (block.type === 'form') {
      hasForm = true;
    }

    // Collect text snippets
    if (TEXT_BLOCK_TYPES.has(block.type)) {
      const raw = extractTextContent(block);
      if (raw.length > 0) {
        textSnippets.push({
          blockId: block.id,
          type: block.type,
          text: raw.length > 100 ? raw.slice(0, 100) : raw,
        });
      }
    }
  }

  return {
    sectionCount: topLevelChildren.length,
    blockCount: Object.keys(blocks).length,
    blockCountByType,
    colorPalette: [...colorSet],
    fontFamilies: [...fontSet],
    imageCount,
    hasForm,
    layoutMode: content.layoutMode ?? 'fluid',
    textSnippets,
  };
}
