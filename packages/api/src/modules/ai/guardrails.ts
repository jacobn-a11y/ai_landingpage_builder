/**
 * Block 18: Guardrails
 *
 * Validates a batch of editor mutations against safety and structural limits
 * before they are applied. Rejects the entire batch if any guard fails.
 */

import type { EditorMutation } from './ai.types.js';

// ---------------------------------------------------------------------------
// Types (lightweight copies to avoid cross-package import)
// ---------------------------------------------------------------------------

export interface EditorBlock {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: string[];
  meta?: Record<string, unknown>;
}

export interface EditorContentJson {
  root: string;
  blocks: Record<string, EditorBlock>;
  layoutMode?: string;
  pageSettings?: Record<string, unknown>;
}

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  suggestion?: string;
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

const MAX_BLOCKS = 200;
const MAX_NESTING_DEPTH = 6;
const MIN_SECTIONS = 1;
const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 200;
const OPACITY_MIN = 0;
const OPACITY_MAX = 100;
const TEXT_MAX_LENGTH = 10_000;

// XSS injection patterns
const SCRIPT_PATTERN = /<script[\s>]/i;
const EVENT_HANDLER_PATTERN = /\bon\w+\s*=\s*["']/i;
const JAVASCRIPT_URI_PATTERN = /javascript\s*:/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countBlocksAfterMutations(
  current: EditorContentJson,
  mutations: EditorMutation[],
): number {
  let count = Object.keys(current.blocks).length;
  for (const m of mutations) {
    if (m.type === 'insertBlock') count++;
    if (m.type === 'removeBlock') count--;
  }
  return count;
}

function computeNestingDepth(
  blocks: Record<string, EditorBlock>,
  blockId: string,
  visited = new Set<string>(),
): number {
  if (visited.has(blockId)) return 0;
  visited.add(blockId);

  const block = blocks[blockId];
  if (!block?.children?.length) return 1;

  let maxChild = 0;
  for (const childId of block.children) {
    const d = computeNestingDepth(blocks, childId, visited);
    if (d > maxChild) maxChild = d;
  }
  return 1 + maxChild;
}

function countSectionsAfterMutations(
  current: EditorContentJson,
  mutations: EditorMutation[],
): number {
  let count = Object.values(current.blocks).filter((b) => b.type === 'section').length;
  for (const m of mutations) {
    if (m.type === 'insertBlock' && m.blockType === 'section') count++;
    if (m.type === 'removeBlock') {
      const block = current.blocks[m.blockId];
      if (block?.type === 'section') count--;
    }
  }
  return count;
}

function parseFontSize(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function validateBlockCount(
  mutations: EditorMutation[],
  content: EditorContentJson,
): GuardrailResult | null {
  const projected = countBlocksAfterMutations(content, mutations);
  if (projected > MAX_BLOCKS) {
    return {
      allowed: false,
      reason: `Block limit exceeded: ${projected} blocks (max ${MAX_BLOCKS}).`,
      suggestion: 'Remove some blocks before adding more.',
    };
  }
  return null;
}

function validateSectionMinimum(
  mutations: EditorMutation[],
  content: EditorContentJson,
): GuardrailResult | null {
  const projected = countSectionsAfterMutations(content, mutations);
  if (projected < MIN_SECTIONS) {
    return {
      allowed: false,
      reason: `At least ${MIN_SECTIONS} section is required.`,
      suggestion: 'Keep at least one section on the page.',
    };
  }
  return null;
}

function validateNesting(content: EditorContentJson): GuardrailResult | null {
  const rootBlock = content.blocks[content.root];
  if (!rootBlock) return null;

  const depth = computeNestingDepth(content.blocks, content.root);
  if (depth > MAX_NESTING_DEPTH) {
    return {
      allowed: false,
      reason: `Nesting depth ${depth} exceeds maximum of ${MAX_NESTING_DEPTH}.`,
      suggestion: 'Flatten the block structure to reduce nesting.',
    };
  }
  return null;
}

/** Extract props from a mutation regardless of its shape. */
function getMutationProps(m: EditorMutation): Record<string, unknown> | undefined {
  if (m.type === 'insertBlock' || m.type === 'updateBlockProps') return m.props;
  if (m.type === 'replaceText') return { content: m.content };
  return undefined;
}

function validateProps(mutations: EditorMutation[]): GuardrailResult | null {
  for (const m of mutations) {
    const props = getMutationProps(m);
    if (!props) continue;

    // Font size
    const fontSize = parseFontSize(props.fontSize);
    if (fontSize !== null && (fontSize < FONT_SIZE_MIN || fontSize > FONT_SIZE_MAX)) {
      return {
        allowed: false,
        reason: `Font size ${fontSize}px is out of range (${FONT_SIZE_MIN}-${FONT_SIZE_MAX}px).`,
        suggestion: `Use a font size between ${FONT_SIZE_MIN} and ${FONT_SIZE_MAX}px.`,
      };
    }

    // Opacity
    const opacity = typeof props.opacity === 'number' ? props.opacity : null;
    if (opacity !== null && (opacity < OPACITY_MIN || opacity > OPACITY_MAX)) {
      return {
        allowed: false,
        reason: `Opacity ${opacity} is out of range (${OPACITY_MIN}-${OPACITY_MAX}).`,
        suggestion: `Use an opacity value between ${OPACITY_MIN} and ${OPACITY_MAX}.`,
      };
    }

    // Text length + XSS injection
    for (const [key, val] of Object.entries(props)) {
      if (typeof val !== 'string') continue;

      if (
        (key === 'text' || key === 'content' || key === 'html' || key === 'contentHtml') &&
        val.length > TEXT_MAX_LENGTH
      ) {
        return {
          allowed: false,
          reason: `Text content in "${key}" exceeds ${TEXT_MAX_LENGTH} characters.`,
          suggestion: 'Shorten the text content.',
        };
      }

      // XSS checks: <script>, event handlers (on*="..."), javascript: URIs
      if (SCRIPT_PATTERN.test(val)) {
        return {
          allowed: false,
          reason: `Potential script injection detected in "${key}".`,
          suggestion: 'Remove <script> tags from text content.',
        };
      }

      if (EVENT_HANDLER_PATTERN.test(val)) {
        return {
          allowed: false,
          reason: `Potential event handler injection detected in "${key}".`,
          suggestion: 'Remove inline event handlers (onclick, onerror, etc.) from content.',
        };
      }

      if (JAVASCRIPT_URI_PATTERN.test(val)) {
        return {
          allowed: false,
          reason: `Potential javascript: URI detected in "${key}".`,
          suggestion: 'Remove javascript: URIs from content.',
        };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main validation entry point
// ---------------------------------------------------------------------------

/**
 * Validates a batch of mutations against all guardrails.
 * Returns `{ allowed: true }` if all checks pass, or the first failing result.
 */
export function validateMutationBatch(
  mutations: EditorMutation[],
  currentContent: EditorContentJson,
): GuardrailResult {
  const checks = [
    validateBlockCount(mutations, currentContent),
    validateSectionMinimum(mutations, currentContent),
    validateNesting(currentContent),
    validateProps(mutations),
  ];

  for (const result of checks) {
    if (result && !result.allowed) return result;
  }

  return { allowed: true };
}
