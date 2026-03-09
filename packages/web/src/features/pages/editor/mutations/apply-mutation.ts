/**
 * Pure functions to apply mutations to editor content state.
 */

import type { EditorContentJson, EditorBlock } from '../types';
import type { EditorMutation, MutationResult } from './types';

let _idCounter = 0;

/**
 * Generate a unique block ID.
 * Format: blk_{timestamp}_{counter}
 */
export function generateBlockId(): string {
  _idCounter += 1;
  return `blk_${Date.now()}_${_idCounter}`;
}

/**
 * Reset the ID counter (useful for testing).
 */
export function resetIdCounter(): void {
  _idCounter = 0;
}

/**
 * Deep clone an object using structured clone or JSON round-trip.
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Find the parent block ID for a given block.
 */
function findParentId(
  blocks: Record<string, EditorBlock>,
  root: string,
  blockId: string
): string | null {
  for (const [id, block] of Object.entries(blocks)) {
    if (block.children?.includes(blockId)) {
      return id;
    }
  }
  // Check if the block is a root-level child
  if (blockId === root) return null;
  return null;
}

/**
 * Collect a block and all of its descendant IDs recursively.
 */
function collectDescendants(
  blocks: Record<string, EditorBlock>,
  blockId: string
): string[] {
  const result: string[] = [blockId];
  const block = blocks[blockId];
  if (block?.children) {
    for (const childId of block.children) {
      result.push(...collectDescendants(blocks, childId));
    }
  }
  return result;
}

/**
 * Check if `potentialAncestor` is an ancestor of `blockId`.
 */
function isAncestor(
  blocks: Record<string, EditorBlock>,
  potentialAncestor: string,
  blockId: string
): boolean {
  const descendants = collectDescendants(blocks, potentialAncestor);
  return descendants.includes(blockId);
}

/**
 * Apply a single mutation to the editor content state.
 * Returns a new state (immutable) and a result.
 */
export function applyMutation(
  state: EditorContentJson,
  mutation: EditorMutation
): MutationResult {
  // Work on a deep clone to ensure immutability
  const content = deepClone(state);

  switch (mutation.type) {
    case 'insertBlock': {
      const blockId = mutation.blockId || generateBlockId();
      const blockType = mutation.blockType;

      // Create the new block
      const newBlock: EditorBlock = {
        id: blockId,
        type: blockType as EditorBlock['type'],
        props: mutation.props ? { ...mutation.props } : {},
        children: [],
      };

      content.blocks[blockId] = newBlock;

      // Add to parent's children
      if (mutation.parentId) {
        const parent = content.blocks[mutation.parentId];
        if (!parent) {
          return { success: false, error: `Parent block "${mutation.parentId}" not found` };
        }
        if (!parent.children) {
          parent.children = [];
        }
        const index = mutation.index !== undefined
          ? Math.min(Math.max(0, mutation.index), parent.children.length)
          : parent.children.length;
        parent.children.splice(index, 0, blockId);
      } else {
        // Insert as root if no root exists, otherwise add to root's children
        if (!content.root) {
          content.root = blockId;
        } else {
          const rootBlock = content.blocks[content.root];
          if (rootBlock) {
            if (!rootBlock.children) {
              rootBlock.children = [];
            }
            const index = mutation.index !== undefined
              ? Math.min(Math.max(0, mutation.index), rootBlock.children.length)
              : rootBlock.children.length;
            rootBlock.children.splice(index, 0, blockId);
          }
        }
      }

      return { success: true, newContent: content, blockId };
    }

    case 'updateBlockProps': {
      const block = content.blocks[mutation.blockId];
      if (!block) {
        return { success: false, error: `Block "${mutation.blockId}" not found` };
      }
      block.props = { ...(block.props || {}), ...mutation.props };
      return { success: true, newContent: content, blockId: mutation.blockId };
    }

    case 'removeBlock': {
      const block = content.blocks[mutation.blockId];
      if (!block) {
        return { success: false, error: `Block "${mutation.blockId}" not found` };
      }

      // Collect all descendants to remove
      const toRemove = collectDescendants(content.blocks, mutation.blockId);

      // Remove from parent's children
      const parentId = findParentId(content.blocks, content.root, mutation.blockId);
      if (parentId) {
        const parent = content.blocks[parentId];
        if (parent?.children) {
          parent.children = parent.children.filter((id) => id !== mutation.blockId);
        }
      }

      // Delete all collected blocks
      for (const id of toRemove) {
        delete content.blocks[id];
      }

      // If the root was removed, clear it
      if (mutation.blockId === content.root) {
        content.root = '';
      }

      return { success: true, newContent: content, blockId: mutation.blockId };
    }

    case 'moveBlock': {
      const block = content.blocks[mutation.blockId];
      if (!block) {
        return { success: false, error: `Block "${mutation.blockId}" not found` };
      }

      // Check for circular move: can't move a block into its own descendant
      if (mutation.parentId && isAncestor(content.blocks, mutation.blockId, mutation.parentId)) {
        return { success: false, error: 'Cannot move a block into its own descendant' };
      }

      // Remove from current parent
      const oldParentId = findParentId(content.blocks, content.root, mutation.blockId);
      if (oldParentId) {
        const oldParent = content.blocks[oldParentId];
        if (oldParent?.children) {
          oldParent.children = oldParent.children.filter((id) => id !== mutation.blockId);
        }
      }

      // Insert into new parent
      if (mutation.parentId) {
        const newParent = content.blocks[mutation.parentId];
        if (!newParent) {
          return { success: false, error: `Target parent "${mutation.parentId}" not found` };
        }
        if (!newParent.children) {
          newParent.children = [];
        }
        const index = Math.min(Math.max(0, mutation.index), newParent.children.length);
        newParent.children.splice(index, 0, mutation.blockId);
      } else {
        // Move to root level
        const rootBlock = content.blocks[content.root];
        if (rootBlock) {
          if (!rootBlock.children) {
            rootBlock.children = [];
          }
          const index = Math.min(Math.max(0, mutation.index), rootBlock.children.length);
          rootBlock.children.splice(index, 0, mutation.blockId);
        }
      }

      return { success: true, newContent: content, blockId: mutation.blockId };
    }

    case 'replaceText': {
      const block = content.blocks[mutation.blockId];
      if (!block) {
        return { success: false, error: `Block "${mutation.blockId}" not found` };
      }
      if (!block.props) {
        block.props = {};
      }
      block.props.content = mutation.content;
      if (mutation.contentHtml !== undefined) {
        block.props.contentHtml = mutation.contentHtml;
      }
      return { success: true, newContent: content, blockId: mutation.blockId };
    }

    case 'duplicateBlock': {
      const block = content.blocks[mutation.blockId];
      if (!block) {
        return { success: false, error: `Block "${mutation.blockId}" not found` };
      }

      // Deep clone the block and all descendants with new IDs
      const idMap = new Map<string, string>();
      const allIds = collectDescendants(content.blocks, mutation.blockId);

      for (const oldId of allIds) {
        idMap.set(oldId, generateBlockId());
      }

      for (const oldId of allIds) {
        const original = content.blocks[oldId];
        if (!original) continue;
        const newId = idMap.get(oldId)!;
        const cloned: EditorBlock = deepClone(original);
        cloned.id = newId;
        if (cloned.children) {
          cloned.children = cloned.children.map((childId) => idMap.get(childId) || childId);
        }
        content.blocks[newId] = cloned;
      }

      // Insert the cloned root after the original in its parent
      const parentId = findParentId(content.blocks, content.root, mutation.blockId);
      const newRootId = idMap.get(mutation.blockId)!;

      if (parentId) {
        const parent = content.blocks[parentId];
        if (parent?.children) {
          const idx = parent.children.indexOf(mutation.blockId);
          if (idx !== -1) {
            parent.children.splice(idx + 1, 0, newRootId);
          } else {
            parent.children.push(newRootId);
          }
        }
      } else {
        // It's a root-level block; insert after original in root's children
        const rootBlock = content.blocks[content.root];
        if (rootBlock?.children) {
          const idx = rootBlock.children.indexOf(mutation.blockId);
          if (idx !== -1) {
            rootBlock.children.splice(idx + 1, 0, newRootId);
          } else {
            rootBlock.children.push(newRootId);
          }
        }
      }

      return { success: true, newContent: content, blockId: newRootId };
    }

    case 'reorderChildren': {
      const parent = content.blocks[mutation.parentId];
      if (!parent) {
        return { success: false, error: `Parent block "${mutation.parentId}" not found` };
      }
      parent.children = [...mutation.childIds];
      return { success: true, newContent: content };
    }

    case 'updatePageSettings': {
      content.pageSettings = {
        ...(content.pageSettings || {}),
        ...mutation.settings,
      };
      return { success: true, newContent: content };
    }

    case 'updateScripts': {
      // Store scripts in pageSettings or as a top-level property
      const pageSettings = content.pageSettings || {};
      if (mutation.scripts.header !== undefined) {
        (pageSettings as Record<string, unknown>).headerScript = mutation.scripts.header;
      }
      if (mutation.scripts.footer !== undefined) {
        (pageSettings as Record<string, unknown>).footerScript = mutation.scripts.footer;
      }
      content.pageSettings = pageSettings;
      return { success: true, newContent: content };
    }

    case 'setLayoutMode': {
      content.layoutMode = mutation.mode;
      return { success: true, newContent: content };
    }

    default: {
      return { success: false, error: `Unknown mutation type: ${(mutation as EditorMutation).type}` };
    }
  }
}

/**
 * Apply multiple mutations sequentially, returning the final state and all results.
 * Stops on first failure.
 */
export function applyMutations(
  state: EditorContentJson,
  mutations: EditorMutation[]
): { content: EditorContentJson; results: MutationResult[] } {
  let current = state;
  const results: MutationResult[] = [];

  for (const mutation of mutations) {
    const result = applyMutation(current, mutation);
    results.push(result);
    if (!result.success) {
      return { content: current, results };
    }
    current = result.newContent!;
  }

  return { content: current, results };
}
