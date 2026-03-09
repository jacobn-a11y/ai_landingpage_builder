/**
 * AI tool definitions for design/style operations.
 * Produces batch updateBlockProps mutations across the page.
 */

import type { EditorMutation, PageSummary, SectionMapEntry } from '../ai.types.js';

// -------------------------------------------------------------------------
// Tool definitions
// -------------------------------------------------------------------------

export const designEditTools = [
  {
    name: 'change_color_scheme',
    description:
      'Change the color scheme across the entire page or specific sections. Produces updateBlockProps mutations for backgrounds, text colors, and button colors.',
    input_schema: {
      type: 'object' as const,
      properties: {
        mutations: {
          type: 'array',
          description: 'Array of {blockId, props} updates to apply the new color scheme.',
          items: {
            type: 'object',
            properties: {
              blockId: { type: 'string' },
              props: {
                type: 'object',
                description: 'Props to update (e.g., backgroundColor, color, textColor).',
              },
            },
            required: ['blockId', 'props'],
          },
        },
      },
      required: ['mutations'],
    },
  },
  {
    name: 'change_typography',
    description:
      'Change fonts and type scale across the page. Updates fontFamily, fontSize, fontWeight, and lineHeight on text blocks.',
    input_schema: {
      type: 'object' as const,
      properties: {
        mutations: {
          type: 'array',
          description: 'Array of {blockId, props} updates to apply the new typography.',
          items: {
            type: 'object',
            properties: {
              blockId: { type: 'string' },
              props: {
                type: 'object',
                description: 'Props to update (e.g., fontFamily, fontSize, fontWeight, lineHeight).',
              },
            },
            required: ['blockId', 'props'],
          },
        },
      },
      required: ['mutations'],
    },
  },
  {
    name: 'adjust_spacing',
    description:
      'Adjust spacing density across the page: compact, comfortable, or spacious. Updates padding, gap, and margin values on layout blocks.',
    input_schema: {
      type: 'object' as const,
      properties: {
        density: {
          type: 'string',
          enum: ['compact', 'comfortable', 'spacious'],
          description: 'Target spacing density.',
        },
        mutations: {
          type: 'array',
          description: 'Array of {blockId, props} updates to apply the new spacing.',
          items: {
            type: 'object',
            properties: {
              blockId: { type: 'string' },
              props: {
                type: 'object',
                description: 'Props to update (e.g., paddingTop, paddingBottom, gap, paddingX).',
              },
            },
            required: ['blockId', 'props'],
          },
        },
      },
      required: ['density', 'mutations'],
    },
  },
  {
    name: 'change_block_style',
    description:
      'Update style properties on a single block. Use for targeted visual changes like border radius, shadows, colors, or sizing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        blockId: {
          type: 'string',
          description: 'The ID of the block to style.',
        },
        props: {
          type: 'object',
          description: 'Style props to update on the block.',
        },
      },
      required: ['blockId', 'props'],
    },
  },
];

// -------------------------------------------------------------------------
// Tool executors
// -------------------------------------------------------------------------

export function executeDesignTool(
  toolName: string,
  input: Record<string, unknown>,
  _pageContext?: PageSummary,
  _sectionMap?: SectionMapEntry[],
): EditorMutation[] {
  switch (toolName) {
    case 'change_color_scheme':
      return executeBatchUpdate(input);
    case 'change_typography':
      return executeBatchUpdate(input);
    case 'adjust_spacing':
      return executeBatchUpdate(input);
    case 'change_block_style':
      return executeSingleBlockStyle(input);
    default:
      throw new Error(`Unknown design tool: ${toolName}`);
  }
}

function executeBatchUpdate(input: Record<string, unknown>): EditorMutation[] {
  const { mutations } = input as {
    mutations: Array<{ blockId: string; props: Record<string, unknown> }>;
  };

  if (!Array.isArray(mutations)) {
    throw new Error('mutations must be an array of {blockId, props}');
  }

  return mutations.map((m) => ({
    type: 'updateBlockProps' as const,
    blockId: m.blockId,
    props: m.props,
  }));
}

function executeSingleBlockStyle(input: Record<string, unknown>): EditorMutation[] {
  const { blockId, props } = input as { blockId: string; props: Record<string, unknown> };

  if (!blockId || !props) {
    throw new Error('change_block_style requires blockId and props');
  }

  return [{ type: 'updateBlockProps', blockId, props }];
}
