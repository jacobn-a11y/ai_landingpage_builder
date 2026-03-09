/**
 * Block type registry for toolbar and BlockRenderer.
 */

import type { BlockType } from '@replica-pages/blocks';

export interface BlockDefinition {
  type: BlockType;
  label: string;
  category: 'layout' | 'content' | 'pattern' | 'form' | 'embed';
  icon?: string;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // Layout
  { type: 'section', label: 'Section', category: 'layout' },
  { type: 'container', label: 'Container', category: 'layout' },
  { type: 'grid', label: 'Grid', category: 'layout' },
  { type: 'columns', label: 'Columns', category: 'layout' },
  { type: 'stack', label: 'Stack', category: 'layout' },
  // Content
  { type: 'headline', label: 'Headline', category: 'content' },
  { type: 'paragraph', label: 'Paragraph', category: 'content' },
  { type: 'text', label: 'Text (legacy)', category: 'content' },
  { type: 'image', label: 'Image', category: 'content' },
  { type: 'button', label: 'Button', category: 'content' },
  { type: 'divider', label: 'Divider', category: 'content' },
  { type: 'spacer', label: 'Spacer', category: 'content' },
  { type: 'video', label: 'Video', category: 'content' },
  { type: 'shapeRectangle', label: 'Shape – Rectangle', category: 'content' },
  { type: 'shapeCircle', label: 'Shape – Circle', category: 'content' },
  { type: 'countdown', label: 'Countdown Timer', category: 'content' },
  { type: 'accordion', label: 'Accordion', category: 'content' },
  { type: 'carousel', label: 'Carousel / Slider', category: 'content' },
  { type: 'table', label: 'Table', category: 'content' },
  // Pattern
  { type: 'hero', label: 'Hero', category: 'pattern' },
  { type: 'features', label: 'Features', category: 'pattern' },
  { type: 'testimonials', label: 'Testimonials', category: 'pattern' },
  { type: 'faq', label: 'FAQ', category: 'pattern' },
  { type: 'logos', label: 'Logos', category: 'pattern' },
  // Form
  { type: 'form', label: 'Form', category: 'form' },
  // Embed
  { type: 'customHtml', label: 'Custom HTML', category: 'embed' },
];

export const LAYOUT_BLOCKS = BLOCK_DEFINITIONS.filter(
  (b) => b.category === 'layout'
).map((b) => b.type);

export const CONTAINER_BLOCKS = [
  'section',
  'container',
  'grid',
  'columns',
  'stack',
  'hero',
  'features',
  'testimonials',
  'faq',
  'logos',
] as const;

export function isContainerBlock(type: BlockType): boolean {
  return (CONTAINER_BLOCKS as readonly string[]).includes(type);
}
