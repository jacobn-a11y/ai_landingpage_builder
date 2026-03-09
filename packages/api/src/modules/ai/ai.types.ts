/**
 * Type definitions for the AI chat module.
 */

// ---------------------------------------------------------------------------
// Editor Mutations
// ---------------------------------------------------------------------------

export type EditorMutationType =
  | 'insertBlock'
  | 'updateBlockProps'
  | 'removeBlock'
  | 'moveBlock'
  | 'replaceText'
  | 'duplicateBlock'
  | 'reorderChildren'
  | 'updatePageSettings'
  | 'updateScripts'
  | 'setLayoutMode';

export interface InsertBlockMutation {
  type: 'insertBlock';
  parentId: string;
  index: number;
  block: { id: string; type: string; props?: Record<string, unknown>; children?: string[] };
}

export interface UpdateBlockPropsMutation {
  type: 'updateBlockProps';
  blockId: string;
  props: Record<string, unknown>;
}

export interface RemoveBlockMutation {
  type: 'removeBlock';
  blockId: string;
}

export interface MoveBlockMutation {
  type: 'moveBlock';
  blockId: string;
  newParentId: string;
  newIndex: number;
}

export interface ReplaceTextMutation {
  type: 'replaceText';
  blockId: string;
  text: string;
}

export interface DuplicateBlockMutation {
  type: 'duplicateBlock';
  blockId: string;
}

export interface ReorderChildrenMutation {
  type: 'reorderChildren';
  parentId: string;
  childIds: string[];
}

export interface UpdatePageSettingsMutation {
  type: 'updatePageSettings';
  settings: Record<string, unknown>;
}

export interface UpdateScriptsMutation {
  type: 'updateScripts';
  scripts: Record<string, unknown>;
}

export interface SetLayoutModeMutation {
  type: 'setLayoutMode';
  mode: 'fluid' | 'canvas';
}

export type EditorMutation =
  | InsertBlockMutation
  | UpdateBlockPropsMutation
  | RemoveBlockMutation
  | MoveBlockMutation
  | ReplaceTextMutation
  | DuplicateBlockMutation
  | ReorderChildrenMutation
  | UpdatePageSettingsMutation
  | UpdateScriptsMutation
  | SetLayoutModeMutation;

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
