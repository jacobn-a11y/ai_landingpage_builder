/**
 * Block 18: Guardrails
 *
 * Validates a batch of editor mutations against safety and structural limits
 * before they are applied. Rejects the entire batch if any guard fails.
 */

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

export type EditorMutationType =
  | 'addBlock'
  | 'updateBlock'
  | 'removeBlock'
  | 'moveBlock'
  | 'updatePageSettings';

export interface EditorMutation {
  type: EditorMutationType;
  blockId?: string;
  parentId?: string;
  index?: number;
  blockType?: string;
  props?: Record<string, unknown>;
  children?: string[];
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

// Script injection pattern (basic but effective for user-supplied text)
const SCRIPT_PATTERN = /<script[\s>]/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countBlocksAfterMutations(
  current: EditorContentJson,
  mutations: EditorMutation[],
): number {
  let count = Object.keys(current.blocks).length;
  for (const m of mutations) {
    if (m.type === 'addBlock') count++;
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
    if (m.type === 'addBlock' && m.blockType === 'section') count++;
    if (m.type === 'removeBlock' && m.blockId) {
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

function validateProps(mutations: EditorMutation[]): GuardrailResult | null {
  for (const m of mutations) {
    if (!m.props) continue;

    // Font size
    const fontSize = parseFontSize(m.props.fontSize);
    if (fontSize !== null && (fontSize < FONT_SIZE_MIN || fontSize > FONT_SIZE_MAX)) {
      return {
        allowed: false,
        reason: `Font size ${fontSize}px is out of range (${FONT_SIZE_MIN}-${FONT_SIZE_MAX}px).`,
        suggestion: `Use a font size between ${FONT_SIZE_MIN} and ${FONT_SIZE_MAX}px.`,
      };
    }

    // Opacity
    const opacity = typeof m.props.opacity === 'number' ? m.props.opacity : null;
    if (opacity !== null && (opacity < OPACITY_MIN || opacity > OPACITY_MAX)) {
      return {
        allowed: false,
        reason: `Opacity ${opacity} is out of range (${OPACITY_MIN}-${OPACITY_MAX}).`,
        suggestion: `Use an opacity value between ${OPACITY_MIN} and ${OPACITY_MAX}.`,
      };
    }

    // Text length + script injection
    for (const [key, val] of Object.entries(m.props)) {
      if (typeof val !== 'string') continue;

      if (
        (key === 'text' || key === 'content' || key === 'html') &&
        val.length > TEXT_MAX_LENGTH
      ) {
        return {
          allowed: false,
          reason: `Text content in "${key}" exceeds ${TEXT_MAX_LENGTH} characters.`,
          suggestion: 'Shorten the text content.',
        };
      }

      if (SCRIPT_PATTERN.test(val)) {
        return {
          allowed: false,
          reason: `Potential script injection detected in "${key}".`,
          suggestion: 'Remove <script> tags from text content.',
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
