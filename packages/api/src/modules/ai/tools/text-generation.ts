/**
 * AI tool definitions for text content operations.
 * Each tool returns EditorMutation[] to apply to the page.
 */

import type { EditorMutation } from '../ai.types.js';

// -------------------------------------------------------------------------
// Tool definitions (Anthropic tool_use format)
// -------------------------------------------------------------------------

export const textGenerationTools = [
  {
    name: 'rewrite_text',
    description:
      'Rewrite the text content of an existing text, headline, or paragraph block. Use this to change tone, improve clarity, expand, shorten, or completely rewrite copy.',
    input_schema: {
      type: 'object' as const,
      properties: {
        blockId: {
          type: 'string',
          description: 'The ID of the block whose text should be rewritten.',
        },
        currentText: {
          type: 'string',
          description: 'The current text content of the block.',
        },
        newText: {
          type: 'string',
          description: 'The rewritten text to replace the current content.',
        },
        tone: {
          type: 'string',
          description: 'Target tone for the rewrite (e.g., professional, casual, urgent, friendly, persuasive).',
        },
      },
      required: ['blockId', 'newText'],
    },
  },
  {
    name: 'generate_headline',
    description:
      'Generate a new headline and insert it into the page, or replace an existing headline. Good for hero headlines, section titles, and feature headings.',
    input_schema: {
      type: 'object' as const,
      properties: {
        text: {
          type: 'string',
          description: 'The headline text to use.',
        },
        level: {
          type: 'number',
          description: 'Heading level (1-6). Default 2.',
        },
        targetBlockId: {
          type: 'string',
          description: 'If provided, replace this existing headline block. If omitted, insert a new headline.',
        },
        parentId: {
          type: 'string',
          description: 'Parent block ID for insertion (required if targetBlockId is not provided).',
        },
        index: {
          type: 'number',
          description: 'Insertion index within the parent (required if targetBlockId is not provided).',
        },
        style: {
          type: 'object',
          description: 'Optional style props: fontSize, fontWeight, color, textAlign.',
          properties: {
            fontSize: { type: 'string' },
            fontWeight: { type: 'string' },
            color: { type: 'string' },
            textAlign: { type: 'string' },
          },
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'generate_paragraph',
    description:
      'Generate a new paragraph and insert it into the page, or replace an existing paragraph. Use for body copy, descriptions, and supporting text.',
    input_schema: {
      type: 'object' as const,
      properties: {
        text: {
          type: 'string',
          description: 'The paragraph text to use.',
        },
        targetBlockId: {
          type: 'string',
          description: 'If provided, replace this existing paragraph block. If omitted, insert a new paragraph.',
        },
        parentId: {
          type: 'string',
          description: 'Parent block ID for insertion (required if targetBlockId is not provided).',
        },
        index: {
          type: 'number',
          description: 'Insertion index within the parent (required if targetBlockId is not provided).',
        },
        style: {
          type: 'object',
          description: 'Optional style props: fontSize, color, textAlign, lineHeight.',
          properties: {
            fontSize: { type: 'string' },
            color: { type: 'string' },
            textAlign: { type: 'string' },
            lineHeight: { type: 'string' },
          },
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'adjust_tone',
    description:
      'Adjust the tone of an existing text block to match a target voice. Useful for making copy more professional, casual, urgent, or friendly.',
    input_schema: {
      type: 'object' as const,
      properties: {
        blockId: {
          type: 'string',
          description: 'The ID of the block whose tone should be adjusted.',
        },
        newText: {
          type: 'string',
          description: 'The tone-adjusted text to replace the current content.',
        },
        targetTone: {
          type: 'string',
          enum: ['professional', 'casual', 'urgent', 'friendly', 'persuasive', 'formal'],
          description: 'The target tone for the text.',
        },
      },
      required: ['blockId', 'newText', 'targetTone'],
    },
  },
];

// -------------------------------------------------------------------------
// Tool executors
// -------------------------------------------------------------------------

export function executeTextTool(
  toolName: string,
  input: Record<string, unknown>,
): EditorMutation[] {
  switch (toolName) {
    case 'rewrite_text':
      return executeRewriteText(input);
    case 'generate_headline':
      return executeGenerateHeadline(input);
    case 'generate_paragraph':
      return executeGenerateParagraph(input);
    case 'adjust_tone':
      return executeAdjustTone(input);
    default:
      throw new Error(`Unknown text tool: ${toolName}`);
  }
}

function executeRewriteText(input: Record<string, unknown>): EditorMutation[] {
  const { blockId, newText } = input as { blockId: string; newText: string };
  return [{ type: 'replaceText', blockId, text: newText }];
}

function executeGenerateHeadline(input: Record<string, unknown>): EditorMutation[] {
  const { text, level, targetBlockId, parentId, index, style } = input as {
    text: string;
    level?: number;
    targetBlockId?: string;
    parentId?: string;
    index?: number;
    style?: Record<string, unknown>;
  };

  if (targetBlockId) {
    return [{ type: 'replaceText', blockId: targetBlockId, text }];
  }

  if (!parentId) {
    throw new Error('generate_headline requires either targetBlockId or parentId');
  }

  const blockId = `headline-${Date.now().toString(36)}`;
  return [
    {
      type: 'insertBlock',
      parentId,
      index: index ?? 0,
      block: {
        id: blockId,
        type: 'headline',
        props: {
          text,
          level: level ?? 2,
          fontSize: '36px',
          fontWeight: '700',
          ...style,
        },
      },
    },
  ];
}

function executeGenerateParagraph(input: Record<string, unknown>): EditorMutation[] {
  const { text, targetBlockId, parentId, index, style } = input as {
    text: string;
    targetBlockId?: string;
    parentId?: string;
    index?: number;
    style?: Record<string, unknown>;
  };

  if (targetBlockId) {
    return [{ type: 'replaceText', blockId: targetBlockId, text }];
  }

  if (!parentId) {
    throw new Error('generate_paragraph requires either targetBlockId or parentId');
  }

  const blockId = `paragraph-${Date.now().toString(36)}`;
  return [
    {
      type: 'insertBlock',
      parentId,
      index: index ?? 0,
      block: {
        id: blockId,
        type: 'paragraph',
        props: {
          text,
          fontSize: '16px',
          lineHeight: '1.6',
          ...style,
        },
      },
    },
  ];
}

function executeAdjustTone(input: Record<string, unknown>): EditorMutation[] {
  const { blockId, newText } = input as { blockId: string; newText: string };
  return [{ type: 'replaceText', blockId, text: newText }];
}
