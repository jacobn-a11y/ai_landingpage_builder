import type { EditorBlock, EditorContentJson } from './types';

export interface AiCommandContext {
  content: EditorContentJson;
  selectedBlockId: string | null;
  selectedBlockIds: string[];
  insertBlock: (type: string, parentId: string | null, index?: number) => string;
  updateBlock: (id: string, updates: Partial<EditorBlock>) => void;
  setSelectedBlockId: (id: string | null) => void;
  removeBlocks: (ids: string[]) => void;
  copyBlocks: () => void;
  pasteBlocks: (parentId: string | null, index?: number) => string[] | null;
  undo: () => void;
  redo: () => void;
}

export interface AiCommandResult {
  handled: boolean;
  summary: string;
  operations: string[];
}

function downscaleSpacing(block: EditorBlock): Record<string, unknown> | null {
  const props = (block.props ?? {}) as Record<string, unknown>;
  const keys = [
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
  ];
  const updates: Record<string, unknown> = {};
  let changed = false;
  keys.forEach((key) => {
    const value = props[key];
    if (typeof value === 'number' && value > 0) {
      updates[key] = Math.max(0, Math.round(value * 0.8));
      changed = true;
    }
  });
  return changed ? updates : null;
}

export function runAiCommand(prompt: string, ctx: AiCommandContext): AiCommandResult {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const operations: string[] = [];

  if (!text) {
    return { handled: false, summary: 'No instruction provided.', operations };
  }

  if (lower.includes('undo')) {
    ctx.undo();
    operations.push('undo()');
    return { handled: true, summary: 'Undid last change.', operations };
  }
  if (lower.includes('redo')) {
    ctx.redo();
    operations.push('redo()');
    return { handled: true, summary: 'Redid last undone change.', operations };
  }

  if (lower.includes('duplicate') && ctx.selectedBlockIds.length > 0) {
    ctx.copyBlocks();
    const pasted = ctx.pasteBlocks(ctx.content.root || null);
    operations.push('copyBlocks()', 'pasteBlocks(root)');
    return {
      handled: true,
      summary: pasted?.length ? `Duplicated ${pasted.length} block(s).` : 'Duplicate command executed.',
      operations,
    };
  }

  if ((lower.includes('remove') || lower.includes('delete')) && ctx.selectedBlockIds.length > 0) {
    ctx.removeBlocks(ctx.selectedBlockIds);
    operations.push(`removeBlocks(${ctx.selectedBlockIds.length})`);
    return { handled: true, summary: `Removed ${ctx.selectedBlockIds.length} selected block(s).`, operations };
  }

  if (lower.includes('tighten spacing')) {
    let count = 0;
    Object.values(ctx.content.blocks).forEach((block) => {
      const updates = downscaleSpacing(block);
      if (!updates) return;
      const props = (block.props ?? {}) as Record<string, unknown>;
      ctx.updateBlock(block.id, { props: { ...props, ...updates } });
      count += 1;
    });
    operations.push('updateBlock(...spacing adjustments)');
    return {
      handled: true,
      summary: count > 0 ? `Tightened spacing on ${count} block(s).` : 'No spacing values were found to tighten.',
      operations,
    };
  }

  if (lower.includes('add comparison section')) {
    const parent = ctx.content.root || null;
    const sectionId = ctx.insertBlock('section', parent);
    const headlineId = ctx.insertBlock('headline', sectionId);
    const paragraphId = ctx.insertBlock('paragraph', sectionId);
    ctx.updateBlock(headlineId, { props: { content: 'Compare plans at a glance', headingLevel: 'h2' } });
    ctx.updateBlock(paragraphId, { props: { content: 'Add your feature comparison grid here.' } });
    ctx.setSelectedBlockId(sectionId);
    operations.push('insertBlock(section)', 'insertBlock(headline)', 'insertBlock(paragraph)', 'updateBlock(headline/paragraph)');
    return { handled: true, summary: 'Inserted a comparison section scaffold.', operations };
  }

  if (lower.includes('cta') && lower.includes('prominent')) {
    const targetId = ctx.selectedBlockId;
    if (!targetId) {
      return { handled: false, summary: 'Select a button first, then run CTA prominence changes.', operations };
    }
    const block = ctx.content.blocks[targetId];
    if (!block || block.type !== 'button') {
      return { handled: false, summary: 'CTA prominence currently applies to selected button blocks only.', operations };
    }
    const props = (block.props ?? {}) as Record<string, unknown>;
    ctx.updateBlock(targetId, {
      props: {
        ...props,
        paddingTop: typeof props.paddingTop === 'number' ? props.paddingTop + 4 : 14,
        paddingBottom: typeof props.paddingBottom === 'number' ? props.paddingBottom + 4 : 14,
        paddingLeft: typeof props.paddingLeft === 'number' ? props.paddingLeft + 8 : 24,
        paddingRight: typeof props.paddingRight === 'number' ? props.paddingRight + 8 : 24,
        fontWeight: '700',
        borderRadius: typeof props.borderRadius === 'number' ? Math.max(props.borderRadius, 8) : 8,
      },
    });
    operations.push('updateBlock(button props)');
    return { handled: true, summary: 'Made selected CTA button more prominent within current style system.', operations };
  }

  if (lower.includes('rewrite this page for')) {
    const audience = text.split(/rewrite this page for/i)[1]?.trim() || 'the target audience';
    let count = 0;
    Object.values(ctx.content.blocks).forEach((block) => {
      if (block.type !== 'text' && block.type !== 'headline' && block.type !== 'paragraph') return;
      const props = (block.props ?? {}) as Record<string, unknown>;
      const content = String(props.content ?? '').trim();
      if (!content) return;
      ctx.updateBlock(block.id, {
        props: {
          ...props,
          content: `${content} (${audience})`,
        },
      });
      count += 1;
    });
    operations.push('updateBlock(copy blocks)');
    return {
      handled: true,
      summary: count > 0
        ? `Applied audience-focused rewrite markers to ${count} text block(s).`
        : 'No text blocks found to rewrite.',
      operations,
    };
  }

  return {
    handled: false,
    summary: 'No deterministic command matched. Try: undo, redo, duplicate, delete, tighten spacing, add comparison section, make CTA more prominent.',
    operations,
  };
}
