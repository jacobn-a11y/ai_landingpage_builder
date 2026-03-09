import type { EditorContentJson, EditorBlock } from '@/features/pages/editor/types';
import type { EditorMutation } from './stores/chat-store';

export interface ExecutionReport {
  applied: number;
  rejected: number;
  errors: string[];
  transactionId: string;
}

function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateBlockId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Set a nested property on an object using a dot-separated path.
 * E.g. setNestedValue(block, "props.backgroundColor", "#fff")
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Validate a single mutation against the current content.
 */
function validateMutation(
  mutation: EditorMutation,
  content: EditorContentJson
): string | null {
  switch (mutation.type) {
    case 'update_text':
    case 'update_style':
    case 'update_layout':
    case 'update_props': {
      if (!mutation.blockId) return 'Missing blockId';
      if (!content.blocks[mutation.blockId]) return `Block "${mutation.blockId}" not found`;
      if (!mutation.path) return 'Missing property path';
      return null;
    }
    case 'insert_block': {
      if (!mutation.blockJson) return 'Missing blockJson for insert';
      if (mutation.parentId && !content.blocks[mutation.parentId]) {
        return `Parent block "${mutation.parentId}" not found`;
      }
      return null;
    }
    case 'remove_block': {
      if (!mutation.blockId) return 'Missing blockId';
      if (!content.blocks[mutation.blockId]) return `Block "${mutation.blockId}" not found`;
      return null;
    }
    default:
      return `Unknown mutation type: ${mutation.type}`;
  }
}

/**
 * Apply a single mutation to the content (mutates in place for performance).
 */
function applyMutation(
  mutation: EditorMutation,
  content: EditorContentJson
): void {
  switch (mutation.type) {
    case 'update_text':
    case 'update_style':
    case 'update_layout':
    case 'update_props': {
      const block = content.blocks[mutation.blockId!];
      if (!block || !mutation.path) return;
      const blockObj = block as unknown as Record<string, unknown>;
      setNestedValue(blockObj, mutation.path, mutation.value);
      break;
    }

    case 'insert_block': {
      const newBlock: EditorBlock = {
        id: generateBlockId(),
        type: (mutation.blockJson?.type as string) ?? 'container',
        props: (mutation.blockJson?.props as Record<string, unknown>) ?? {},
        children: (mutation.blockJson?.children as string[]) ?? undefined,
      } as EditorBlock;

      content.blocks[newBlock.id] = newBlock;

      const parentId = mutation.parentId ?? content.root;
      if (parentId && content.blocks[parentId]) {
        const parent = content.blocks[parentId];
        const children = parent.children ?? [];
        const idx = mutation.index ?? children.length;
        const next = [...children.slice(0, idx), newBlock.id, ...children.slice(idx)];
        content.blocks[parentId] = { ...parent, children: next };
      }
      break;
    }

    case 'remove_block': {
      const blockId = mutation.blockId!;
      // Remove from any parent's children
      for (const [id, block] of Object.entries(content.blocks)) {
        if (block.children?.includes(blockId)) {
          content.blocks[id] = {
            ...block,
            children: block.children.filter((c) => c !== blockId),
          };
        }
      }
      // Remove the block and its descendants
      const toRemove = new Set<string>();
      const collect = (id: string) => {
        toRemove.add(id);
        const b = content.blocks[id];
        b?.children?.forEach(collect);
      };
      collect(blockId);
      for (const id of toRemove) {
        delete content.blocks[id];
      }
      if (content.root === blockId) {
        content.root = Object.keys(content.blocks)[0] ?? '';
      }
      break;
    }
  }
}

/**
 * Execute a batch of mutations against editor content.
 * Returns the new content and a report of what was applied.
 */
export function executeMutations(
  mutations: EditorMutation[],
  content: EditorContentJson
): { content: EditorContentJson; report: ExecutionReport } {
  // Deep clone content so we don't mutate the original
  const newContent: EditorContentJson = JSON.parse(JSON.stringify(content));

  const report: ExecutionReport = {
    applied: 0,
    rejected: 0,
    errors: [],
    transactionId: generateTransactionId(),
  };

  for (const mutation of mutations) {
    const error = validateMutation(mutation, newContent);
    if (error) {
      report.rejected++;
      report.errors.push(error);
      continue;
    }

    try {
      applyMutation(mutation, newContent);
      report.applied++;
    } catch (err) {
      report.rejected++;
      report.errors.push(
        err instanceof Error ? err.message : 'Unknown error applying mutation'
      );
    }
  }

  return { content: newContent, report };
}
