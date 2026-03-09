/**
 * Zod schemas for content block types.
 */

import { z } from 'zod';
import { UniversalPropsSchema } from './universal';

// Shared text properties
const TextStyleProps = {
  fontFamily: z.string().optional(),
  fontSize: z.number().min(1).optional(),
  fontWeight: z.string().optional(),
  lineHeight: z.number().min(0).optional(),
  letterSpacing: z.number().optional(),
  textColor: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
  linkColor: z.string().optional(),
};

export const TextPropsSchema = UniversalPropsSchema.extend({
  content: z.string().optional(),
  contentHtml: z.string().optional(),
  headingLevel: z.string().optional(),
  ...TextStyleProps,
});

export const HeadlinePropsSchema = UniversalPropsSchema.extend({
  content: z.string().optional(),
  contentHtml: z.string().optional(),
  headingLevel: z.enum(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']).optional(),
  ...TextStyleProps,
});

export const ParagraphPropsSchema = UniversalPropsSchema.extend({
  content: z.string().optional(),
  contentHtml: z.string().optional(),
  ...TextStyleProps,
});

export const ImagePropsSchema = UniversalPropsSchema.extend({
  src: z.string().optional(),
  alt: z.string().optional(),
  linkHref: z.string().optional(),
  linkNewTab: z.boolean().optional(),
  objectFit: z.enum(['contain', 'cover', 'fill', 'none', 'scale-down']).optional(),
  lazyLoad: z.boolean().optional(),
});

export const ButtonPropsSchema = UniversalPropsSchema.extend({
  text: z.string().optional(),
  href: z.string().optional(),
  openNewTab: z.boolean().optional(),
  ariaLabel: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().min(1).optional(),
  fontWeight: z.string().optional(),
  textColor: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  buttonBgColor: z.string().optional(),
  buttonHoverBgColor: z.string().optional(),
  buttonTextColor: z.string().optional(),
  buttonHoverTextColor: z.string().optional(),
});

export const DividerPropsSchema = UniversalPropsSchema.extend({
  orientation: z.enum(['horizontal', 'vertical']).optional(),
  lineColor: z.string().optional(),
  lineThickness: z.number().min(0).optional(),
  lineStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
  lineWidth: z.string().optional(),
});

export const SpacerPropsSchema = UniversalPropsSchema.extend({
  height: z.number().min(0).optional(),
});

export const VideoPropsSchema = UniversalPropsSchema.extend({
  url: z.string().optional(),
  provider: z.enum(['youtube', 'vimeo', 'wistia', 'custom']).optional(),
  autoplay: z.boolean().optional(),
  loop: z.boolean().optional(),
  mute: z.boolean().optional(),
  aspectRatio: z.string().optional(),
});

export const ShapeRectanglePropsSchema = UniversalPropsSchema.extend({
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  fillColor: z.string().optional(),
});

export const ShapeCirclePropsSchema = UniversalPropsSchema.extend({
  size: z.number().min(0).optional(),
  fillColor: z.string().optional(),
});

export const CountdownPropsSchema = UniversalPropsSchema.extend({
  targetDate: z.string().optional(),
  daysLabel: z.string().optional(),
  hoursLabel: z.string().optional(),
  minutesLabel: z.string().optional(),
  secondsLabel: z.string().optional(),
});

export const AccordionSectionSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  contentHtml: z.string().optional(),
});

export const AccordionPropsSchema = UniversalPropsSchema.extend({
  sections: z.array(AccordionSectionSchema).optional(),
  expandOneOnly: z.boolean().optional(),
  arrowColor: z.string().optional(),
  dividerColor: z.string().optional(),
  sectionSpacing: z.number().min(0).optional(),
  titleFontFamily: z.string().optional(),
  titleFontSize: z.number().min(1).optional(),
  titleFontWeight: z.string().optional(),
  titleColor: z.string().optional(),
  contentColor: z.string().optional(),
});

export const CarouselSlideSchema = z.object({
  imageUrl: z.string().optional(),
  alt: z.string().optional(),
  content: z.string().optional(),
  contentHtml: z.string().optional(),
  linkHref: z.string().optional(),
});

export const CarouselPropsSchema = UniversalPropsSchema.extend({
  slides: z.array(CarouselSlideSchema).optional(),
  autoPlay: z.boolean().optional(),
  autoPlayInterval: z.number().min(500).optional(),
  showArrows: z.boolean().optional(),
  arrowsColor: z.string().optional(),
  showDots: z.boolean().optional(),
  dotSelectedColor: z.string().optional(),
  dotUnselectedColor: z.string().optional(),
  loop: z.boolean().optional(),
});

export const TablePropsSchema = UniversalPropsSchema.extend({
  rows: z.array(z.array(z.string())).optional(),
  hasHeader: z.boolean().optional(),
});

// Type exports
export type TextProps = z.infer<typeof TextPropsSchema>;
export type HeadlineProps = z.infer<typeof HeadlinePropsSchema>;
export type ParagraphProps = z.infer<typeof ParagraphPropsSchema>;
export type ImageProps = z.infer<typeof ImagePropsSchema>;
export type ButtonProps = z.infer<typeof ButtonPropsSchema>;
export type DividerProps = z.infer<typeof DividerPropsSchema>;
export type SpacerProps = z.infer<typeof SpacerPropsSchema>;
export type VideoProps = z.infer<typeof VideoPropsSchema>;
export type ShapeRectangleProps = z.infer<typeof ShapeRectanglePropsSchema>;
export type ShapeCircleProps = z.infer<typeof ShapeCirclePropsSchema>;
export type CountdownProps = z.infer<typeof CountdownPropsSchema>;
export type AccordionProps = z.infer<typeof AccordionPropsSchema>;
export type CarouselProps = z.infer<typeof CarouselPropsSchema>;
export type TableProps = z.infer<typeof TablePropsSchema>;
