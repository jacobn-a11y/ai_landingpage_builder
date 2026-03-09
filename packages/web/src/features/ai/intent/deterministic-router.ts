/**
 * Deterministic Intent Router — Block 7
 *
 * Pattern-matches user messages to deterministic intents so we can
 * skip the LLM for simple, well-defined operations.
 *
 * Falls through to `{ type: 'needsLLM' }` for anything not
 * confidently matched.
 */

import type { PageSummary } from '../page-context';
import type { SectionMapEntry } from '../section-map';
import type { Intent } from './types';
import { resolveColor } from './color-names';
import { resolveBlockReference, type ResolverContext } from './block-resolver';
import type { EditorContentJson } from '../../pages/editor/types';

export interface ClassifyContext {
  selectedBlockId?: string;
  pageSummary: PageSummary;
  sectionMap: SectionMapEntry[];
  content: EditorContentJson;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function needsLLM(message: string, context: PageSummary): Intent {
  return { type: 'needsLLM', userMessage: message, context };
}

/**
 * Try to resolve a block reference from the message, falling back to
 * the selected block.
 */
function resolveTarget(
  message: string,
  ctx: ClassifyContext,
): string | null {
  const lower = message.toLowerCase();

  // Build a ResolverContext
  const resolverCtx: ResolverContext = {
    selectedBlockId: ctx.selectedBlockId,
    content: ctx.content,
    sectionMap: ctx.sectionMap,
  };

  // Try explicit references
  const refPatterns = [
    /(?:the\s+\w+\s+\w+)/,  // "the second button"
    /(?:the\s+\w+)/,         // "the headline"
    /\bthis\b/,
    /\bit\b/,
  ];

  for (const pat of refPatterns) {
    const match = lower.match(pat);
    if (match) {
      const resolved = resolveBlockReference(match[0], resolverCtx);
      if (resolved) return resolved;
    }
  }

  // Default to selectedBlockId
  return ctx.selectedBlockId ?? null;
}

// ---------------------------------------------------------------------------
// Pattern matchers — each returns an Intent or null
// ---------------------------------------------------------------------------

type PatternMatcher = (message: string, ctx: ClassifyContext) => Intent | null;

/**
 * "make it bigger/larger/smaller" or "make the headline bigger"
 * "increase/decrease font size"
 * "make it much bigger"
 */
const matchFontSize: PatternMatcher = (message, ctx) => {
  const lower = message.toLowerCase();

  // Relative sizing
  const sizePatterns: [RegExp, number][] = [
    [/\bmuch\s+(?:bigger|larger)\b/, 8],
    [/\bmuch\s+(?:smaller|tinier)\b/, -8],
    [/\b(?:bigger|larger)\b/, 4],
    [/\b(?:smaller|tinier)\b/, -4],
    [/\bincrease\s+(?:the\s+)?(?:font\s+)?size\b/, 4],
    [/\bdecrease\s+(?:the\s+)?(?:font\s+)?size\b/, -4],
  ];

  for (const [pattern, delta] of sizePatterns) {
    if (pattern.test(lower)) {
      const blockId = resolveTarget(message, ctx);
      if (!blockId) return null;
      return { type: 'changeFontSize', blockId, delta };
    }
  }

  // Absolute sizing: "set font size to 24" or "make font size 24px"
  const absMatch = lower.match(
    /(?:set|change|make)\s+(?:the\s+)?font\s*size\s+(?:to\s+)?(\d+)/,
  );
  if (absMatch) {
    const blockId = resolveTarget(message, ctx);
    if (!blockId) return null;
    return { type: 'setFontSize', blockId, value: parseInt(absMatch[1], 10) };
  }

  return null;
};

/**
 * "change ... to red" / "make it blue" / "make the background green"
 * "change background color to #FF0000"
 */
const matchColor: PatternMatcher = (message, ctx) => {
  const lower = message.toLowerCase();

  // "make [target] [color]" — simple form
  const makeColorMatch = lower.match(
    /\bmake\s+(?:it|this|the\s+\w+)?\s*(\w+)\s*$/,
  );
  if (makeColorMatch) {
    const colorVal = resolveColor(makeColorMatch[1]);
    if (colorVal) {
      const blockId = resolveTarget(message, ctx);
      if (!blockId) return null;
      // Determine prop from context: if "background" mentioned, use backgroundColor
      const prop = lower.includes('background')
        ? 'backgroundColor'
        : 'textColor';
      return { type: 'changeColor', blockId, prop, value: colorVal };
    }
  }

  // "change [prop] to [color]" / "change color to [color]"
  const changeToMatch = lower.match(
    /\b(?:change|set)\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+(?:color\s+)?to\s+(.+)$/,
  );
  if (changeToMatch) {
    const propRef = changeToMatch[1].trim();
    const colorRef = changeToMatch[2].trim();
    const colorVal = resolveColor(colorRef);
    if (colorVal) {
      const blockId = resolveTarget(message, ctx);
      if (!blockId) return null;
      let prop = 'textColor';
      if (propRef.includes('background') || propRef.includes('bg')) {
        prop = 'backgroundColor';
      } else if (propRef.includes('button')) {
        prop = 'buttonBgColor';
      } else if (propRef.includes('border')) {
        prop = 'borderColor';
      } else if (propRef.includes('text') || propRef.includes('font')) {
        prop = 'textColor';
      }
      return { type: 'changeColor', blockId, prop, value: colorVal };
    }
  }

  // "make it/this [color]" with background or text qualifier
  const colorDirectMatch = lower.match(
    /\b(?:change|make)\s+(?:the\s+)?(?:(\w+)\s+)?(?:color\s+)?(?:to\s+)?(\w+)\s*$/,
  );
  if (colorDirectMatch) {
    const qualifier = colorDirectMatch[1];
    const colorRef = colorDirectMatch[2];
    const colorVal = resolveColor(colorRef);
    if (colorVal) {
      const blockId = resolveTarget(message, ctx);
      if (!blockId) return null;
      let prop = 'textColor';
      if (qualifier && (qualifier.includes('background') || qualifier.includes('bg'))) {
        prop = 'backgroundColor';
      }
      return { type: 'changeColor', blockId, prop, value: colorVal };
    }
  }

  return null;
};

/**
 * "change font to Inter" / "use Roboto" / "switch font to Poppins"
 */
const matchFont: PatternMatcher = (message, ctx) => {
  const lower = message.toLowerCase();
  const fontMatch = lower.match(
    /\b(?:change|set|switch|use)\s+(?:the\s+)?font(?:\s+family)?\s+to\s+(.+)$/,
  );
  if (fontMatch) {
    const blockId = resolveTarget(message, ctx);
    if (!blockId) return null;
    // Preserve original casing for font family name
    const fontFamily = message.match(
      /\b(?:change|set|switch|use)\s+(?:the\s+)?font(?:\s+family)?\s+to\s+(.+)$/i,
    )?.[1]?.trim();
    if (!fontFamily) return null;
    return { type: 'changeFont', blockId, fontFamily };
  }
  return null;
};

/**
 * "delete this" / "remove the hero" / "delete this block"
 */
const matchRemove: PatternMatcher = (message, ctx) => {
  const lower = message.toLowerCase();
  const removeMatch = lower.match(
    /\b(?:delete|remove|get rid of)\s+(.+?)(?:\s+block)?$/,
  );
  if (removeMatch) {
    const ref = removeMatch[1].trim();
    const resolverCtx: ResolverContext = {
      selectedBlockId: ctx.selectedBlockId,
      content: ctx.content,
      sectionMap: ctx.sectionMap,
    };
    const blockId = resolveBlockReference(ref, resolverCtx) ?? ctx.selectedBlockId;
    if (!blockId) return null;
    return { type: 'removeBlock', blockId };
  }
  return null;
};

/**
 * "duplicate this" / "copy this block"
 */
const matchDuplicate: PatternMatcher = (message, ctx) => {
  const lower = message.toLowerCase();
  if (/\b(?:duplicate|copy|clone)\s+(?:this|it|the\s+\w+)/.test(lower)) {
    const blockId = resolveTarget(message, ctx);
    if (!blockId) return null;
    return { type: 'duplicateBlock', blockId };
  }
  return null;
};

/**
 * "move this up" / "move the section down"
 */
const matchReorder: PatternMatcher = (message, ctx) => {
  const lower = message.toLowerCase();
  const reorderMatch = lower.match(
    /\b(?:move|shift)\s+(.+?)\s+(up|down)\b/,
  );
  if (reorderMatch) {
    const ref = reorderMatch[1].trim();
    const direction = reorderMatch[2] as 'up' | 'down';
    const resolverCtx: ResolverContext = {
      selectedBlockId: ctx.selectedBlockId,
      content: ctx.content,
      sectionMap: ctx.sectionMap,
    };
    const blockId = resolveBlockReference(ref, resolverCtx) ?? ctx.selectedBlockId;
    if (!blockId) return null;
    return { type: 'reorder', blockId, direction };
  }
  return null;
};

/**
 * "center this" / "left-align the headline" / "right align it"
 */
const matchAlignment: PatternMatcher = (message, ctx) => {
  const lower = message.toLowerCase();
  const alignMatch = lower.match(
    /\b(center|left[\s-]?align|right[\s-]?align|align\s+(?:to\s+the\s+)?(left|center|right))\b/,
  );
  if (alignMatch) {
    let align: 'left' | 'center' | 'right' = 'center';
    const matched = alignMatch[0].toLowerCase();
    if (matched.includes('left')) align = 'left';
    else if (matched.includes('right')) align = 'right';
    else align = 'center';

    const blockId = resolveTarget(message, ctx);
    if (!blockId) return null;
    return { type: 'changeAlignment', blockId, align };
  }
  return null;
};

/**
 * "hide on mobile" / "hide this on desktop" / "show on tablet"
 */
const matchVisibility: PatternMatcher = (message, ctx) => {
  const lower = message.toLowerCase();
  const visMatch = lower.match(
    /\b(?:hide|show|toggle)\s+(?:this\s+)?(?:block\s+)?(?:on\s+)?(desktop|tablet|mobile)\b/,
  );
  if (visMatch) {
    const device = visMatch[1] as 'desktop' | 'tablet' | 'mobile';
    const blockId = resolveTarget(message, ctx);
    if (!blockId) return null;
    return { type: 'toggleVisibility', blockId, device };
  }
  return null;
};

/**
 * "add a hero section" / "add a features section after the hero"
 * "insert a testimonials section"
 */
const matchAddSection: PatternMatcher = (message, ctx) => {
  const lower = message.toLowerCase();
  const addMatch = lower.match(
    /\b(?:add|insert|create)\s+(?:a\s+)?(\w+)\s+section(?:\s+(before|after)\s+(.+))?$/,
  );
  if (addMatch) {
    const sectionType = addMatch[1];
    const position = (addMatch[2] as 'before' | 'after') ?? 'after';
    const refStr = addMatch[3];
    let referenceId: string | undefined;
    if (refStr) {
      const resolverCtx: ResolverContext = {
        selectedBlockId: ctx.selectedBlockId,
        content: ctx.content,
        sectionMap: ctx.sectionMap,
      };
      referenceId = resolveBlockReference(refStr, resolverCtx) ?? undefined;
    }
    return { type: 'addSection', sectionType, position, referenceId };
  }
  return null;
};

// ---------------------------------------------------------------------------
// Main classifier
// ---------------------------------------------------------------------------

/**
 * All matchers in priority order.
 * First match wins.
 */
const MATCHERS: PatternMatcher[] = [
  matchRemove,
  matchDuplicate,
  matchReorder,
  matchAddSection,
  matchVisibility,
  matchAlignment,
  matchFontSize,
  matchFont,
  matchColor,
];

/**
 * Classify a user message into a deterministic intent or fall through
 * to `needsLLM`.
 */
export function classifyIntent(
  message: string,
  context: ClassifyContext,
): Intent {
  for (const matcher of MATCHERS) {
    const result = matcher(message, context);
    if (result) return result;
  }

  return needsLLM(message, context.pageSummary);
}
