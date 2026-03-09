/**
 * AI tool definitions for structural page operations.
 * Adds, removes, reorders sections, and swaps layouts.
 */

import type { EditorMutation, SectionMapEntry } from '../ai.types.js';
import { getTemplate, listTemplateTypes, type SectionTemplateType } from '../section-templates.js';

// -------------------------------------------------------------------------
// Tool definitions
// -------------------------------------------------------------------------

export const structuralEditTools = [
  {
    name: 'add_section',
    description:
      `Add a new section to the page. Uses pre-built templates for common patterns. Available template types: ${listTemplateTypes().join(', ')}. The section is inserted with all child blocks.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        templateType: {
          type: 'string',
          enum: listTemplateTypes(),
          description: 'The type of section template to use.',
        },
        position: {
          type: 'number',
          description: 'The index position to insert the section (0-based). If omitted, appends to the end.',
        },
        parentId: {
          type: 'string',
          description: 'The root/page block ID to insert the section into.',
        },
        customizations: {
          type: 'object',
          description: 'Optional prop overrides to apply to the generated blocks (e.g., {backgroundColor: "#000"}). Applied to the section root block.',
        },
      },
      required: ['templateType', 'parentId'],
    },
  },
  {
    name: 'remove_section',
    description:
      'Remove an entire section and all its child blocks from the page.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sectionId: {
          type: 'string',
          description: 'The ID of the section block to remove.',
        },
      },
      required: ['sectionId'],
    },
  },
  {
    name: 'reorder_sections',
    description:
      'Reorder the top-level sections of the page. Provide the new order of section IDs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        parentId: {
          type: 'string',
          description: 'The root/page block ID that contains the sections.',
        },
        sectionIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'The section IDs in the desired new order.',
        },
      },
      required: ['parentId', 'sectionIds'],
    },
  },
  {
    name: 'swap_layout',
    description:
      'Change the layout type of a container block. For example, convert a stack to a grid or columns to a stack.',
    input_schema: {
      type: 'object' as const,
      properties: {
        blockId: {
          type: 'string',
          description: 'The ID of the layout block to change.',
        },
        newType: {
          type: 'string',
          enum: ['grid', 'columns', 'stack'],
          description: 'The new layout type.',
        },
        props: {
          type: 'object',
          description: 'Layout props for the new type (e.g., {columns: 2, gap: "24px"} for grid).',
        },
      },
      required: ['blockId', 'newType'],
    },
  },
];

// -------------------------------------------------------------------------
// Tool executors
// -------------------------------------------------------------------------

export function executeStructuralTool(
  toolName: string,
  input: Record<string, unknown>,
  _sectionMap?: SectionMapEntry[],
): EditorMutation[] {
  switch (toolName) {
    case 'add_section':
      return executeAddSection(input);
    case 'remove_section':
      return executeRemoveSection(input);
    case 'reorder_sections':
      return executeReorderSections(input);
    case 'swap_layout':
      return executeSwapLayout(input);
    default:
      throw new Error(`Unknown structural tool: ${toolName}`);
  }
}

function executeAddSection(input: Record<string, unknown>): EditorMutation[] {
  const { templateType, position, parentId, customizations } = input as {
    templateType: SectionTemplateType;
    position?: number;
    parentId: string;
    customizations?: Record<string, unknown>;
  };

  const template = getTemplate(templateType);
  const mutations: EditorMutation[] = [];

  // Apply customizations to root section block
  if (customizations) {
    template.rootBlock.props = { ...template.rootBlock.props, ...customizations };
    template.allBlocks[template.rootBlock.id] = template.rootBlock;
  }

  // Insert the root section block
  mutations.push({
    type: 'insertBlock',
    parentId,
    index: position ?? -1, // -1 signals "append"
    block: {
      id: template.rootBlock.id,
      type: template.rootBlock.type,
      props: template.rootBlock.props,
      children: template.rootBlock.children,
    },
  });

  // Insert all descendant blocks (skip the root since it's already inserted)
  for (const [blockId, block] of Object.entries(template.allBlocks)) {
    if (blockId === template.rootBlock.id) continue;

    // Find the parent of this block
    let blockParentId: string | undefined;
    for (const [candidateId, candidate] of Object.entries(template.allBlocks)) {
      if (candidate.children?.includes(blockId)) {
        blockParentId = candidateId;
        break;
      }
    }

    if (blockParentId) {
      const parent = template.allBlocks[blockParentId];
      const idx = parent.children?.indexOf(blockId) ?? 0;
      mutations.push({
        type: 'insertBlock',
        parentId: blockParentId,
        index: idx,
        block: {
          id: block.id,
          type: block.type,
          props: block.props,
          children: block.children,
        },
      });
    }
  }

  return mutations;
}

function executeRemoveSection(input: Record<string, unknown>): EditorMutation[] {
  const { sectionId } = input as { sectionId: string };
  return [{ type: 'removeBlock', blockId: sectionId }];
}

function executeReorderSections(input: Record<string, unknown>): EditorMutation[] {
  const { parentId, sectionIds } = input as { parentId: string; sectionIds: string[] };
  return [{ type: 'reorderChildren', parentId, childIds: sectionIds }];
}

function executeSwapLayout(input: Record<string, unknown>): EditorMutation[] {
  const { blockId, newType, props } = input as {
    blockId: string;
    newType: string;
    props?: Record<string, unknown>;
  };

  // We update the block's type and props. Since block type can't be changed
  // via updateBlockProps alone, we remove and re-insert. However, to preserve
  // children, we use updateBlockProps to change styling and note the type change.
  // The editor client should handle the type swap.
  const mutations: EditorMutation[] = [
    {
      type: 'updateBlockProps',
      blockId,
      props: {
        _layoutType: newType, // Signal to client to swap type
        ...props,
      },
    },
  ];

  return mutations;
}
