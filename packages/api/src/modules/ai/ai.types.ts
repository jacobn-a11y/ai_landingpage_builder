/**
 * Type definitions for the AI chat module.
 *
 * EditorMutation here mirrors the canonical definition in
 * packages/web/src/features/pages/editor/mutations/types.ts
 * to ensure server-generated mutations are directly consumable by the client.
 */

// ---------------------------------------------------------------------------
// Editor Mutations — canonical format (mirrors client mutations/types.ts)
// ---------------------------------------------------------------------------

export type EditorMutation =
  | { type: 'insertBlock'; parentId: string | null; index?: number; blockType: string; props?: Record<string, unknown>; blockId?: string }
  | { type: 'updateBlockProps'; blockId: string; props: Record<string, unknown> }
  | { type: 'removeBlock'; blockId: string }
  | { type: 'moveBlock'; blockId: string; parentId: string | null; index: number }
  | { type: 'replaceText'; blockId: string; content: string; contentHtml?: string }
  | { type: 'duplicateBlock'; blockId: string }
  | { type: 'reorderChildren'; parentId: string; childIds: string[] }
  | { type: 'updatePageSettings'; settings: Record<string, unknown> }
  | { type: 'updateScripts'; scripts: { header?: string; footer?: string } }
  | { type: 'setLayoutMode'; mode: 'fluid' | 'canvas' };

// ---------------------------------------------------------------------------
// Chat / Request / Response
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  mutations?: EditorMutation[];
}

export interface PageSummary {
  sectionCount: number;
  blockCount: number;
  blockCountByType: Record<string, number>;
  colorPalette: string[];
  fontFamilies: string[];
  imageCount: number;
  hasForm: boolean;
  layoutMode: string;
  textSnippets: { blockId: string; type: string; text: string }[];
}

export interface SectionMapEntry {
  sectionId: string;
  index: number;
  label: string;
  type: string;
  blockCount: number;
  childTypes: string[];
  textSnippets: string[];
}

export interface ChatRequest {
  message: string;
  pageContext: PageSummary;
  sectionMap: SectionMapEntry[];
  conversationHistory?: ChatMessage[];
  selectedBlockId?: string;
}

export interface ChatStreamChunk {
  type: 'text' | 'mutations';
  data: string | EditorMutation[];
}

// ---------------------------------------------------------------------------
// Block helpers (server-side representations)
// ---------------------------------------------------------------------------

export interface EditorBlock {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: string[];
}

export interface SectionTemplate {
  rootBlock: EditorBlock;
  allBlocks: Record<string, EditorBlock>;
}
