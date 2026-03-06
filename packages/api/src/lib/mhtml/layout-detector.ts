/**
 * Layout Detector — identifies flex, grid, float, table, and multi-column
 * layouts from computed styles and geometry, producing responsive deltas.
 */

import type { ElementSnapshot } from './extract-snapshot.js';

// --- Types ---

export type LayoutType = 'stack' | 'columns' | 'grid' | 'unknown';

export interface DetectedLayout {
  type: LayoutType;
  element: ElementSnapshot;
  children: ElementSnapshot[];
  columnWidths?: string[];           // For columns: ['50%', '50%'] or ['1fr', '2fr']
  gridTemplate?: { cols: string; rows: string };
  gap?: number;                      // Gap in pixels
  isResponsive: boolean;             // Different layout at different viewports
  layoutHazards: string[];           // Warnings: negative margins, absolute positioning, etc.
}

export interface ResponsiveLayoutDelta {
  elementId: string;
  desktopLayout: LayoutType;
  mobileLayout: LayoutType;
  desktopColumnWidths?: string[];
  mobileColumnWidths?: string[];
}

// --- Helpers ---

function parsePx(value: string | undefined): number {
  if (!value) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function getChildrenSorted(element: ElementSnapshot, allElements: ElementSnapshot[]): ElementSnapshot[] {
  const elementMap = new Map(allElements.map((el) => [el.importId, el]));
  return element.childImportIds
    .map((id) => elementMap.get(id))
    .filter((el): el is ElementSnapshot => el !== undefined && el.isVisible)
    .sort((a, b) => a.boundingBox.y - b.boundingBox.y || a.boundingBox.x - b.boundingBox.x);
}

function areHorizontallyAligned(elements: ElementSnapshot[], tolerance = 20): boolean {
  if (elements.length < 2) return false;
  // Check if elements are roughly on the same Y line
  const firstY = elements[0].boundingBox.y;
  return elements.every((el) => Math.abs(el.boundingBox.y - firstY) < tolerance);
}

function areVerticallyStacked(elements: ElementSnapshot[], tolerance = 10): boolean {
  if (elements.length < 2) return true;
  for (let i = 1; i < elements.length; i++) {
    const prev = elements[i - 1];
    const curr = elements[i];
    const prevBottom = prev.boundingBox.y + prev.boundingBox.height;
    if (curr.boundingBox.y < prevBottom - tolerance) return false;
  }
  return true;
}

function estimateColumnWidths(elements: ElementSnapshot[], containerWidth: number): string[] {
  if (containerWidth <= 0) return elements.map(() => 'auto');
  return elements.map((el) => {
    const pct = Math.round((el.boundingBox.width / containerWidth) * 100);
    return `${pct}%`;
  });
}

// --- Detection ---

/**
 * Detect the layout pattern of a container element.
 */
export function detectLayout(
  element: ElementSnapshot,
  allElements: ElementSnapshot[],
): DetectedLayout {
  const style = element.computedStyle;
  const children = getChildrenSorted(element, allElements);
  const layoutHazards: string[] = [];

  if (children.length === 0) {
    return { type: 'stack', element, children, isResponsive: false, layoutHazards };
  }

  // Check for negative margins
  for (const child of children) {
    const mt = parsePx(child.computedStyle.marginTop);
    const ml = parsePx(child.computedStyle.marginLeft);
    if (mt < -5 || ml < -5) {
      layoutHazards.push(`Negative margin on ${child.importId}: margin-top=${mt}, margin-left=${ml}`);
    }
  }

  // Check for absolutely positioned children
  const absoluteChildren = children.filter((c) => c.computedStyle.position === 'absolute');
  if (absoluteChildren.length > 0) {
    layoutHazards.push(`${absoluteChildren.length} absolutely positioned children`);
  }

  const display = style.display || 'block';
  const gap = parsePx(style.gap || style.columnGap);

  // 1. CSS Grid
  if (display === 'grid' || display === 'inline-grid') {
    return {
      type: 'grid',
      element,
      children,
      gridTemplate: {
        cols: style.gridTemplateColumns || 'auto',
        rows: style.gridTemplateRows || 'auto',
      },
      gap,
      isResponsive: false,
      layoutHazards,
    };
  }

  // 2. Flexbox
  if (display === 'flex' || display === 'inline-flex') {
    const direction = style.flexDirection || 'row';
    const wrap = style.flexWrap || 'nowrap';

    if (direction === 'column' || direction === 'column-reverse') {
      return { type: 'stack', element, children, gap, isResponsive: false, layoutHazards };
    }

    // Row flex — columns layout
    if (areHorizontallyAligned(children)) {
      const columnWidths = estimateColumnWidths(children, element.boundingBox.width);
      return {
        type: 'columns',
        element,
        children,
        columnWidths,
        gap,
        isResponsive: wrap === 'wrap',
        layoutHazards,
      };
    }

    // Wrapped flex — may stack on mobile
    if (wrap === 'wrap' && areVerticallyStacked(children)) {
      return { type: 'stack', element, children, gap, isResponsive: true, layoutHazards };
    }

    return {
      type: 'columns',
      element,
      children,
      columnWidths: estimateColumnWidths(children, element.boundingBox.width),
      gap,
      isResponsive: wrap === 'wrap',
      layoutHazards,
    };
  }

  // 3. Float-based layout
  const floatedChildren = children.filter(
    (c) => c.computedStyle.float === 'left' || c.computedStyle.float === 'right',
  );
  if (floatedChildren.length >= 2 && areHorizontallyAligned(floatedChildren)) {
    return {
      type: 'columns',
      element,
      children: floatedChildren,
      columnWidths: estimateColumnWidths(floatedChildren, element.boundingBox.width),
      isResponsive: false,
      layoutHazards: [...layoutHazards, 'Float-based layout'],
    };
  }

  // 4. Table layout
  if (display === 'table' || style.display === 'table-row') {
    const cellChildren = children.filter(
      (c) => c.computedStyle.display === 'table-cell',
    );
    if (cellChildren.length >= 2) {
      return {
        type: 'columns',
        element,
        children: cellChildren,
        columnWidths: estimateColumnWidths(cellChildren, element.boundingBox.width),
        isResponsive: false,
        layoutHazards: [...layoutHazards, 'Table-cell layout'],
      };
    }
  }

  // 5. CSS Multi-column
  const colCount = parseInt(style.columnCount || '0', 10);
  if (colCount > 1) {
    return {
      type: 'columns',
      element,
      children,
      columnWidths: Array(colCount).fill(`${Math.round(100 / colCount)}%`),
      isResponsive: false,
      layoutHazards: [...layoutHazards, 'CSS multi-column'],
    };
  }

  // 6. Geometry-based detection: siblings horizontally aligned
  if (children.length >= 2 && areHorizontallyAligned(children)) {
    return {
      type: 'columns',
      element,
      children,
      columnWidths: estimateColumnWidths(children, element.boundingBox.width),
      isResponsive: false,
      layoutHazards,
    };
  }

  // Default: vertical stack
  return { type: 'stack', element, children, isResponsive: false, layoutHazards };
}

/**
 * Compare layouts between two viewports to detect responsive behavior.
 */
export function detectResponsiveDeltas(
  desktopLayout: DetectedLayout,
  mobileLayout: DetectedLayout,
): ResponsiveLayoutDelta | null {
  if (desktopLayout.type === mobileLayout.type) return null;

  return {
    elementId: desktopLayout.element.importId,
    desktopLayout: desktopLayout.type,
    mobileLayout: mobileLayout.type,
    desktopColumnWidths: desktopLayout.columnWidths,
    mobileColumnWidths: mobileLayout.columnWidths,
  };
}
