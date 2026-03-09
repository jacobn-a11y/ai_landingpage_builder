/**
 * Zod schemas for embed block types: customHtml.
 */

import { z } from 'zod';
import { UniversalPropsSchema } from './universal';

const ImportMetaSchema = z.object({
  tier: z.string().optional(),
  scopeId: z.string().optional(),
  scopedCss: z.string().optional(),
  tokens: z.record(z.string(), z.unknown()).optional(),
}).optional();

export const CustomHtmlPropsSchema = UniversalPropsSchema.extend({
  html: z.string().optional(),
  _importMeta: ImportMetaSchema,
});

export type CustomHtmlProps = z.infer<typeof CustomHtmlPropsSchema>;
