/**
 * Block Summary — Block 6
 *
 * Produces a compact, indented tree-view of the page for LLM context.
 * Target: ~2 000 tokens for a typical 5-section page.
 */

import type { EditorContentJson, EditorBlock } from '../pages/editor/types';

const TEXT_TYPES = new Set(['headline', 'paragraph', 'text', 'button']);

function extractText(block: EditorBlock): string {
  const props = block.props ?? {};
  for (const key of ['text', 'content', 'label', 'title', 'heading', 'html']) {
    const v = props[key];
    if (typeof v === 'string' && v.length > 0) {
      return v.replace(/<[^>]*>/g, '').trim();
    }
  }
  return '';
}

function formatProps(block: EditorBlock): string {
  const parts: string[] = [];
  const p = block.props ?? {};

  // Font size
  if (typeof p.fontSize === 'number') parts.push(`${p.fontSize}px`);
  if (typeof p.tag === 'string') parts.push(p.tag);

  // Font weight
  if (typeof p.fontWeight === 'string') parts.push(p.fontWeight);

  // Colors (compact)
  if (typeof p.backgroundColor === 'string') parts.push(`bg:${p.backgroundColor}`);
  if (typeof p.textColor === 'string') parts.push(`color:${p.textColor}`);

  // Image src
  if (block.type === 'image' && typeof p.src === 'string') {
    const short = p.src.length > 40 ? `${p.src.slice(0, 37)}...` : p.src;
    parts.push(`src:"${short}"`);
  }

  // Alignment
  if (typeof p.textAlign === 'string') parts.push(`align:${p.textAlign}`);

  // Hidden / locked
  if (block.meta?.locked) parts.push('locked');
  if (block.meta?.hidden) parts.push('hidden');

  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

/**
 * Produce a single-line summary of a block.
 *
 * Example: `"  headline#b_123 'Welcome to...' (h1, 32px, bold)"`
 */
export function summarizeBlock(block: EditorBlock, depth: number): string {
  const indent = '  '.repeat(depth);
  let text = '';
  if (TEXT_TYPES.has(block.type)) {
    const raw = extractText(block);
    if (raw.length > 0) {
      const truncated = raw.length > 30 ? `${raw.slice(0, 27)}...` : raw;
      text = ` '${truncated}'`;
    }
  }
  return `${indent}${block.type}#${block.id}${text}${formatProps(block)}`;
}

/**
 * Build an indented tree-view string of the full page.
 */
export function summarizeTree(content: EditorContentJson): string {
  const blocks = content.blocks ?? {};
  const lines: string[] = [];

  function walk(blockId: string, depth: number) {
    const block = blocks[blockId];
    if (!block) return;
    lines.push(summarizeBlock(block, depth));
    for (const childId of block.children ?? []) {
      walk(childId, depth + 1);
    }
  }

  const root = content.root ? blocks[content.root] : undefined;
  if (root) {
    lines.push(summarizeBlock(root, 0));
    for (const childId of root.children ?? []) {
      walk(childId, 1);
    }
  }

  return lines.join('\n');
}
