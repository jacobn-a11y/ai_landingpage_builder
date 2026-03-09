/**
 * Block 17: Diff Utilities
 *
 * Computes structural diffs between two EditorContentJson snapshots so the UI
 * can highlight added, modified, and removed blocks.
 */

import type { EditorContentJson, EditorBlock } from '@/features/pages/editor/types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BlockDiff {
  added: string[];
  modified: string[];
  removed: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shallow-compare two blocks ignoring `meta` (which is editor-only state). */
function blocksEqual(a: EditorBlock, b: EditorBlock): boolean {
  if (a.type !== b.type) return false;

  // Compare props
  const propsA = JSON.stringify(a.props ?? {});
  const propsB = JSON.stringify(b.props ?? {});
  if (propsA !== propsB) return false;

  // Compare children arrays
  const childA = JSON.stringify(a.children ?? []);
  const childB = JSON.stringify(b.children ?? []);
  if (childA !== childB) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Main diff function
// ---------------------------------------------------------------------------

/**
 * Compare two content snapshots and return lists of block IDs that were
 * added, modified, or removed between `before` and `after`.
 */
export function computeBlockDiff(
  before: EditorContentJson,
  after: EditorContentJson,
): BlockDiff {
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  const beforeIds = new Set(Object.keys(before.blocks));
  const afterIds = new Set(Object.keys(after.blocks));

  // Blocks present in after but not in before = added
  for (const id of afterIds) {
    if (!beforeIds.has(id)) {
      added.push(id);
    }
  }

  // Blocks present in both = check for modifications
  for (const id of afterIds) {
    if (beforeIds.has(id)) {
      if (!blocksEqual(before.blocks[id], after.blocks[id])) {
        modified.push(id);
      }
    }
  }

  // Blocks present in before but not in after = removed
  for (const id of beforeIds) {
    if (!afterIds.has(id)) {
      removed.push(id);
    }
  }

  return { added, modified, removed };
}

/**
 * Returns the total number of changes across all categories.
 */
export function totalChanges(diff: BlockDiff): number {
  return diff.added.length + diff.modified.length + diff.removed.length;
}
