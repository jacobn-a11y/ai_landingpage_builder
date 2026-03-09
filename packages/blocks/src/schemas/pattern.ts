/**
 * Zod schemas for pattern block types: hero, features, testimonials, faq, logos.
 * Pattern blocks are containers with predefined layout structure.
 */

import { z } from 'zod';
import { UniversalPropsSchema } from './universal';

// Pattern blocks are layout containers — they hold children but have no
// type-specific props beyond universal styling.

export const HeroPropsSchema = UniversalPropsSchema.extend({});
export const FeaturesPropsSchema = UniversalPropsSchema.extend({});
export const TestimonialsPropsSchema = UniversalPropsSchema.extend({});
export const FaqPropsSchema = UniversalPropsSchema.extend({});
export const LogosPropsSchema = UniversalPropsSchema.extend({});

export type HeroProps = z.infer<typeof HeroPropsSchema>;
export type FeaturesProps = z.infer<typeof FeaturesPropsSchema>;
export type TestimonialsProps = z.infer<typeof TestimonialsPropsSchema>;
export type FaqProps = z.infer<typeof FaqPropsSchema>;
export type LogosProps = z.infer<typeof LogosPropsSchema>;
