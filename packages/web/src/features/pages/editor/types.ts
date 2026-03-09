/**
 * Editor-specific types extending block types.
 */

import type {
  BaseBlock,
  BlockType,
  PageContentJson,
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
  const c = content as (PageContentJson & { layoutMode?: LayoutMode }) | null | undefined;
  if (!c || typeof c !== 'object') {
    return { root: '', blocks: {}, layoutMode: 'fluid' };
  }
  const root = typeof c.root === 'string' ? c.root : '';
  const blocks = c.blocks && typeof c.blocks === 'object' ? c.blocks : {};
  const layoutMode = c.layoutMode === 'canvas' ? 'canvas' : 'fluid';
  const pageSettings = (c as { pageSettings?: PageSettings }).pageSettings;
  const stickyBars = (c as { stickyBars?: StickyBar[] }).stickyBars;
  const popups = (c as { popups?: Popup[] }).popups;
  return {
    root,
    blocks,
    layoutMode,
    ...(pageSettings ? { pageSettings } : {}),
    ...(stickyBars?.length ? { stickyBars } : {}),
    ...(popups?.length ? { popups } : {}),
  };
}

export function toPageContentJson(content: EditorContentJson): PageContentJson & { layoutMode?: LayoutMode; pageSettings?: PageSettings; stickyBars?: StickyBar[]; popups?: Popup[] } {
  return {
    root: content.root,
    blocks: content.blocks,
    ...(content.layoutMode && content.layoutMode !== 'fluid' ? { layoutMode: content.layoutMode } : {}),
    ...(content.pageSettings ? { pageSettings: content.pageSettings } : {}),
    ...(content.stickyBars?.length ? { stickyBars: content.stickyBars } : {}),
    ...(content.popups?.length ? { popups: content.popups } : {}),
  };
}
