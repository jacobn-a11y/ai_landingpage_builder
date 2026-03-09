/**
 * Zod schema for universal block properties (applied to all block types).
 * Mirrors packages/web/src/features/pages/editor/universal-props.ts
 */

import { z } from 'zod';

export const BreakpointSchema = z.enum(['desktop', 'tablet', 'mobile']);
export type Breakpoint = z.infer<typeof BreakpointSchema>;

export const DeviceVisibilitySchema = z.enum(['all', 'desktop', 'tablet', 'mobile']);

export const UniversalPropsSchema = z.object({
  // Spacing
  marginTop: z.number().optional(),
  marginRight: z.number().optional(),
  marginBottom: z.number().optional(),
  marginLeft: z.number().optional(),
  paddingTop: z.number().optional(),
  paddingRight: z.number().optional(),
  paddingBottom: z.number().optional(),
  paddingLeft: z.number().optional(),

  // Background
  backgroundColor: z.string().optional(),

  // Border radius (4-corner or uniform)
  borderRadius: z.number().min(0).optional(),
  borderTopLeftRadius: z.number().min(0).optional(),
  borderTopRightRadius: z.number().min(0).optional(),
  borderBottomRightRadius: z.number().min(0).optional(),
  borderBottomLeftRadius: z.number().min(0).optional(),

  // Border
  borderWidth: z.number().min(0).optional(),
  borderColor: z.string().optional(),
  borderStyle: z.enum(['solid', 'dashed', 'dotted', 'none']).optional(),

  // Opacity (0-100)
  opacity: z.number().min(0).max(100).optional(),

  // Box shadow
  boxShadowOffsetX: z.number().optional(),
  boxShadowOffsetY: z.number().optional(),
  boxShadowBlur: z.number().min(0).optional(),
  boxShadowSpread: z.number().optional(),
  boxShadowColor: z.string().optional(),

  // Sizing
  width: z.union([z.number(), z.string()]).optional(),
  maxWidth: z.union([z.number(), z.string()]).optional(),
  minWidth: z.union([z.number(), z.string()]).optional(),

  // Visibility & display
  visibleOn: DeviceVisibilitySchema.optional(),
  showWhen: z.string().optional(),
  zIndex: z.number().optional(),

  // Canvas-mode positioning
  x: z.number().optional(),
  y: z.number().optional(),
  height: z.number().optional(),

  // Responsive overrides: per-breakpoint partial property overrides
  overrides: z.object({
    desktop: z.record(z.string(), z.unknown()).optional(),
    tablet: z.record(z.string(), z.unknown()).optional(),
    mobile: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

export type UniversalProps = z.infer<typeof UniversalPropsSchema>;
