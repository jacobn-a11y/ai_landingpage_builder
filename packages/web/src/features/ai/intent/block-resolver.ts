/**
 * Block Resolver — Block 7
 *
 * Resolves natural-language block references ("the headline",
 * "the second section", "this") to concrete block IDs.
 */

import type { EditorContentJson, EditorBlock } from '../../pages/editor/types';
import type { SectionMapEntry } from '../section-map';

export interface ResolverContext {
  selectedBlockId?: string;
  content: EditorContentJson;
  sectionMap: SectionMapEntry[];
}

// Ordinal words → 0-based index
const ORDINALS: Record<string, number> = {
  first: 0,
  second: 1,
  third: 2,
  fourth: 3,
  fifth: 4,
  sixth: 5,
  seventh: 6,
  eighth: 7,
  ninth: 8,
  tenth: 9,
  last: -1,
};

// Aliases for block types people might say
const TYPE_ALIASES: Record<string, string[]> = {
  headline: ['headline', 'heading', 'title', 'header'],
  paragraph: ['paragraph', 'text', 'body text', 'description'],
  button: ['button', 'cta', 'call to action'],
  image: ['image', 'photo', 'picture', 'img'],
  hero: ['hero', 'hero section', 'banner'],
  features: ['features', 'features section'],
  testimonials: ['testimonials', 'testimonial', 'reviews', 'testimonials section'],
  faq: ['faq', 'faqs', 'faq section', 'questions'],
  logos: ['logos', 'logo', 'logos section', 'partners'],
  form: ['form', 'signup form', 'contact form'],
  video: ['video', 'embed'],
  divider: ['divider', 'separator', 'line', 'hr'],
  spacer: ['spacer', 'space', 'gap'],
  section: ['section'],
  container: ['container', 'wrapper'],
  grid: ['grid'],
  columns: ['columns', 'column'],
  carousel: ['carousel', 'slider', 'slideshow'],
  accordion: ['accordion'],
  table: ['table'],
  countdown: ['countdown', 'timer'],
};

// Build reverse map: alias → blockType
const ALIAS_TO_TYPE: Record<string, string> = {};
for (const [blockType, aliases] of Object.entries(TYPE_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_TO_TYPE[alias] = blockType;
  }
}

/**
 * Find all blocks of a given type, depth-first from root.
 */
function findBlocksByType(
  content: EditorContentJson,
  targetType: string,
): EditorBlock[] {
  const blocks = content.blocks ?? {};
  const results: EditorBlock[] = [];

  function walk(blockId: string) {
    const block = blocks[blockId];
    if (!block) return;
    if (block.type === targetType) {
      results.push(block);
    }
    for (const childId of block.children ?? []) {
      walk(childId);
    }
  }

  const root = content.root ? blocks[content.root] : undefined;
  if (root) {
    for (const childId of root.children ?? []) {
      walk(childId);
    }
  }
  return results;
}

/**
 * Parse an ordinal or numeric reference from a string.
 * Returns a 0-based index or null.
 *
 * Examples: "second" → 1, "3rd" → 2, "section 2" → 1
 */
function parseOrdinal(ref: string): number | null {
  // Word ordinals
  for (const [word, idx] of Object.entries(ORDINALS)) {
    if (ref.includes(word)) return idx;
  }

  // Numeric: "2nd", "3rd", "section 2"
  const numMatch = ref.match(/(\d+)(?:st|nd|rd|th)?/);
  if (numMatch) {
    return parseInt(numMatch[1], 10) - 1; // convert to 0-based
  }

  return null;
}

/**
 * Resolve a natural-language block reference to a block ID.
 *
 * Examples:
 *   "this" / "the selected block" → selectedBlockId
 *   "the headline" → first headline block
 *   "the second section" → sectionMap[1].sectionId
 *   "the hero" → hero section from sectionMap
 *   "the button" → first button block
 */
export function resolveBlockReference(
  ref: string,
  context: ResolverContext,
): string | null {
  const lower = ref.toLowerCase().trim();

  // 1. "this" / "selected" / "current" → selectedBlockId
  if (
    lower === 'this' ||
    lower === 'it' ||
    lower.includes('selected') ||
    lower.includes('current')
  ) {
    return context.selectedBlockId ?? null;
  }

  // 2. Section references: "the Nth section", "section N"
  const sectionMatch = lower.match(
    /(?:the\s+)?(?:(\w+)\s+)?section(?:\s+(\d+))?/,
  );
  if (sectionMatch) {
    const qualifier = sectionMatch[1];
    const numStr = sectionMatch[2];

    // "section 2" or "section 3"
    if (numStr) {
      const idx = parseInt(numStr, 10) - 1;
      if (idx >= 0 && idx < context.sectionMap.length) {
        return context.sectionMap[idx].sectionId;
      }
    }

    // "the second section", "the first section"
    if (qualifier) {
      const ordIdx = ORDINALS[qualifier];
      if (ordIdx !== undefined) {
        const resolved =
          ordIdx === -1 ? context.sectionMap.length - 1 : ordIdx;
        if (resolved >= 0 && resolved < context.sectionMap.length) {
          return context.sectionMap[resolved].sectionId;
        }
      }

      // "the hero section", "the features section"
      const sectionType = ALIAS_TO_TYPE[qualifier];
      if (sectionType) {
        const entry = context.sectionMap.find(
          (e) => e.type === sectionType,
        );
        if (entry) return entry.sectionId;
      }
    }
  }

  // 3. Pattern section by name: "the hero", "the faq"
  for (const [alias, blockType] of Object.entries(ALIAS_TO_TYPE)) {
    if (lower === alias || lower === `the ${alias}`) {
      // Check section map first
      const sectionEntry = context.sectionMap.find(
        (e) => e.type === blockType,
      );
      if (sectionEntry) return sectionEntry.sectionId;

      // Then look in all blocks
      const found = findBlocksByType(context.content, blockType);
      if (found.length > 0) return found[0].id;
    }
  }

  // 4. Type reference with optional ordinal: "the headline", "the second button"
  for (const [alias, blockType] of Object.entries(ALIAS_TO_TYPE)) {
    // "the [ordinal] alias"
    const ordinalPattern = new RegExp(
      `(?:the\\s+)(\\w+)\\s+${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    );
    const ordMatch = lower.match(ordinalPattern);
    if (ordMatch) {
      const ordIdx = ORDINALS[ordMatch[1]];
      if (ordIdx !== undefined) {
        const found = findBlocksByType(context.content, blockType);
        const resolved = ordIdx === -1 ? found.length - 1 : ordIdx;
        if (resolved >= 0 && resolved < found.length) {
          return found[resolved].id;
        }
      }
    }

    // "the alias"
    if (lower === `the ${alias}` || lower === alias) {
      const found = findBlocksByType(context.content, blockType);
      if (found.length > 0) return found[0].id;
    }
  }

  return null;
}
