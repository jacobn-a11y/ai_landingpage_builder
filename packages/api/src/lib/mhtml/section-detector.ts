/**
 * Section Detector — geometry-aware section splitting.
 *
 * Splits a page DOM snapshot into semantic sections using:
 * - Landmark elements (header, nav, main, footer, section)
 * - Background bands (full-width elements with distinct backgrounds)
 * - Whitespace gaps (large vertical margins between sibling groups)
 * - Heading clusters and CTA patterns
 * - Repeated structural groups
 */

import type { ElementSnapshot, PageSnapshot } from './extract-snapshot.js';

// --- Types ---

export type SectionType =
  | 'header' | 'hero' | 'features' | 'testimonials'
  | 'pricing' | 'faq' | 'logos' | 'cta' | 'footer'
  | 'form' | 'generic';

export interface DetectedSection {
  elements: ElementSnapshot[];     // All elements in this section
  rootElement: ElementSnapshot;    // Top-level element for this section
  semanticType: SectionType;
  confidence: number;              // 0-1
  bounds: {
    y: number;
    height: number;
    x: number;
    width: number;
  };
}

// --- Constants ---

const LANDMARK_TAGS = new Set(['header', 'nav', 'main', 'footer', 'section', 'aside', 'article']);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3']);
const MIN_GAP_PX = 40; // Minimum vertical gap to consider a section break
const FULL_WIDTH_THRESHOLD = 0.9; // Element width / document width

// --- Helpers ---

function getDirectChildren(
  elements: ElementSnapshot[],
  parentId: string,
): ElementSnapshot[] {
  return elements.filter((el) => el.parentImportId === parentId);
}

function getSubtree(
  elements: ElementSnapshot[],
  rootId: string,
): ElementSnapshot[] {
  const elementMap = new Map(elements.map((el) => [el.importId, el]));
  const result: ElementSnapshot[] = [];

  function collect(id: string): void {
    const el = elementMap.get(id);
    if (!el) return;
    result.push(el);
    for (const childId of el.childImportIds) {
      collect(childId);
    }
  }

  collect(rootId);
  return result;
}

function hasTag(el: ElementSnapshot, tags: Set<string>): boolean {
  return tags.has(el.tagName);
}

function containsText(elements: ElementSnapshot[], pattern: RegExp): boolean {
  return elements.some((el) => pattern.test(el.textContent));
}

function containsTag(elements: ElementSnapshot[], tag: string): boolean {
  return elements.some((el) => el.tagName === tag);
}

function hasNavLinks(elements: ElementSnapshot[], rootEl?: ElementSnapshot): boolean {
  // Nav-like link patterns: multiple short links at shallow depth, often inside <nav> or
  // a compact container. Content sections commonly have 3+ links too (footer links,
  // feature descriptions with CTAs), so we check for nav-like characteristics.
  const links = elements.filter((el) => el.tagName === 'a');
  if (links.length < 3) return false;

  // Check if there's a <nav> tag — strong signal
  if (elements.some((el) => el.tagName === 'nav')) return true;

  // Check if root element has nav-like attributes
  if (rootEl) {
    const cls = rootEl.attributes.class || '';
    const id = rootEl.attributes.id || '';
    if (/nav|menu|header/i.test(cls) || /nav|menu|header/i.test(id)) return true;
  }

  // Heuristic: nav links are short (< 30 chars each) and there are many relative to content
  const shortLinks = links.filter((el) => el.textContent.length > 0 && el.textContent.length < 30);
  const textElements = elements.filter((el) =>
    ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'label'].includes(el.tagName) && el.textContent.length > 30,
  );

  // If most links are short AND there's little long-form text, it's nav-like
  return shortLinks.length >= 3 && textElements.length <= 2 && shortLinks.length >= links.length * 0.7;
}

function hasCtaButton(elements: ElementSnapshot[]): boolean {
  return elements.some(
    (el) =>
      (el.tagName === 'a' || el.tagName === 'button') &&
      el.textContent.length > 0 &&
      el.textContent.length < 40,
  );
}

function hasBigHeading(elements: ElementSnapshot[]): boolean {
  return elements.some((el) => {
    if (!HEADING_TAGS.has(el.tagName)) return false;
    const fontSize = parseFloat(el.computedStyle.fontSize || '16');
    return fontSize >= 24;
  });
}

function hasRepeatStructure(children: ElementSnapshot[], allElements: ElementSnapshot[], minCount = 3): boolean {
  if (children.length < minCount) return false;

  // Hash tag structure of each child's subtree
  const hashes: string[] = [];
  for (const child of children) {
    const subtree = getSubtree(allElements, child.importId);
    const hash = subtree.map((el) => el.tagName).join(',');
    hashes.push(hash);
  }

  // Count most common hash
  const counts = new Map<string, number>();
  for (const h of hashes) {
    counts.set(h, (counts.get(h) || 0) + 1);
  }
  const maxCount = Math.max(...counts.values());
  return maxCount >= minCount;
}

// --- Semantic Classification ---

function classifySection(
  rootEl: ElementSnapshot,
  sectionElements: ElementSnapshot[],
  allElements: ElementSnapshot[],
  isFirst: boolean,
  isLast: boolean,
): { type: SectionType; confidence: number } {
  const directChildren = sectionElements.filter((el) => el.parentImportId === rootEl.importId);

  // Landmark-based classification
  if (rootEl.tagName === 'header' || rootEl.tagName === 'nav') {
    return { type: 'header', confidence: 0.9 };
  }
  if (rootEl.tagName === 'footer') {
    return { type: 'footer', confidence: 0.9 };
  }

  // Navigation check — tightened to avoid false positives on content sections
  if (hasNavLinks(sectionElements, rootEl) && !hasBigHeading(sectionElements)) {
    return { type: 'header', confidence: 0.7 };
  }

  // Hero: big heading + CTA, usually near the top
  if (isFirst && hasBigHeading(sectionElements) && hasCtaButton(sectionElements)) {
    return { type: 'hero', confidence: 0.8 };
  }
  if (hasBigHeading(sectionElements) && hasCtaButton(sectionElements) && !hasRepeatStructure(directChildren, allElements)) {
    return { type: 'hero', confidence: 0.6 };
  }

  // FAQ: dt/dd pairs or details/summary
  if (containsTag(sectionElements, 'dt') && containsTag(sectionElements, 'dd')) {
    return { type: 'faq', confidence: 0.8 };
  }
  if (containsTag(sectionElements, 'details') && containsTag(sectionElements, 'summary')) {
    return { type: 'faq', confidence: 0.8 };
  }

  // Form section
  if (containsTag(sectionElements, 'form')) {
    return { type: 'form', confidence: 0.7 };
  }

  // Repeated structures detection
  if (hasRepeatStructure(directChildren, allElements, 3)) {
    // Logos: small images in a row
    const images = sectionElements.filter((el) => el.tagName === 'img');
    const smallImages = images.filter(
      (el) => el.boundingBox.width < 200 && el.boundingBox.height < 100,
    );
    if (smallImages.length >= 3 && smallImages.length === images.length) {
      return { type: 'logos', confidence: 0.7 };
    }

    // Check for pricing-like content
    if (containsText(sectionElements, /\$[\d,]+|\d+\/mo|\/month|\/year/i)) {
      return { type: 'pricing', confidence: 0.6 };
    }

    // Check for testimonial-like content (quotes, names)
    if (containsText(sectionElements, /"|"|testimonial/i)) {
      return { type: 'testimonials', confidence: 0.6 };
    }

    // Default repeated structure = features
    return { type: 'features', confidence: 0.5 };
  }

  // Footer heuristics: copyright text, footer-like class names, or last section
  if (containsText(sectionElements, /©|copyright|all rights reserved/i)) {
    return { type: 'footer', confidence: isLast ? 0.8 : 0.6 };
  }
  const rootCls = rootEl.attributes.class || '';
  const rootId = rootEl.attributes.id || '';
  if (/footer|foot/i.test(rootCls) || /footer|foot/i.test(rootId)) {
    return { type: 'footer', confidence: 0.7 };
  }

  // CTA section: heading + button, no repeated structure
  if (hasCtaButton(sectionElements) && sectionElements.length < 20) {
    return { type: 'cta', confidence: 0.4 };
  }

  return { type: 'generic', confidence: 0.3 };
}

// --- Main Detection ---

/**
 * Detect sections in a page snapshot.
 */
export function detectSections(snapshot: PageSnapshot): DetectedSection[] {
  const { elements, documentSize, rootImportId } = snapshot;
  if (elements.length === 0) return [];

  const elementMap = new Map(elements.map((el) => [el.importId, el]));
  const rootEl = elementMap.get(rootImportId);
  if (!rootEl) return [];

  // Get top-level children of body, unwrapping generic wrapper divs
  let topLevelChildren = getDirectChildren(elements, rootImportId)
    .filter((el) => el.isVisible && !el.isOverlay)
    .sort((a, b) => a.boundingBox.y - b.boundingBox.y);

  if (topLevelChildren.length === 0) {
    // No visible top-level children; treat entire body as one section
    return [{
      elements,
      rootElement: rootEl,
      semanticType: 'generic',
      confidence: 0.2,
      bounds: { x: 0, y: 0, width: documentSize.width, height: documentSize.height },
    }];
  }

  // Unwrap non-landmark wrapper divs to find real section candidates.
  const NON_LANDMARK_WRAPPERS = new Set(['div', 'span']);

  // Helper: unwrap nested single-child wrappers
  function unwrapSingleChild(children: ElementSnapshot[], maxDepth: number): ElementSnapshot[] {
    let result = children;
    for (let d = 0; d < maxDepth; d++) {
      if (result.length !== 1) break;
      const sole = result[0];
      if (LANDMARK_TAGS.has(sole.tagName)) break;
      if (!NON_LANDMARK_WRAPPERS.has(sole.tagName)) break;
      const inner = getDirectChildren(elements, sole.importId)
        .filter((el) => el.isVisible && !el.isOverlay)
        .sort((a, b) => a.boundingBox.y - b.boundingBox.y);
      if (inner.length === 0) break;
      result = inner;
    }
    return result;
  }

  // Case 1: Single wrapper (e.g. <div id="root">, <div id="__next">)
  topLevelChildren = unwrapSingleChild(topLevelChildren, 3);

  // Case 2: Multiple top-level children but no landmarks — look for a dominant
  // content wrapper that contains landmarks (common with HubSpot, Webflow, etc.)
  let landmarkChildren = topLevelChildren.filter((el) => LANDMARK_TAGS.has(el.tagName));
  if (landmarkChildren.length < 2 && topLevelChildren.length > 1) {
    // Find the candidate with the most subtree landmarks
    let bestCandidate: ElementSnapshot | null = null;
    let bestLandmarkCount = 0;

    for (const candidate of topLevelChildren) {
      if (!NON_LANDMARK_WRAPPERS.has(candidate.tagName)) continue;
      const subtree = getSubtree(elements, candidate.importId);
      const subtreeLandmarks = subtree.filter((el) => LANDMARK_TAGS.has(el.tagName));
      if (subtreeLandmarks.length > bestLandmarkCount) {
        bestLandmarkCount = subtreeLandmarks.length;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate && bestLandmarkCount >= 2) {
      // Drill into the best candidate, unwrapping nested wrappers
      let contentChildren = getDirectChildren(elements, bestCandidate.importId)
        .filter((el) => el.isVisible && !el.isOverlay)
        .sort((a, b) => a.boundingBox.y - b.boundingBox.y);
      contentChildren = unwrapSingleChild(contentChildren, 3);

      // If direct children still don't have landmarks, look one more level
      let directLandmarks = contentChildren.filter((el) => LANDMARK_TAGS.has(el.tagName));
      if (directLandmarks.length < 2 && contentChildren.length <= 2) {
        for (const wrapper of contentChildren) {
          if (!NON_LANDMARK_WRAPPERS.has(wrapper.tagName)) continue;
          const innerChildren = getDirectChildren(elements, wrapper.importId)
            .filter((el) => el.isVisible && !el.isOverlay)
            .sort((a, b) => a.boundingBox.y - b.boundingBox.y);
          const innerLandmarks = innerChildren.filter((el) => LANDMARK_TAGS.has(el.tagName));
          if (innerLandmarks.length >= 2 || innerChildren.length > contentChildren.length) {
            contentChildren = innerChildren;
            directLandmarks = contentChildren.filter((el) => LANDMARK_TAGS.has(el.tagName));
            break;
          }
        }
      }

      topLevelChildren = contentChildren;
      landmarkChildren = directLandmarks;
    }
  }

  // Strategy 1: Use all top-level children as candidates. Landmarks are used
  // to trigger section breaks in the grouping logic below, not to filter candidates.
  const candidateRoots = topLevelChildren;

  // Strategy 2: Merge adjacent non-landmark elements that are close together
  const sections: DetectedSection[] = [];
  let currentGroup: ElementSnapshot[] = [];
  let currentGroupRoot: ElementSnapshot | null = null;

  for (let i = 0; i < candidateRoots.length; i++) {
    const el = candidateRoots[i];
    const isLandmark = LANDMARK_TAGS.has(el.tagName);
    const isFullWidth = el.boundingBox.width / documentSize.width >= FULL_WIDTH_THRESHOLD;

    // Check gap from previous element
    const prevEl = i > 0 ? candidateRoots[i - 1] : null;
    const gap = prevEl
      ? el.boundingBox.y - (prevEl.boundingBox.y + prevEl.boundingBox.height)
      : 0;

    const shouldBreak = isLandmark || isFullWidth || gap > MIN_GAP_PX || currentGroup.length === 0;

    if (shouldBreak && currentGroup.length > 0 && currentGroupRoot) {
      // Flush current group as a section
      const sectionElements = currentGroup.flatMap((g) => getSubtree(elements, g.importId));
      const { type, confidence } = classifySection(
        currentGroupRoot, sectionElements, elements,
        sections.length === 0,
        false,
      );
      const allBounds = currentGroup.map((g) => g.boundingBox);
      sections.push({
        elements: sectionElements,
        rootElement: currentGroupRoot,
        semanticType: type,
        confidence,
        bounds: {
          x: Math.min(...allBounds.map((b) => b.x)),
          y: Math.min(...allBounds.map((b) => b.y)),
          width: Math.max(...allBounds.map((b) => b.x + b.width)) - Math.min(...allBounds.map((b) => b.x)),
          height: Math.max(...allBounds.map((b) => b.y + b.height)) - Math.min(...allBounds.map((b) => b.y)),
        },
      });
      currentGroup = [];
      currentGroupRoot = null;
    }

    if (!currentGroupRoot) currentGroupRoot = el;
    currentGroup.push(el);
  }

  // Flush last group
  if (currentGroup.length > 0 && currentGroupRoot) {
    const sectionElements = currentGroup.flatMap((g) => getSubtree(elements, g.importId));
    const { type, confidence } = classifySection(
      currentGroupRoot, sectionElements, elements,
      sections.length === 0,
      true,
    );
    const allBounds = currentGroup.map((g) => g.boundingBox);
    sections.push({
      elements: sectionElements,
      rootElement: currentGroupRoot,
      semanticType: type,
      confidence,
      bounds: {
        x: Math.min(...allBounds.map((b) => b.x)),
        y: Math.min(...allBounds.map((b) => b.y)),
        width: Math.max(...allBounds.map((b) => b.x + b.width)) - Math.min(...allBounds.map((b) => b.x)),
        height: Math.max(...allBounds.map((b) => b.y + b.height)) - Math.min(...allBounds.map((b) => b.y)),
      },
    });
  }

  return sections;
}
