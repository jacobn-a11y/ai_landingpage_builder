import type { EditorMutation } from './stores/chat-store';

/**
 * Returns a human-readable description of a single mutation.
 */
export function describeMutation(mutation: EditorMutation): string {
  const blockLabel = mutation.blockId
    ? `block "${mutation.blockId.slice(0, 8)}..."`
    : 'block';

  switch (mutation.type) {
    case 'update_text': {
      const preview =
        typeof mutation.value === 'string'
          ? mutation.value.length > 40
            ? `"${mutation.value.slice(0, 40)}..."`
            : `"${mutation.value}"`
          : '';
      return `Update text on ${blockLabel}${preview ? ` to ${preview}` : ''}`;
    }

    case 'update_style': {
      const prop = mutation.path?.replace('props.', '') ?? 'style';
      return `Change ${prop} on ${blockLabel}`;
    }

    case 'insert_block': {
      const blockType =
        (mutation.blockJson?.type as string) ?? 'element';
      const parentLabel = mutation.parentId
        ? `into "${mutation.parentId.slice(0, 8)}..."`
        : '';
      return `Insert new ${blockType} ${parentLabel}`.trim();
    }

    case 'remove_block':
      return `Remove ${blockLabel}`;

    case 'update_layout': {
      const prop = mutation.path?.replace('props.', '') ?? 'layout';
      return `Update ${prop} on ${blockLabel}`;
    }

    case 'update_props': {
      const prop = mutation.path?.replace('props.', '') ?? 'property';
      return `Set ${prop} on ${blockLabel}`;
    }

    default:
      return `Modify ${blockLabel}`;
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
    const key = m.type;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const parts: string[] = [];
  if (counts.update_text) parts.push(`${counts.update_text} text change${counts.update_text > 1 ? 's' : ''}`);
  if (counts.update_style) parts.push(`${counts.update_style} style change${counts.update_style > 1 ? 's' : ''}`);
  if (counts.insert_block) parts.push(`${counts.insert_block} insertion${counts.insert_block > 1 ? 's' : ''}`);
  if (counts.remove_block) parts.push(`${counts.remove_block} removal${counts.remove_block > 1 ? 's' : ''}`);
  if (counts.update_layout) parts.push(`${counts.update_layout} layout change${counts.update_layout > 1 ? 's' : ''}`);
  if (counts.update_props) parts.push(`${counts.update_props} property update${counts.update_props > 1 ? 's' : ''}`);

  return `${mutations.length} changes: ${parts.join(', ')}`;
}

/**
 * Returns an emoji icon for a mutation type.
 */
export function mutationIcon(type: EditorMutation['type']): string {
  switch (type) {
    case 'update_text':
      return '\u270F\uFE0F'; // pencil
    case 'update_style':
      return '\uD83C\uDFA8'; // palette
    case 'insert_block':
      return '\u2795'; // plus
    case 'remove_block':
      return '\uD83D\uDDD1\uFE0F'; // wastebasket
    case 'update_layout':
      return '\uD83D\uDCD0'; // triangular ruler
    case 'update_props':
      return '\u2699\uFE0F'; // gear
    default:
      return '\uD83D\uDD27'; // wrench
  }
}
