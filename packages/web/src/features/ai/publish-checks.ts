/**
 * Block 18: Publish Checks
 *
 * Pre-publish validation that warns about common issues like missing image
 * sources, empty text blocks, buttons without links, and invisible sections.
 */

import type { EditorContentJson, EditorBlock } from '@/features/pages/editor/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublishCheck {
  severity: 'error' | 'warning' | 'info';
  message: string;
  blockId?: string;
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function checkImagesSrc(blocks: Record<string, EditorBlock>): PublishCheck[] {
  const results: PublishCheck[] = [];
  for (const block of Object.values(blocks)) {
    if (block.type !== 'image') continue;
    const props = block.props as Record<string, unknown> | undefined;
    const src = props?.src;
    if (!src || (typeof src === 'string' && src.trim() === '')) {
      results.push({
        severity: 'error',
        message: 'Image block is missing a source URL.',
        blockId: block.id,
      });
    }
  }
  return results;
}

function checkButtonsHref(blocks: Record<string, EditorBlock>): PublishCheck[] {
  const results: PublishCheck[] = [];
  for (const block of Object.values(blocks)) {
    if (block.type !== 'button') continue;
    const props = block.props as Record<string, unknown> | undefined;
    const href = props?.href ?? props?.url ?? props?.link;
    if (!href || (typeof href === 'string' && href.trim() === '')) {
      results.push({
        severity: 'warning',
        message: 'Button has no link/href set.',
        blockId: block.id,
      });
    }
  }
  return results;
}

function checkTextContent(blocks: Record<string, EditorBlock>): PublishCheck[] {
  const results: PublishCheck[] = [];
  const textTypes = new Set(['text', 'headline', 'paragraph']);

  for (const block of Object.values(blocks)) {
    if (!textTypes.has(block.type)) continue;
    const props = block.props as Record<string, unknown> | undefined;
    const text = props?.text ?? props?.content ?? props?.html;
    if (!text || (typeof text === 'string' && text.replace(/<[^>]*>/g, '').trim() === '')) {
      results.push({
        severity: 'warning',
        message: `${block.type.charAt(0).toUpperCase() + block.type.slice(1)} block has no visible text content.`,
        blockId: block.id,
      });
    }
  }
  return results;
}

function checkInvisibleSections(blocks: Record<string, EditorBlock>): PublishCheck[] {
  const results: PublishCheck[] = [];
  for (const block of Object.values(blocks)) {
    if (block.type !== 'section') continue;
    const props = block.props as Record<string, unknown> | undefined;

    // Check opacity = 0
    if (props?.opacity === 0 || props?.opacity === '0') {
      results.push({
        severity: 'warning',
        message: 'Section has opacity set to 0 and will be invisible.',
        blockId: block.id,
      });
      continue;
    }

    // Check display:none via style string (basic check)
    if (typeof props?.style === 'string' && /display\s*:\s*none/i.test(props.style)) {
      results.push({
        severity: 'warning',
        message: 'Section has display:none and will be hidden.',
        blockId: block.id,
      });
    }
  }
  return results;
}

function checkEmptyPage(content: EditorContentJson): PublishCheck[] {
  if (Object.keys(content.blocks).length === 0) {
    return [
      {
        severity: 'error',
        message: 'Page has no blocks. Add content before publishing.',
      },
    ];
  }
  return [];
}

function checkNoSections(content: EditorContentJson): PublishCheck[] {
  const hasSections = Object.values(content.blocks).some((b) => b.type === 'section');
  if (!hasSections && Object.keys(content.blocks).length > 0) {
    return [
      {
        severity: 'info',
        message: 'Page has no section blocks. Consider wrapping content in sections for better structure.',
      },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run all publish-readiness checks and return a list of issues sorted by
 * severity (errors first, then warnings, then info).
 */
export function runPublishChecks(content: EditorContentJson): PublishCheck[] {
  const results: PublishCheck[] = [
    ...checkEmptyPage(content),
    ...checkNoSections(content),
    ...checkImagesSrc(content.blocks),
    ...checkButtonsHref(content.blocks),
    ...checkTextContent(content.blocks),
    ...checkInvisibleSections(content.blocks),
  ];

  // Sort by severity
  const order: Record<string, number> = { error: 0, warning: 1, info: 2 };
  results.sort((a, b) => order[a.severity] - order[b.severity]);

  return results;
}
