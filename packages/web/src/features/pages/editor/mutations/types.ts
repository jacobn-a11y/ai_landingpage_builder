/**
 * Mutation types for the editor mutation engine.
 * These define the formal operations the AI agent and user can perform.
 */

import type { EditorContentJson } from '../types';

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

export interface MutationTransaction {
  id: string;
  mutations: EditorMutation[];
  timestamp: number;
  source: 'user' | 'ai' | 'system';
  description?: string;
}

export interface MutationResult {
  success: boolean;
  newContent?: EditorContentJson;
  error?: string;
  blockId?: string;
}
