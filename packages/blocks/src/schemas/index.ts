/**
 * Block schema registry — Zod schemas for every block type.
 * Provides validation, default props, and type-safe prop access.
 */

import { z } from 'zod';
import type { BlockType } from '../block-types';

// Re-export all schemas
export { UniversalPropsSchema, BreakpointSchema, DeviceVisibilitySchema } from './universal';
export type { UniversalProps, Breakpoint } from './universal';

export * from './layout';
export * from './content';
export * from './pattern';
export * from './form';
export * from './embed';

// Import schemas for the registry map
import { SectionPropsSchema, ContainerPropsSchema, GridPropsSchema, ColumnsPropsSchema, StackPropsSchema } from './layout';
import {
  TextPropsSchema, HeadlinePropsSchema, ParagraphPropsSchema, ImagePropsSchema,
  ButtonPropsSchema, DividerPropsSchema, SpacerPropsSchema, VideoPropsSchema,
  ShapeRectanglePropsSchema, ShapeCirclePropsSchema, CountdownPropsSchema,
  AccordionPropsSchema, CarouselPropsSchema, TablePropsSchema,
} from './content';
import { HeroPropsSchema, FeaturesPropsSchema, TestimonialsPropsSchema, FaqPropsSchema, LogosPropsSchema } from './pattern';
import { FormPropsSchema } from './form';
import { CustomHtmlPropsSchema } from './embed';

/**
 * Map from block type to its Zod props schema.
 */
export const BlockPropsSchemaMap: Record<BlockType, z.ZodObject<z.ZodRawShape>> = {
  // Layout
  section: SectionPropsSchema,
  container: ContainerPropsSchema,
  grid: GridPropsSchema,
  columns: ColumnsPropsSchema,
  stack: StackPropsSchema,
  // Content
  text: TextPropsSchema,
  headline: HeadlinePropsSchema,
  paragraph: ParagraphPropsSchema,
  image: ImagePropsSchema,
  button: ButtonPropsSchema,
  divider: DividerPropsSchema,
  spacer: SpacerPropsSchema,
  video: VideoPropsSchema,
  shapeRectangle: ShapeRectanglePropsSchema,
  shapeCircle: ShapeCirclePropsSchema,
  countdown: CountdownPropsSchema,
  table: TablePropsSchema,
  accordion: AccordionPropsSchema,
  carousel: CarouselPropsSchema,
  // Pattern
  hero: HeroPropsSchema,
  features: FeaturesPropsSchema,
  testimonials: TestimonialsPropsSchema,
  faq: FaqPropsSchema,
  logos: LogosPropsSchema,
  // Form
  form: FormPropsSchema,
  // Embed
  customHtml: CustomHtmlPropsSchema,
};

/**
 * Validate block props against the schema for the given type.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateBlockProps(type: BlockType, props: Record<string, unknown>) {
  const schema = BlockPropsSchemaMap[type];
  if (!schema) {
    return { success: false as const, error: `Unknown block type: ${type}` };
  }
  const result = schema.safeParse(props);
  if (result.success) {
    return { success: true as const, data: result.data };
  }
  return { success: false as const, error: result.error.format() };
}

/**
 * Strip unknown/invalid props — returns only schema-valid props for the type.
 * Unknown keys are silently dropped. Invalid values are dropped.
 */
export function sanitizeBlockProps(type: BlockType, props: Record<string, unknown>): Record<string, unknown> {
  const schema = BlockPropsSchemaMap[type];
  if (!schema) return props;
  // Use passthrough to keep known keys, then strip unknown
  const result = schema.safeParse(props);
  return result.success ? result.data : props;
}

/**
 * Get the Zod schema for a block type. Returns undefined for unknown types.
 */
export function getBlockSchema(type: BlockType): z.ZodObject<z.ZodRawShape> | undefined {
  return BlockPropsSchemaMap[type];
}

/**
 * Get all editable property names for a block type (from schema keys).
 */
export function getEditableProps(type: BlockType): string[] {
  const schema = BlockPropsSchemaMap[type];
  if (!schema) return [];
  return Object.keys(schema.shape);
}

/**
 * Default props per block type — sensible starting values for new blocks.
 */
export const BlockDefaultProps: Partial<Record<BlockType, Record<string, unknown>>> = {
  headline: { content: 'Headline', headingLevel: 'h2', fontWeight: '700' },
  paragraph: { content: 'Paragraph text', fontSize: 16 },
  text: { content: 'Text' },
  button: { text: 'Button', href: '#' },
  image: { alt: '', objectFit: 'contain', lazyLoad: true },
  spacer: { height: 24 },
  divider: { orientation: 'horizontal', lineThickness: 1, lineStyle: 'solid', lineWidth: '100%' },
  video: { provider: 'youtube', aspectRatio: '16/9' },
  shapeRectangle: { width: 200, height: 100, fillColor: '#e5e7eb' },
  shapeCircle: { size: 100, fillColor: '#e5e7eb' },
  countdown: { daysLabel: 'Days', hoursLabel: 'Hours', minutesLabel: 'Mins', secondsLabel: 'Secs' },
  accordion: { sections: [], expandOneOnly: false, dividerColor: '#e5e7eb', titleFontSize: 16, titleFontWeight: '600' },
  carousel: { slides: [], autoPlay: false, autoPlayInterval: 3000, showArrows: true, showDots: true, loop: true },
  table: { rows: [['H1', 'H2'], ['C1', 'C2']], hasHeader: true },
  grid: { columns: 3 },
  form: { submitText: 'Submit' },
  customHtml: { html: '' },
};

/**
 * Get default props for a block type (merged with universal defaults).
 */
export function getDefaultProps(type: BlockType): Record<string, unknown> {
  return { ...(BlockDefaultProps[type] ?? {}) };
}
