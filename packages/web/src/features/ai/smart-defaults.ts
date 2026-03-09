/**
 * Block 18: Smart Defaults
 *
 * Enriches an EditorMutation for a new/updated block by inheriting styles
 * from the existing page context (font family, colors, spacing, etc.).
 */

import type { EditorContentJson } from '@/features/pages/editor/types';
import type { EditorMutation, PageSummary } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick the most common value from a string array. */
function mostCommon(arr: string[]): string | undefined {
  if (arr.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const v of arr) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [val, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = val;
    }
  }
  return best;
}

/**
 * Build a lightweight PageSummary from EditorContentJson.
 * Can be used when the caller does not already have a summary.
 */
export function buildPageSummary(
  pageId: string,
  title: string,
  content: EditorContentJson,
): PageSummary {
  const blocks = Object.values(content.blocks);
  const sectionCount = blocks.filter((b) => b.type === 'section').length;

  const buttonColors: string[] = [];
  const headlineStyles: PageSummary['headlineStyles'] = [];

  for (const block of blocks) {
    const props = block.props as Record<string, unknown> | undefined;
    if (!props) continue;

    if (block.type === 'button' && typeof props.backgroundColor === 'string') {
      buttonColors.push(props.backgroundColor);
    }

    if (block.type === 'headline') {
      headlineStyles.push({
        fontFamily: typeof props.fontFamily === 'string' ? props.fontFamily : undefined,
        fontWeight: typeof props.fontWeight === 'string' ? props.fontWeight : undefined,
        fontSize: typeof props.fontSize === 'string'
          ? props.fontSize
          : typeof props.fontSize === 'number'
            ? `${props.fontSize}px`
            : undefined,
      });
    }
  }

  return {
    pageId,
    title,
    fontFamily: content.pageSettings?.fontFamily,
    headlineFontFamily: content.pageSettings?.headlineFontFamily,
    primaryColor: mostCommon(buttonColors),
    backgroundColor: content.pageSettings?.backgroundColor,
    blockCount: blocks.length,
    sectionCount,
    buttonColors,
    headlineStyles,
  };
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Apply smart defaults to a mutation based on existing page styles.
 *
 * Only fills in properties that are NOT already set on the mutation, so
 * explicit user/AI choices always take precedence.
 */
export function applySmartDefaults(
  mutation: EditorMutation,
  pageContext: PageSummary,
  _content: EditorContentJson,
): EditorMutation {
  // Only relevant for addBlock and updateBlock
  if (mutation.type !== 'addBlock' && mutation.type !== 'updateBlock') {
    return mutation;
  }

  const props = { ...(mutation.props ?? {}) };
  const blockType = mutation.blockType ?? '';

  // -----------------------------------------------------------------------
  // Font family inheritance
  // -----------------------------------------------------------------------

  if (!props.fontFamily) {
    if (
      blockType === 'headline' &&
      pageContext.headlineFontFamily
    ) {
      props.fontFamily = pageContext.headlineFontFamily;
    } else if (pageContext.fontFamily) {
      props.fontFamily = pageContext.fontFamily;
    }
  }

  // -----------------------------------------------------------------------
  // Headline styles from existing headlines
  // -----------------------------------------------------------------------

  if (blockType === 'headline' && pageContext.headlineStyles.length > 0) {
    const ref = pageContext.headlineStyles[0];
    if (!props.fontWeight && ref.fontWeight) {
      props.fontWeight = ref.fontWeight;
    }
    if (!props.fontSize && ref.fontSize) {
      props.fontSize = ref.fontSize;
    }
  }

  // -----------------------------------------------------------------------
  // Button color matching
  // -----------------------------------------------------------------------

  if (blockType === 'button') {
    if (!props.backgroundColor && pageContext.primaryColor) {
      props.backgroundColor = pageContext.primaryColor;
    }
    // Ensure text is white on dark backgrounds (simple heuristic)
    if (!props.color && typeof props.backgroundColor === 'string') {
      props.color = isDark(props.backgroundColor) ? '#ffffff' : '#000000';
    }
  }

  // -----------------------------------------------------------------------
  // Section background from page
  // -----------------------------------------------------------------------

  if (blockType === 'section' && !props.backgroundColor && pageContext.backgroundColor) {
    // Don't blindly copy – only if the page has a non-white bg
    if (pageContext.backgroundColor !== '#ffffff' && pageContext.backgroundColor !== 'white') {
      props.backgroundColor = pageContext.backgroundColor;
    }
  }

  return { ...mutation, props };
}

// ---------------------------------------------------------------------------
// Color utility
// ---------------------------------------------------------------------------

/** Very simple hex darkness check. Returns true if the color is "dark". */
function isDark(hex: string): boolean {
  const cleaned = hex.replace('#', '');
  if (cleaned.length < 6) return false;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  // Perceived brightness (ITU-R BT.601)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}
