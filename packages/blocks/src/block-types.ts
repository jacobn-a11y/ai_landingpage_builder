/**
 * Block type definitions for the drag-and-drop editor.
 * Layout, content, pattern, form, and embed blocks.
 */

export type BlockCategory = 'layout' | 'content' | 'pattern' | 'form' | 'embed';

export type LayoutBlockType =
  | 'section'
  | 'container'
  | 'grid'
  | 'columns'
  | 'stack';

export type ContentBlockType =
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'video'
  | 'shapeRectangle'
  | 'shapeCircle'
  | 'countdown'
  | 'table';

export type PatternBlockType =
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'faq'
  | 'logos';

export type FormBlockType = 'form';

export type EmbedBlockType = 'customHtml';

export type BlockType =
  | LayoutBlockType
  | ContentBlockType
  | PatternBlockType
  | FormBlockType
  | EmbedBlockType;

export interface BaseBlock {
  id: string;
  type: BlockType;
  children?: string[];
  props?: Record<string, unknown>;
}

export interface PageContentJson {
  root: string;
  blocks: Record<string, BaseBlock>;
}
