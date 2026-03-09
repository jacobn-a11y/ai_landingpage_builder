/**
 * Zod schemas for layout block types: section, container, grid, columns, stack.
 */

import { z } from 'zod';
import { UniversalPropsSchema } from './universal';

export const SectionPropsSchema = UniversalPropsSchema.extend({
  maxWidth: z.number().min(0).optional(),
  padding: z.number().min(0).optional(),
});

export const ContainerPropsSchema = UniversalPropsSchema.extend({});

export const GridPropsSchema = UniversalPropsSchema.extend({
  columns: z.number().int().min(1).max(12).optional(),
});

export const ColumnsPropsSchema = UniversalPropsSchema.extend({});

export const StackPropsSchema = UniversalPropsSchema.extend({});

export type SectionProps = z.infer<typeof SectionPropsSchema>;
export type ContainerProps = z.infer<typeof ContainerPropsSchema>;
export type GridProps = z.infer<typeof GridPropsSchema>;
export type ColumnsProps = z.infer<typeof ColumnsPropsSchema>;
export type StackProps = z.infer<typeof StackPropsSchema>;
