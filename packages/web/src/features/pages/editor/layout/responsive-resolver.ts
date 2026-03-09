/**
 * Resolves layout properties for a given breakpoint using a cascade model.
 * Mobile inherits from tablet, tablet inherits from desktop.
 */

export interface LayoutProps {
  /** Number of grid columns (1-12) */
  columns?: number;
  /** Gap between items in pixels */
  gap?: number;
  /** Flex direction */
  direction?: 'row' | 'column';
  /** Whether items wrap */
  wrap?: boolean;
  /** Align items (cross axis) */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Justify content (main axis) */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

export interface BlockLayout {
  desktop?: LayoutProps;
  tablet?: LayoutProps;
  mobile?: LayoutProps;
}

const EMPTY_LAYOUT: Required<LayoutProps> = {
  columns: 1,
  gap: 0,
  direction: 'row',
  wrap: true,
  align: 'stretch',
  justify: 'start',
};

const LAYOUT_KEYS = [
  'columns',
  'gap',
  'direction',
  'wrap',
  'align',
  'justify',
] as const;

type LayoutKey = (typeof LAYOUT_KEYS)[number];

/**
 * Resolve layout properties for a specific breakpoint.
 *
 * Cascade order: desktop -> tablet -> mobile
 * Each breakpoint inherits from its parent and can override individual props.
 * Any undefined prop falls back to the parent breakpoint, then to defaults.
 */
export function resolveLayout(
  layout: BlockLayout | undefined,
  breakpoint: 'desktop' | 'tablet' | 'mobile',
): Required<LayoutProps> {
  if (!layout) return { ...EMPTY_LAYOUT };

  const desktop = layout.desktop ?? {};
  const tablet = layout.tablet ?? {};
  const mobile = layout.mobile ?? {};

  // Build cascade chain based on breakpoint
  let layers: LayoutProps[];
  switch (breakpoint) {
    case 'desktop':
      layers = [desktop];
      break;
    case 'tablet':
      layers = [desktop, tablet];
      break;
    case 'mobile':
      layers = [desktop, tablet, mobile];
      break;
  }

  const result: Record<string, unknown> = { ...EMPTY_LAYOUT };

  for (const key of LAYOUT_KEYS) {
    for (const layer of layers) {
      if (layer[key] !== undefined) {
        result[key] = layer[key];
      }
    }
  }

  return result as Required<LayoutProps>;
}

/**
 * Returns which props are explicitly set for a given breakpoint (not inherited).
 */
export function getExplicitProps(
  layout: BlockLayout | undefined,
  breakpoint: 'desktop' | 'tablet' | 'mobile',
): Set<LayoutKey> {
  if (!layout) return new Set();

  const bpLayout = layout[breakpoint];
  if (!bpLayout) return new Set();

  const explicit = new Set<LayoutKey>();
  for (const key of LAYOUT_KEYS) {
    if (bpLayout[key] !== undefined) {
      explicit.add(key);
    }
  }
  return explicit;
}
