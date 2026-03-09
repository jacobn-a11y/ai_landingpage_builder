/**
 * Editor-specific types extending block types.
 */

import type {
  BaseBlock,
  BlockType,
  PageContentJson,
  PageDocument,
} from '@replica-pages/blocks';
import {
  normalizePageDocument,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  toLegacyPageContent,
} from '@replica-pages/blocks';

export type { BaseBlock, BlockType, PageContentJson };

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
};

export interface BlockMeta {
  locked?: boolean;
  hidden?: boolean;
}

export interface EditorBlock extends BaseBlock {
  meta?: BlockMeta;
}

export type LayoutMode = 'fluid' | 'canvas';

export interface PageSettings {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  fontFamily?: string;
  headlineFontFamily?: string;
  headlineFontWeight?: string;
  paragraphFontFamily?: string;
  paragraphFontWeight?: string;
  buttonFontFamily?: string;
  buttonFontWeight?: string;
  customCss?: string;
  bodyClassName?: string;
  faviconUrl?: string;
  seoMetaDescription?: string;
  seoOgTitle?: string;
  seoOgImage?: string;
}

export interface OverlayContent {
  root: string;
  blocks: Record<string, EditorBlock>;
}

export interface StickyBar extends OverlayContent {
  id: string;
  position: 'top' | 'bottom';
  backgroundColor?: string;
}

export interface Popup extends OverlayContent {
  id: string;
  trigger: 'onLoad' | 'delay' | 'exitIntent';
  delaySeconds?: number;
}

export interface EditorContentJson {
  schemaVersion: number;
  root: string;
  blocks: Record<string, EditorBlock>;
  layoutMode?: LayoutMode;
  pageSettings?: PageSettings;
  stickyBars?: StickyBar[];
  popups?: Popup[];
}

export function toEditorContentJson(
  content: PageContentJson | object | null
): EditorContentJson {
  const normalized = normalizePageDocument(content);

  const pageSettings = normalized.pageSettings as PageSettings | undefined;
  const stickyBars = normalized.stickyBars as StickyBar[] | undefined;
  const popups = normalized.popups as Popup[] | undefined;

  return {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    root: normalized.root,
    blocks: normalized.blocks as Record<string, EditorBlock>,
    ...(normalized.layoutMode ? { layoutMode: normalized.layoutMode } : {}),
    ...(pageSettings ? { pageSettings } : {}),
    ...(stickyBars?.length ? { stickyBars } : {}),
    ...(popups?.length ? { popups } : {}),
  };
}

export function toPageContentJson(
  content: EditorContentJson
): PageContentJson & {
  schemaVersion: number;
  layoutMode?: LayoutMode;
  pageSettings?: PageSettings;
  stickyBars?: StickyBar[];
  popups?: Popup[];
} {
  const normalized = normalizePageDocument(content) as PageDocument;
  const legacy = toLegacyPageContent(normalized);
  return {
    ...legacy,
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    ...(legacy.layoutMode ? { layoutMode: legacy.layoutMode } : {}),
    ...(legacy.pageSettings ? { pageSettings: legacy.pageSettings as PageSettings } : {}),
    ...(legacy.stickyBars ? { stickyBars: legacy.stickyBars as StickyBar[] } : {}),
    ...(legacy.popups ? { popups: legacy.popups as Popup[] } : {}),
  };
}
