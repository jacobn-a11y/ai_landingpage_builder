/**
 * Validates mutations before they are applied to editor content state.
 */

import type { EditorContentJson, EditorBlock, BlockType } from '../types';
import type { EditorMutation } from './types';

/**
 * All valid block type strings.
 */
const VALID_BLOCK_TYPES: ReadonlySet<string> = new Set<BlockType>([
  'section',
  'container',
  'grid',
  'columns',
  'stack',
  'text',
  'headline',
  'paragraph',
  'image',
  'button',
  'divider',
  'spacer',
  'video',
  'shapeRectangle',
  'shapeCircle',
  'countdown',
  'table',
  'accordion',
  'carousel',
  'hero',
  'features',
  'testimonials',
  'faq',
  'logos',
  'form',
  'customHtml',
]);

/**
 * Block types that can have children (container blocks).
 */
const CONTAINER_BLOCK_TYPES: ReadonlySet<string> = new Set<BlockType>([
  'section',
  'container',
  'grid',
  'columns',
  'stack',
  'hero',
  'features',
  'testimonials',
  'faq',
  'logos',
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Check whether `potentialAncestor` is an ancestor of (or equal to) `blockId`.
 */
function isAncestorOrSelf(
  blocks: Record<string, EditorBlock>,
  potentialAncestor: string,
  blockId: string,
): boolean {
  if (potentialAncestor === blockId) return true;
  const block = blocks[potentialAncestor];
  if (!block?.children) return false;
  for (const childId of block.children) {
    if (isAncestorOrSelf(blocks, childId, blockId)) return true;
  }
  return false;
}

/**
 * Validate a mutation against the current editor state.
 * Returns { valid: true } if the mutation can be applied safely,
 * or { valid: false, error } describing why it cannot.
 */
export function validateMutation(
  state: EditorContentJson,
  mutation: EditorMutation,
): ValidationResult {
  switch (mutation.type) {
    case 'insertBlock': {
      // Validate block type
      if (!VALID_BLOCK_TYPES.has(mutation.blockType)) {
        return { valid: false, error: `Invalid block type: "${mutation.blockType}"` };
      }

      // Validate parent exists and is a container
      if (mutation.parentId !== null) {
        const parent = state.blocks[mutation.parentId];
        if (!parent) {
          return { valid: false, error: `Parent block "${mutation.parentId}" not found` };
        }
        if (!CONTAINER_BLOCK_TYPES.has(parent.type)) {
          return {
            valid: false,
            error: `Parent block "${mutation.parentId}" (type "${parent.type}") is not a container block`,
          };
        }
      }

      // Validate blockId is not already taken
      if (mutation.blockId && state.blocks[mutation.blockId]) {
        return { valid: false, error: `Block ID "${mutation.blockId}" already exists` };
      }

      return { valid: true };
    }

    case 'updateBlockProps': {
      const block = state.blocks[mutation.blockId];
      if (!block) {
        return { valid: false, error: `Block "${mutation.blockId}" not found` };
      }
      return { valid: true };
    }

    case 'removeBlock': {
      const block = state.blocks[mutation.blockId];
      if (!block) {
        return { valid: false, error: `Block "${mutation.blockId}" not found` };
      }
      return { valid: true };
    }

    case 'moveBlock': {
      const block = state.blocks[mutation.blockId];
      if (!block) {
        return { valid: false, error: `Block "${mutation.blockId}" not found` };
      }

      // Validate target parent exists and is a container
      if (mutation.parentId !== null) {
        const parent = state.blocks[mutation.parentId];
        if (!parent) {
          return { valid: false, error: `Target parent "${mutation.parentId}" not found` };
        }
        if (!CONTAINER_BLOCK_TYPES.has(parent.type)) {
          return {
            valid: false,
            error: `Target parent "${mutation.parentId}" (type "${parent.type}") is not a container block`,
          };
        }

        // Check for circular move: can't move a block into itself or its descendants
        if (isAncestorOrSelf(state.blocks, mutation.blockId, mutation.parentId)) {
          return {
            valid: false,
            error: `Cannot move block "${mutation.blockId}" into its own descendant "${mutation.parentId}"`,
          };
        }
      }

      return { valid: true };
    }

    case 'replaceText': {
      const block = state.blocks[mutation.blockId];
      if (!block) {
        return { valid: false, error: `Block "${mutation.blockId}" not found` };
      }
      return { valid: true };
    }

    case 'duplicateBlock': {
      const block = state.blocks[mutation.blockId];
      if (!block) {
        return { valid: false, error: `Block "${mutation.blockId}" not found` };
      }
      return { valid: true };
    }

    case 'reorderChildren': {
      const parent = state.blocks[mutation.parentId];
      if (!parent) {
        return { valid: false, error: `Parent block "${mutation.parentId}" not found` };
      }

      // Verify all child IDs exist
      for (const childId of mutation.childIds) {
        if (!state.blocks[childId]) {
          return { valid: false, error: `Child block "${childId}" not found` };
        }
      }

      return { valid: true };
    }

    case 'updatePageSettings': {
      return { valid: true };
    }

    case 'updateScripts': {
      return { valid: true };
    }

    case 'setLayoutMode': {
      if (mutation.mode !== 'fluid' && mutation.mode !== 'canvas') {
        return { valid: false, error: `Invalid layout mode: "${mutation.mode}"` };
      }
      return { valid: true };
    }

    default: {
      return { valid: false, error: `Unknown mutation type: "${(mutation as EditorMutation).type}"` };
    }
  }
}
