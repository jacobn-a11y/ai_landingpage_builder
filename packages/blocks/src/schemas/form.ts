/**
 * Zod schemas for form block type.
 */

import { z } from 'zod';
import { UniversalPropsSchema } from './universal';

export const FormPropsSchema = UniversalPropsSchema.extend({
  formId: z.string().optional(),
  submitText: z.string().optional(),
  successMessage: z.string().optional(),
  redirectUrl: z.string().optional(),
});

export type FormProps = z.infer<typeof FormPropsSchema>;
