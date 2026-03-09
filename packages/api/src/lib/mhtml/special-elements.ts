/**
 * Special Elements Handler — tier rules for tables, media, and SVG.
 */

import type { ElementSnapshot } from './extract-snapshot.js';

// --- Types ---

export type SpecialElementType =
  | 'data_table'
  | 'pricing_table'
  | 'layout_table'
  | 'video_foreground'
  | 'video_background'
  | 'audio'
  | 'svg_static'
  | 'svg_animated';

export type RecommendedTier = 'A' | 'B' | 'C' | 'D';

export interface SpecialElementResult {
  element: ElementSnapshot;
  type: SpecialElementType;
  recommendedTier: RecommendedTier;
  reason: string;
}

// --- Detection ---

function isDataTable(el: ElementSnapshot, allElements: ElementSnapshot[]): boolean {
  const elementMap = new Map(allElements.map((e) => [e.importId, e]));
  const hasThead = el.childImportIds.some((id) => {
    const child = elementMap.get(id);
    return child?.tagName === 'thead';
  });
  const hasTbody = el.childImportIds.some((id) => {
    const child = elementMap.get(id);
    return child?.tagName === 'tbody';
  });
  const hasTh = allElements.some(
    (e) => e.tagName === 'th' && isDescendant(e, el, allElements),
  );
  return hasThead || hasTbody || hasTh;
}

function isDescendant(
  child: ElementSnapshot,
  ancestor: ElementSnapshot,
  allElements: ElementSnapshot[],
): boolean {
  const elementMap = new Map(allElements.map((e) => [e.importId, e]));
  let current = child;
  while (current.parentImportId) {
    if (current.parentImportId === ancestor.importId) return true;
    const parent = elementMap.get(current.parentImportId);
    if (!parent) break;
    current = parent;
  }
  return false;
}

function isLayoutTable(el: ElementSnapshot): boolean {
  return el.computedStyle.display === 'table' && el.tagName !== 'table';
}

function hasPricingContent(el: ElementSnapshot, allElements: ElementSnapshot[]): boolean {
  const descendants = allElements.filter((e) => isDescendant(e, el, allElements));
  return descendants.some((e) =>
    /\$[\d,]+|\d+\/mo|\/month|\/year|price/i.test(e.textContent),
  );
}

function isBackgroundVideo(el: ElementSnapshot): boolean {
  const style = el.computedStyle;
  return (
    style.position === 'absolute' ||
    style.position === 'fixed' ||
    style.zIndex === '-1' ||
    (el.boundingBox.width > 800 && el.boundingBox.height > 400)
  );
}

function isSvgAnimated(el: ElementSnapshot, allElements: ElementSnapshot[]): boolean {
  const descendants = allElements.filter((e) => isDescendant(e, el, allElements));
  return descendants.some(
    (e) => e.tagName === 'animate' || e.tagName === 'animatetransform' || e.tagName === 'set',
  );
}

/**
 * Analyze special elements (tables, media, SVG) and recommend tiers.
 */
export function analyzeSpecialElements(
  elements: ElementSnapshot[],
  allElements: ElementSnapshot[],
): SpecialElementResult[] {
  const results: SpecialElementResult[] = [];

  for (const el of elements) {
    // Tables
    if (el.tagName === 'table' || el.computedStyle.display === 'table') {
      if (isLayoutTable(el)) {
        results.push({
          element: el,
          type: 'layout_table',
          recommendedTier: 'A',
          reason: 'Layout table: convert to layout primitives',
        });
      } else if (hasPricingContent(el, allElements)) {
        results.push({
          element: el,
          type: 'pricing_table',
          recommendedTier: 'B',
          reason: 'Pricing table: attempt Tier B pricing block',
        });
      } else if (isDataTable(el, allElements)) {
        results.push({
          element: el,
          type: 'data_table',
          recommendedTier: 'C',
          reason: 'Data table: preserve as Tier C with token editing',
        });
      }
    }

    // Video
    if (el.tagName === 'video') {
      if (isBackgroundVideo(el)) {
        results.push({
          element: el,
          type: 'video_background',
          recommendedTier: 'C',
          reason: 'Background video: Tier C or D',
        });
      } else {
        results.push({
          element: el,
          type: 'video_foreground',
          recommendedTier: 'A',
          reason: 'Foreground video: map to media block if supported',
        });
      }
    }

    // Audio
    if (el.tagName === 'audio') {
      results.push({
        element: el,
        type: 'audio',
        recommendedTier: 'C',
        reason: 'Audio element: Tier C or native audio block',
      });
    }

    // SVG
    if (el.tagName === 'svg') {
      if (isSvgAnimated(el, allElements)) {
        results.push({
          element: el,
          type: 'svg_animated',
          recommendedTier: 'D',
          reason: 'Animated/scripted SVG: Tier D',
        });
      } else {
        results.push({
          element: el,
          type: 'svg_static',
          recommendedTier: 'A',
          reason: 'Static SVG: native block or Tier C',
        });
      }
    }
  }

  return results;
}
