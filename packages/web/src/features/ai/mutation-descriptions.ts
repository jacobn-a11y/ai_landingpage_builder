import type { EditorMutation } from '@/features/pages/editor/mutations/types';

/**
 * Returns a human-readable description of a single mutation.
 */
export function describeMutation(mutation: EditorMutation): string {
  switch (mutation.type) {
    case 'replaceText': {
      const preview =
        mutation.content.length > 40
          ? `"${mutation.content.slice(0, 40)}..."`
          : `"${mutation.content}"`;
      return `Update text on block "${mutation.blockId.slice(0, 8)}..." to ${preview}`;
    }

    case 'updateBlockProps': {
      const propNames = Object.keys(mutation.props).join(', ');
      return `Update ${propNames || 'props'} on block "${mutation.blockId.slice(0, 8)}..."`;
    }

    case 'insertBlock': {
      const parentLabel = mutation.parentId
        ? `into "${mutation.parentId.slice(0, 8)}..."`
        : '';
      return `Insert new ${mutation.blockType} ${parentLabel}`.trim();
    }

    case 'removeBlock':
      return `Remove block "${mutation.blockId.slice(0, 8)}..."`;

    case 'moveBlock':
      return `Move block "${mutation.blockId.slice(0, 8)}..."`;

    case 'duplicateBlock':
      return `Duplicate block "${mutation.blockId.slice(0, 8)}..."`;

    case 'reorderChildren':
      return `Reorder children of "${mutation.parentId.slice(0, 8)}..."`;

    case 'updatePageSettings':
      return 'Update page settings';

    case 'updateScripts':
      return 'Update page scripts';

    case 'setLayoutMode':
      return `Set layout mode to ${mutation.mode}`;

    default:
      return 'Modify page';
  }
}

/**
 * Returns a human-readable summary of a batch of mutations.
 */
export function describeMutationBatch(mutations: EditorMutation[]): string {
  if (mutations.length === 0) return 'No changes';
  if (mutations.length === 1) return describeMutation(mutations[0]);

  const counts: Record<string, number> = {};
  for (const m of mutations) {
    counts[m.type] = (counts[m.type] ?? 0) + 1;
  }

  const parts: string[] = [];
  if (counts.replaceText) parts.push(`${counts.replaceText} text change${counts.replaceText > 1 ? 's' : ''}`);
  if (counts.updateBlockProps) parts.push(`${counts.updateBlockProps} style change${counts.updateBlockProps > 1 ? 's' : ''}`);
  if (counts.insertBlock) parts.push(`${counts.insertBlock} insertion${counts.insertBlock > 1 ? 's' : ''}`);
  if (counts.removeBlock) parts.push(`${counts.removeBlock} removal${counts.removeBlock > 1 ? 's' : ''}`);
  if (counts.moveBlock) parts.push(`${counts.moveBlock} move${counts.moveBlock > 1 ? 's' : ''}`);
  if (counts.duplicateBlock) parts.push(`${counts.duplicateBlock} duplication${counts.duplicateBlock > 1 ? 's' : ''}`);

  return `${mutations.length} changes: ${parts.join(', ')}`;
}

/**
 * Returns an emoji icon for a mutation type.
 */
export function mutationIcon(type: EditorMutation['type']): string {
  switch (type) {
    case 'replaceText':
      return '\u270F\uFE0F'; // pencil
    case 'updateBlockProps':
      return '\uD83C\uDFA8'; // palette
    case 'insertBlock':
      return '\u2795'; // plus
    case 'removeBlock':
      return '\uD83D\uDDD1\uFE0F'; // wastebasket
    case 'moveBlock':
      return '\uD83D\uDCD0'; // triangular ruler
    case 'duplicateBlock':
      return '\u2699\uFE0F'; // gear
    default:
      return '\uD83D\uDD27'; // wrench
  }
}
