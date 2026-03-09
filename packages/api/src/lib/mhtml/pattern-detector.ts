/**
 * Pattern Detector — identifies repeated UI patterns (cards, testimonials,
 * pricing tiers, FAQ items, logos) and maps them to editor pattern blocks.
 *
 * Includes false-positive control: Tier B promotion only when the pattern
 * representation meets or exceeds Tier A fidelity.
 */

import type { ElementSnapshot, PageSnapshot } from './extract-snapshot.js';

// --- Types ---

export type PatternType =
  | 'card'
  | 'testimonial'
  | 'pricing_tier'
  | 'faq_item'
  | 'logo'
  | 'hero'
  | 'cta';

export interface DetectedPattern {
  type: PatternType;
  confidence: number;        // 0-1
  rootElement: ElementSnapshot;
  items: PatternItem[];      // Repeated instances
  tierBCandidate: boolean;   // Whether this could be promoted to Tier B
}

export interface PatternItem {
  element: ElementSnapshot;
  extractedData: PatternData;
}

export interface PatternData {
  heading?: string;
  text?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  price?: string;
  features?: string[];
  author?: string;
  quote?: string;
}

// --- Structural Hashing ---

/**
 * Generate a structural hash of an element's subtree.
 * Ignores text content and attribute values; focuses on tag structure.
 */
function structuralHash(element: ElementSnapshot, allElements: ElementSnapshot[], maxDepth = 5): string {
  const elementMap = new Map(allElements.map((el) => [el.importId, el]));

  function hash(el: ElementSnapshot, depth: number): string {
    if (depth >= maxDepth) return el.tagName;
    const childHashes = el.childImportIds
      .map((id) => elementMap.get(id))
      .filter((child): child is ElementSnapshot => child !== undefined && child.isVisible)
      .map((child) => hash(child, depth + 1));
    return `${el.tagName}(${childHashes.join(',')})`;
  }

  return hash(element, 0);
}

/**
 * Find groups of siblings with identical or near-identical structure.
 */
function findRepeatedGroups(
  siblings: ElementSnapshot[],
  allElements: ElementSnapshot[],
  minCount = 3,
): Map<string, ElementSnapshot[]> {
  const hashGroups = new Map<string, ElementSnapshot[]>();

  for (const sibling of siblings) {
    const hash = structuralHash(sibling, allElements);
    if (!hashGroups.has(hash)) {
      hashGroups.set(hash, []);
    }
    hashGroups.get(hash)!.push(sibling);
  }

  // Only return groups with enough members
  const result = new Map<string, ElementSnapshot[]>();
  for (const [hash, group] of hashGroups) {
    if (group.length >= minCount) {
      result.set(hash, group);
    }
  }
  return result;
}

// --- Data Extraction ---

function findInSubtree(
  root: ElementSnapshot,
  allElements: ElementSnapshot[],
  predicate: (el: ElementSnapshot) => boolean,
): ElementSnapshot | undefined {
  const elementMap = new Map(allElements.map((el) => [el.importId, el]));

  function search(el: ElementSnapshot): ElementSnapshot | undefined {
    if (predicate(el)) return el;
    for (const childId of el.childImportIds) {
      const child = elementMap.get(childId);
      if (child) {
        const found = search(child);
        if (found) return found;
      }
    }
    return undefined;
  }

  return search(root);
}

function getAllTextInSubtree(
  root: ElementSnapshot,
  allElements: ElementSnapshot[],
): string {
  const elementMap = new Map(allElements.map((el) => [el.importId, el]));
  const parts: string[] = [];

  function collect(el: ElementSnapshot): void {
    if (el.textContent) parts.push(el.textContent);
    for (const childId of el.childImportIds) {
      const child = elementMap.get(childId);
      if (child) collect(child);
    }
  }

  collect(root);
  return parts.join(' ').trim();
}

function extractPatternData(
  element: ElementSnapshot,
  allElements: ElementSnapshot[],
): PatternData {
  const data: PatternData = {};

  // Find heading
  const heading = findInSubtree(element, allElements, (el) =>
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.tagName),
  );
  if (heading) {
    data.heading = getAllTextInSubtree(heading, allElements);
  }

  // Find image
  const img = findInSubtree(element, allElements, (el) => el.tagName === 'img');
  if (img && img.attributes.src) {
    data.imageUrl = img.attributes.src;
  }

  // Find link/button
  const link = findInSubtree(element, allElements, (el) =>
    el.tagName === 'a' || el.tagName === 'button',
  );
  if (link) {
    data.linkText = getAllTextInSubtree(link, allElements);
    if (link.attributes.href) {
      data.linkUrl = link.attributes.href;
    }
  }

  // Find text content (excluding heading and link)
  const allText = getAllTextInSubtree(element, allElements);
  const headingText = data.heading || '';
  const linkText = data.linkText || '';
  data.text = allText
    .replace(headingText, '')
    .replace(linkText, '')
    .trim()
    .substring(0, 500); // Cap at 500 chars

  return data;
}

// --- Archetype Matching ---

function matchArchetype(
  group: ElementSnapshot[],
  allElements: ElementSnapshot[],
): { type: PatternType; confidence: number } | null {
  if (group.length === 0) return null;

  const sample = group[0];
  const hasImage = !!findInSubtree(sample, allElements, (el) => el.tagName === 'img');
  const hasHeading = !!findInSubtree(sample, allElements, (el) =>
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(el.tagName),
  );
  const hasLink = !!findInSubtree(sample, allElements, (el) =>
    el.tagName === 'a' || el.tagName === 'button',
  );
  const allText = getAllTextInSubtree(sample, allElements);

  // Logo: small image, minimal text
  if (hasImage && allText.length < 20 && sample.boundingBox.width < 200) {
    return { type: 'logo', confidence: 0.7 };
  }

  // Pricing tier: contains price-like content
  if (/\$[\d,]+|\d+\/mo|\/month|\/year|price/i.test(allText)) {
    return { type: 'pricing_tier', confidence: 0.6 };
  }

  // Testimonial: contains quote-like content
  if (/"|"|testimonial|review/i.test(allText) && allText.length > 30) {
    return { type: 'testimonial', confidence: 0.6 };
  }

  // FAQ item: heading + text, no image
  if (hasHeading && !hasImage && allText.length > 20 && allText.length < 1000) {
    // Check if siblings are Q&A-like
    const headings = group.map((el) => {
      const h = findInSubtree(el, allElements, (e) =>
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(e.tagName),
      );
      return h ? getAllTextInSubtree(h, allElements) : '';
    });
    const endsWithQuestion = headings.filter((h) => h.endsWith('?')).length;
    if (endsWithQuestion >= 2) {
      return { type: 'faq_item', confidence: 0.8 };
    }
    return { type: 'faq_item', confidence: 0.4 };
  }

  // Card: image + heading + text
  if (hasImage && hasHeading) {
    return { type: 'card', confidence: 0.6 };
  }

  // Card without image: heading + text + link
  if (hasHeading && hasLink) {
    return { type: 'card', confidence: 0.4 };
  }

  return null;
}

// --- Main Detection ---

/**
 * Detect repeated patterns within a set of elements (typically a section).
 */
export function detectPatterns(
  sectionElements: ElementSnapshot[],
  allElements: ElementSnapshot[],
): DetectedPattern[] {
  if (sectionElements.length === 0) return [];

  const patterns: DetectedPattern[] = [];

  // Find elements that have multiple visible children (potential pattern containers)
  for (const element of sectionElements) {
    const elementMap = new Map(allElements.map((el) => [el.importId, el]));
    const visibleChildren = element.childImportIds
      .map((id) => elementMap.get(id))
      .filter((el): el is ElementSnapshot => el !== undefined && el.isVisible);

    if (visibleChildren.length < 3) continue;

    // Find repeated structural groups
    const groups = findRepeatedGroups(visibleChildren, allElements, 3);

    for (const [_hash, group] of groups) {
      const archetype = matchArchetype(group, allElements);
      if (!archetype) continue;

      const items: PatternItem[] = group.map((el) => ({
        element: el,
        extractedData: extractPatternData(el, allElements),
      }));

      patterns.push({
        type: archetype.type,
        confidence: archetype.confidence,
        rootElement: element,
        items,
        tierBCandidate: archetype.confidence >= 0.6,
      });
    }
  }

  return patterns;
}
