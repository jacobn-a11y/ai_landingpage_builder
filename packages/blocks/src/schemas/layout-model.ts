/**
 * Responsive layout model types.
 * Defines per-breakpoint layout properties for blocks.
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
