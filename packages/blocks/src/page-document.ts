import type { BaseBlock, BlockType } from './block-types';

export const PAGE_DOCUMENT_SCHEMA_VERSION = 1;

export type LayoutMode = 'fluid' | 'canvas';

export interface OverlayDocument {
  id: string;
  root: string;
  blocks: Record<string, BaseBlock>;
  [key: string]: unknown;
}

export interface PageDocument {
  schemaVersion: number;
  root: string;
  blocks: Record<string, BaseBlock>;
  layoutMode?: LayoutMode;
  pageSettings?: Record<string, unknown>;
  stickyBars?: OverlayDocument[];
  popups?: OverlayDocument[];
}

const BLOCK_TYPES: BlockType[] = [
  'section',
  'container',
  'grid',
  'columns',
  'stack',
  'text',
  'headline',
  'paragraph',
  'image',
  'button',
  'divider',
  'spacer',
  'video',
  'shapeRectangle',
  'shapeCircle',
  'countdown',
  'table',
  'accordion',
  'carousel',
  'hero',
  'features',
  'testimonials',
  'faq',
  'logos',
  'form',
  'customHtml',
];

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isBlockType(value: unknown): value is BlockType {
  return typeof value === 'string' && BLOCK_TYPES.includes(value as BlockType);
}

function normalizeBlock(input: unknown): BaseBlock | null {
  if (!isObject(input)) return null;
  const id = typeof input.id === 'string' ? input.id : '';
  const incomingType = input.type;
  if (!id || !isBlockType(incomingType)) return null;

  const children = Array.isArray(input.children)
    ? input.children.filter((value): value is string => typeof value === 'string')
    : undefined;

  const props = isObject(input.props) ? input.props : undefined;
  let type = incomingType;
  if (incomingType === 'text') {
    const headingLevel = typeof props?.headingLevel === 'string' ? props.headingLevel.toLowerCase() : '';
    type = /^h[1-6]$/.test(headingLevel) ? 'headline' : 'paragraph';
  }

  return {
    id,
    type,
    ...(children?.length ? { children } : {}),
    ...(props ? { props } : {}),
  };
}

function normalizeBlockMap(input: unknown): Record<string, BaseBlock> {
  if (!isObject(input)) return {};
  const next: Record<string, BaseBlock> = {};
  Object.values(input).forEach((rawBlock) => {
    const normalized = normalizeBlock(rawBlock);
    if (!normalized) return;
    next[normalized.id] = normalized;
  });
  return next;
}

function normalizeOverlay(input: unknown): OverlayDocument | null {
  if (!isObject(input)) return null;
  const id = typeof input.id === 'string' ? input.id : '';
  const root = typeof input.root === 'string' ? input.root : '';
  const blocks = normalizeBlockMap(input.blocks);
  if (!id || !root || !blocks[root]) return null;
  return {
    ...input,
    id,
    root,
    blocks,
  };
}

function sanitizeChildLinks(blocks: Record<string, BaseBlock>): Record<string, BaseBlock> {
  const existing = new Set(Object.keys(blocks));
  const next: Record<string, BaseBlock> = {};
  Object.values(blocks).forEach((block) => {
    const children = block.children?.filter((id) => existing.has(id));
    next[block.id] = {
      ...block,
      ...(children?.length ? { children } : {}),
      ...(!children?.length && block.children ? { children: undefined } : {}),
    };
  });
  return next;
}

export function normalizePageDocument(input: unknown): PageDocument {
  const source = isObject(input) ? input : {};
  const blocks = sanitizeChildLinks(normalizeBlockMap(source.blocks));
  const blockIds = Object.keys(blocks);
  const declaredRoot = typeof source.root === 'string' ? source.root : '';
  const root = declaredRoot && blocks[declaredRoot] ? declaredRoot : blockIds[0] ?? '';
  const layoutMode: LayoutMode = source.layoutMode === 'canvas' ? 'canvas' : 'fluid';
  const stickyBars = Array.isArray(source.stickyBars)
    ? source.stickyBars.map(normalizeOverlay).filter((v): v is OverlayDocument => Boolean(v))
    : [];
  const popups = Array.isArray(source.popups)
    ? source.popups.map(normalizeOverlay).filter((v): v is OverlayDocument => Boolean(v))
    : [];

  return {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    root,
    blocks,
    ...(layoutMode === 'canvas' ? { layoutMode } : {}),
    ...(isObject(source.pageSettings) ? { pageSettings: source.pageSettings } : {}),
    ...(stickyBars.length ? { stickyBars } : {}),
    ...(popups.length ? { popups } : {}),
  };
}

export function toLegacyPageContent(doc: PageDocument): {
  schemaVersion: number;
  root: string;
  blocks: Record<string, BaseBlock>;
  layoutMode?: LayoutMode;
  pageSettings?: Record<string, unknown>;
  stickyBars?: OverlayDocument[];
  popups?: OverlayDocument[];
} {
  return {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    root: doc.root,
    blocks: doc.blocks,
    ...(doc.layoutMode === 'canvas' ? { layoutMode: doc.layoutMode } : {}),
    ...(doc.pageSettings ? { pageSettings: doc.pageSettings } : {}),
    ...(doc.stickyBars?.length ? { stickyBars: doc.stickyBars } : {}),
    ...(doc.popups?.length ? { popups: doc.popups } : {}),
  };
}
