import type { EditorContentJson } from '@/features/pages/editor/types';
import type { EditorMutation } from './stores/chat-store';
import { executeMutations, type ExecutionReport } from './mutation-executor';

export interface DraftPreview {
  /** The content after all mutations are applied */
  content: EditorContentJson;
  /** IDs of blocks that were changed, inserted, or had children modified */
  changedBlockIds: string[];
  /** Execution report with applied/rejected counts */
  report: ExecutionReport;
}

/**
 * Apply mutations to a copy of the content and return a preview.
 * This is a sandboxed operation — the original content is not modified.
 */
export function previewMutations(
  mutations: EditorMutation[],
  content: EditorContentJson
): DraftPreview {
  // Snapshot the original block IDs and their serialized state
  const originalBlockState = new Map<string, string>();
  for (const [id, block] of Object.entries(content.blocks)) {
    originalBlockState.set(id, JSON.stringify(block));
  }

  const { content: newContent, report } = executeMutations(mutations, content);

  // Determine which blocks changed
  const changedBlockIds: string[] = [];

  for (const [id, block] of Object.entries(newContent.blocks)) {
    const original = originalBlockState.get(id);
    if (!original) {
      // Newly inserted block
      changedBlockIds.push(id);
    } else if (original !== JSON.stringify(block)) {
      // Modified block
      changedBlockIds.push(id);
    }
  }

  // Check for removed blocks
  for (const id of originalBlockState.keys()) {
    if (!newContent.blocks[id]) {
      changedBlockIds.push(id);
    }
  }

  return {
    content: newContent,
    changedBlockIds,
    report,
  };
}
