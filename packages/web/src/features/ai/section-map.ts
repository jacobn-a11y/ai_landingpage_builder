/**
 * Section Map — Block 6
 *
 * Walks the root's children to produce an ordered list of
 * top-level sections with labels, types, and text snippets.
 */

import type { EditorContentJson, EditorBlock } from '../pages/editor/types';

export interface SectionMapEntry {
  sectionId: string;
  index: number;
  label: string;
  type: string;
  blockCount: number;
  childTypes: string[];
  textSnippets: string[];
}

/** Map pattern block types to human-readable labels. */
const PATTERN_LABELS: Record<string, string> = {
  hero: 'Hero',
  features: 'Features',
  testimonials: 'Testimonials',
  faq: 'FAQ',
  logos: 'Logos',
  form: 'Form',
};

function extractText(block: EditorBlock): string {
  const props = block.props ?? {};
  for (const key of ['text', 'content', 'label', 'title', 'heading', 'html']) {
    const v = props[key];
    if (typeof v === 'string' && v.length > 0) {
      const clean = v.replace(/<[^>]*>/g, '').trim();
      return clean.length > 50 ? clean.slice(0, 50) : clean;
    }
  }
  return '';
}

const TEXT_TYPES = new Set(['headline', 'paragraph', 'text', 'button']);

function countDescendants(
  blockId: string,
  blocks: Record<string, EditorBlock>,
): number {
  const block = blocks[blockId];
  if (!block) return 0;
  let count = 1;
  for (const childId of block.children ?? []) {
    count += countDescendants(childId, blocks);
  }
  return count;
}

function collectChildTypes(
  blockId: string,
  blocks: Record<string, EditorBlock>,
): string[] {
  const block = blocks[blockId];
  if (!block) return [];
  const types: string[] = [];
  for (const childId of block.children ?? []) {
    const child = blocks[childId];
    if (child) {
      types.push(child.type);
    }
  }
  return types;
}

function collectTextSnippets(
  blockId: string,
  blocks: Record<string, EditorBlock>,
): string[] {
  const block = blocks[blockId];
  if (!block) return [];
  const snippets: string[] = [];

  function walk(id: string) {
    const b = blocks[id];
    if (!b) return;
    if (TEXT_TYPES.has(b.type)) {
      const txt = extractText(b);
      if (txt.length > 0) {
        snippets.push(txt);
      }
    }
    for (const childId of b.children ?? []) {
      walk(childId);
    }
  }

  // Walk children, not the section itself
  for (const childId of block.children ?? []) {
    walk(childId);
  }
  return snippets;
}

/**
 * Infer a label for a section based on its type and content.
 */
function inferLabel(
  block: EditorBlock,
  blocks: Record<string, EditorBlock>,
  index: number,
): string {
  // If it's a known pattern block, use that label
  if (PATTERN_LABELS[block.type]) {
    return `${PATTERN_LABELS[block.type]} Section`;
  }

  // Heuristic: a section/container whose first child is a large headline
  // looks like a hero.
  if (block.type === 'section' || block.type === 'container') {
    const children = block.children ?? [];
    for (const cid of children) {
      const child = blocks[cid];
      if (!child) continue;
      // Check direct children or one level deeper
      const candidates = child.type === 'headline' ? [child] : [];
      if (candidates.length === 0 && child.children) {
        for (const gcid of child.children) {
          const gc = blocks[gcid];
          if (gc?.type === 'headline') candidates.push(gc);
        }
      }
      for (const h of candidates) {
        const fontSize = h.props?.fontSize;
        if (
          typeof fontSize === 'number' && fontSize >= 36 &&
          index === 0
        ) {
          return 'Hero-like Section';
        }
      }
    }
  }

  return `Section ${index + 1}`;
}

export function buildSectionMap(content: EditorContentJson): SectionMapEntry[] {
  const blocks = content.blocks ?? {};
  const rootBlock = content.root ? blocks[content.root] : undefined;
  if (!rootBlock) return [];

  const topLevelIds = rootBlock.children ?? [];
  return topLevelIds.map((sectionId, index) => {
    const block = blocks[sectionId];
    if (!block) {
      return {
        sectionId,
        index,
        label: `Section ${index + 1}`,
        type: 'unknown',
        blockCount: 0,
        childTypes: [],
        textSnippets: [],
      };
    }

    return {
      sectionId,
      index,
      label: inferLabel(block, blocks, index),
      type: block.type,
      blockCount: countDescendants(sectionId, blocks),
      childTypes: collectChildTypes(sectionId, blocks),
      textSnippets: collectTextSnippets(sectionId, blocks),
    };
  });
}
