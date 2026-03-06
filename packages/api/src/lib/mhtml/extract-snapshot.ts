/**
 * Geometry and Style Extraction — runs inside a single page.evaluate() call
 * per viewport to avoid O(n) roundtrips.
 *
 * Extracts bounding boxes, computed styles, pseudo-element styles,
 * text content, overlay detection, and builds a complete snapshot.
 */

import type { Page } from 'puppeteer-core';

// --- Types ---

export interface ElementSnapshot {
  importId: string;       // data-import-id attribute value
  tagName: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  computedStyle: Record<string, string>;
  pseudoBefore?: Record<string, string>;
  pseudoAfter?: Record<string, string>;
  isVisible: boolean;
  isOverlay: boolean;     // Cookie banners, modals, etc.
  isFixed: boolean;       // position: fixed or sticky
  textContent: string;
  childImportIds: string[];
  attributes: Record<string, string>;
  parentImportId: string | null;
  depth: number;
}

export interface PageSnapshot {
  viewport: { width: number; height: number; label: string };
  documentSize: { width: number; height: number };
  elements: ElementSnapshot[];
  rootImportId: string;
}

// Key CSS properties to extract (longhand only)
const STYLE_PROPERTIES = [
  // Layout
  'display', 'position', 'float', 'clear',
  'top', 'right', 'bottom', 'left',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'boxSizing', 'overflow', 'overflowX', 'overflowY',

  // Flex
  'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent',
  'flexGrow', 'flexShrink', 'flexBasis', 'order', 'gap', 'rowGap', 'columnGap',

  // Grid
  'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow',
  'gridAutoFlow', 'gridAutoColumns', 'gridAutoRows',

  // Typography
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration',
  'textTransform', 'whiteSpace', 'wordBreak', 'color',
  'direction', 'unicodeBidi',

  // Background
  'backgroundColor', 'backgroundImage', 'backgroundSize',
  'backgroundPosition', 'backgroundRepeat',

  // Border
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'borderRadius',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',

  // Visual
  'opacity', 'visibility', 'zIndex', 'boxShadow', 'textShadow',
  'transform', 'clipPath',

  // Multi-column
  'columnCount', 'columnWidth', 'columnGap',

  // Table
  'tableLayout', 'borderCollapse', 'borderSpacing',
];

// Properties to extract for pseudo-elements
const PSEUDO_PROPERTIES = [
  'content', 'display', 'position', 'width', 'height',
  'backgroundColor', 'backgroundImage', 'color',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'top', 'right', 'bottom', 'left',
  'zIndex', 'opacity',
];

/**
 * Extract a complete DOM snapshot from a rendered page.
 * Runs inside a single page.evaluate() call for efficiency.
 */
export async function extractSnapshot(
  page: Page,
  viewport: { width: number; height: number; label: string },
): Promise<PageSnapshot> {
  const snapshot = await page.evaluate(
    (styleProps: string[], pseudoProps: string[]) => {
      const elements: Array<{
        importId: string;
        tagName: string;
        boundingBox: { x: number; y: number; width: number; height: number };
        computedStyle: Record<string, string>;
        pseudoBefore?: Record<string, string>;
        pseudoAfter?: Record<string, string>;
        isVisible: boolean;
        isOverlay: boolean;
        isFixed: boolean;
        textContent: string;
        childImportIds: string[];
        attributes: Record<string, string>;
        parentImportId: string | null;
        depth: number;
      }> = [];

      let idCounter = 0;
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      function getComputedProps(el: Element, pseudoEl?: string): Record<string, string> {
        const cs = window.getComputedStyle(el, pseudoEl || null);
        const props: Record<string, string> = {};
        const propList = pseudoEl ? pseudoProps : styleProps;
        for (const prop of propList) {
          try {
            const val = cs.getPropertyValue(
              prop.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
            );
            if (val && val !== '' && val !== 'initial' && val !== 'normal') {
              props[prop] = val;
            }
          } catch { /* skip unsupported */ }
        }
        return props;
      }

      function isElementVisible(el: Element, cs: Record<string, string>): boolean {
        if (cs.display === 'none') return false;
        if (cs.visibility === 'hidden') return false;
        if (cs.opacity === '0') return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return true;
      }

      function isOverlayElement(el: Element, cs: Record<string, string>, rect: DOMRect): boolean {
        const pos = cs.position;
        if (pos !== 'fixed' && pos !== 'absolute') return false;
        const zIndex = parseInt(cs.zIndex || '0', 10);
        if (zIndex < 100) return false;
        // Check if it covers a large portion of the viewport
        const coverageX = rect.width / viewportWidth;
        const coverageY = rect.height / viewportHeight;
        return coverageX > 0.5 && coverageY > 0.3;
      }

      function traverse(el: Element, parentId: string | null, depth: number): void {
        if (depth > 50) return; // Safety limit

        const id = `imp_${idCounter++}`;
        el.setAttribute('data-import-id', id);

        const rect = el.getBoundingClientRect();
        const computed = getComputedProps(el);
        const visible = isElementVisible(el, computed);
        const isFixed = computed.position === 'fixed' || computed.position === 'sticky';
        const overlay = isOverlayElement(el, computed, rect);

        // Pseudo-elements
        let pseudoBefore: Record<string, string> | undefined;
        let pseudoAfter: Record<string, string> | undefined;
        const beforeContent = window.getComputedStyle(el, '::before').content;
        if (beforeContent && beforeContent !== 'none' && beforeContent !== '""') {
          pseudoBefore = getComputedProps(el, '::before');
        }
        const afterContent = window.getComputedStyle(el, '::after').content;
        if (afterContent && afterContent !== 'none' && afterContent !== '""') {
          pseudoAfter = getComputedProps(el, '::after');
        }

        // Direct text content (not children)
        let textContent = '';
        for (const child of el.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            textContent += child.textContent || '';
          }
        }
        textContent = textContent.trim();

        // Child elements
        const childIds: string[] = [];
        for (const child of el.children) {
          const childId = `imp_${idCounter}`;
          childIds.push(childId);
          traverse(child, id, depth + 1);
        }

        // Attributes
        const attributes: Record<string, string> = {};
        for (const attr of el.attributes) {
          if (attr.name !== 'data-import-id') {
            attributes[attr.name] = attr.value;
          }
        }

        elements.push({
          importId: id,
          tagName: el.tagName.toLowerCase(),
          boundingBox: {
            x: rect.left + scrollX,
            y: rect.top + scrollY,
            width: rect.width,
            height: rect.height,
          },
          computedStyle: computed,
          pseudoBefore,
          pseudoAfter,
          isVisible: visible,
          isOverlay: overlay,
          isFixed,
          textContent,
          childImportIds: childIds,
          attributes,
          parentImportId: parentId,
          depth,
        });
      }

      // Start traversal from body
      const body = document.body;
      if (body) {
        traverse(body, null, 0);
      }

      return {
        documentSize: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        },
        elements,
        rootImportId: body?.getAttribute('data-import-id') || 'imp_0',
      };
    },
    STYLE_PROPERTIES,
    PSEUDO_PROPERTIES,
  );

  return {
    viewport,
    ...snapshot,
  };
}
