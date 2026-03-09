import type { EditorContentJson, EditorBlock } from '@/features/pages/editor/types';
import type { EditorMutation } from '@/features/pages/editor/mutations/types';

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
 * Validate a single mutation against the current content.
 */
function validateMutation(
  mutation: EditorMutation,
  content: EditorContentJson
): string | null {
  switch (mutation.type) {
    case 'insertBlock': {
      if (!mutation.blockType) return 'Missing blockType for insert';
      if (mutation.parentId && mutation.parentId !== null && !content.blocks[mutation.parentId]) {
        return `Parent block "${mutation.parentId}" not found`;
      }
      return null;
    }
    case 'updateBlockProps': {
      if (!mutation.blockId) return 'Missing blockId';
      if (!content.blocks[mutation.blockId]) return `Block "${mutation.blockId}" not found`;
      return null;
    }
    case 'removeBlock': {
      if (!mutation.blockId) return 'Missing blockId';
      if (!content.blocks[mutation.blockId]) return `Block "${mutation.blockId}" not found`;
      return null;
    }
    case 'moveBlock': {
      if (!mutation.blockId) return 'Missing blockId';
      if (!content.blocks[mutation.blockId]) return `Block "${mutation.blockId}" not found`;
      return null;
    }
    case 'replaceText': {
      if (!mutation.blockId) return 'Missing blockId';
      if (!content.blocks[mutation.blockId]) return `Block "${mutation.blockId}" not found`;
      return null;
    }
    case 'duplicateBlock': {
      if (!mutation.blockId) return 'Missing blockId';
      if (!content.blocks[mutation.blockId]) return `Block "${mutation.blockId}" not found`;
      return null;
    }
    case 'reorderChildren': {
      if (!mutation.parentId) return 'Missing parentId';
      if (!content.blocks[mutation.parentId]) return `Parent block "${mutation.parentId}" not found`;
      return null;
    }
    case 'updatePageSettings':
    case 'updateScripts':
    case 'setLayoutMode':
      return null;
    default:
      return `Unknown mutation type: ${(mutation as { type: string }).type}`;
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
    case 'insertBlock': {
      const newBlock: EditorBlock = {
        id: mutation.blockId ?? generateBlockId(),
        type: mutation.blockType as EditorBlock['type'],
        props: mutation.props ?? {},
      } as EditorBlock;

      content.blocks[newBlock.id] = newBlock;

      const parentId = mutation.parentId ?? content.root;
      if (parentId && content.blocks[parentId]) {
        const parent = content.blocks[parentId];
        const children = parent.children ?? [];
        const idx = (mutation.index !== undefined && mutation.index >= 0) ? mutation.index : children.length;
        const next = [...children.slice(0, idx), newBlock.id, ...children.slice(idx)];
        content.blocks[parentId] = { ...parent, children: next };
      }
      break;
    }

    case 'updateBlockProps': {
      const block = content.blocks[mutation.blockId];
      if (!block) return;
      content.blocks[mutation.blockId] = {
        ...block,
        props: { ...(block.props ?? {}), ...mutation.props },
      };
      break;
    }

    case 'replaceText': {
      const block = content.blocks[mutation.blockId];
      if (!block) return;
      content.blocks[mutation.blockId] = {
        ...block,
        props: {
          ...(block.props ?? {}),
          content: mutation.content,
          ...(mutation.contentHtml ? { contentHtml: mutation.contentHtml } : {}),
        },
      };
      break;
    }

    case 'removeBlock': {
      const blockId = mutation.blockId;
      // Collect descendants first, then delete
      const toRemove = new Set<string>();
      const collect = (id: string) => {
        toRemove.add(id);
        const b = content.blocks[id];
        b?.children?.forEach(collect);
      };
      collect(blockId);
      // Remove from any parent's children
      for (const [id, block] of Object.entries(content.blocks)) {
        if (block.children?.includes(blockId)) {
          content.blocks[id] = {
            ...block,
            children: block.children.filter((c) => c !== blockId),
          };
        }
      }
      // Delete collected blocks
      for (const id of toRemove) {
        delete content.blocks[id];
      }
      if (content.root === blockId) {
        content.root = Object.keys(content.blocks)[0] ?? '';
      }
      break;
    }

    case 'moveBlock': {
      const blockId = mutation.blockId;
      // Remove from current parent
      for (const [id, block] of Object.entries(content.blocks)) {
        if (block.children?.includes(blockId)) {
          content.blocks[id] = {
            ...block,
            children: block.children.filter((c) => c !== blockId),
          };
        }
      }
      // Add to new parent
      const newParentId = mutation.parentId ?? content.root;
      if (newParentId && content.blocks[newParentId]) {
        const parent = content.blocks[newParentId];
        const children = parent.children ?? [];
        const idx = mutation.index;
        const next = [...children.slice(0, idx), blockId, ...children.slice(idx)];
        content.blocks[newParentId] = { ...parent, children: next };
      }
      break;
    }

    case 'duplicateBlock': {
      const original = content.blocks[mutation.blockId];
      if (!original) return;
      const newId = generateBlockId();
      content.blocks[newId] = { ...original, id: newId, props: { ...(original.props ?? {}) } };
      // Insert after original in parent's children
      for (const [id, block] of Object.entries(content.blocks)) {
        if (block.children?.includes(mutation.blockId)) {
          const idx = block.children.indexOf(mutation.blockId);
          const next = [...block.children.slice(0, idx + 1), newId, ...block.children.slice(idx + 1)];
          content.blocks[id] = { ...block, children: next };
          break;
        }
      }
      break;
    }

    case 'reorderChildren': {
      const parent = content.blocks[mutation.parentId];
      if (!parent) return;
      content.blocks[mutation.parentId] = { ...parent, children: mutation.childIds };
      break;
    }

    case 'updatePageSettings': {
      content.pageSettings = { ...(content.pageSettings ?? {}), ...mutation.settings };
      break;
    }

    case 'updateScripts': {
      // Scripts are stored at content level in some implementations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = content as any;
      c.scripts = { ...(c.scripts ?? {}), ...mutation.scripts };
      break;
    }

    case 'setLayoutMode': {
      content.layoutMode = mutation.mode;
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
