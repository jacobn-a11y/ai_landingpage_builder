/**
 * AI tool registry — combines all tool categories and provides
 * a unified interface for the AI service to use.
 */

import type { EditorMutation, PageSummary, SectionMapEntry } from '../ai.types.js';
import { textGenerationTools, executeTextTool } from './text-generation.js';
import { designEditTools, executeDesignTool } from './design-edits.js';
import { structuralEditTools, executeStructuralTool } from './structural-edits.js';

// -------------------------------------------------------------------------
// Anthropic tool format
// -------------------------------------------------------------------------

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// -------------------------------------------------------------------------
// Tool registry
// -------------------------------------------------------------------------

const TEXT_TOOL_NAMES = new Set(textGenerationTools.map((t) => t.name));
const DESIGN_TOOL_NAMES = new Set(designEditTools.map((t) => t.name));
const STRUCTURAL_TOOL_NAMES = new Set(structuralEditTools.map((t) => t.name));

/**
 * Returns all tool definitions formatted for the Anthropic API.
 */
export function getAllTools(): AnthropicTool[] {
  return [
    ...textGenerationTools,
    ...designEditTools,
    ...structuralEditTools,
  ] as AnthropicTool[];
}

/**
 * Execute a tool by name and return the resulting mutations.
 */
export function executeTool(
  name: string,
  input: Record<string, unknown>,
  pageContext?: PageSummary,
  sectionMap?: SectionMapEntry[],
): EditorMutation[] {
  if (TEXT_TOOL_NAMES.has(name)) {
    return executeTextTool(name, input);
  }

  if (DESIGN_TOOL_NAMES.has(name)) {
    return executeDesignTool(name, input, pageContext, sectionMap);
  }

  if (STRUCTURAL_TOOL_NAMES.has(name)) {
    return executeStructuralTool(name, input, sectionMap);
  }

  throw new Error(`Unknown tool: ${name}. Available tools: ${getAllTools().map((t) => t.name).join(', ')}`);
}

/**
 * List all available tool names.
 */
export function listToolNames(): string[] {
  return getAllTools().map((t) => t.name);
}
