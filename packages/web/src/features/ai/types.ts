/**
 * Shared AI feature types used across web package.
 *
 * Mirrors relevant API types so the web package does not depend on the API
 * package at compile time.
 */

// ---------------------------------------------------------------------------
// InspirationProfile (mirrors api/modules/ai/file-analysis.ts)
// ---------------------------------------------------------------------------

export interface InspirationProfile {
  id: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  analysis: {
    colorPalette: string[];
    typographyFeel: string;
    spacingDensity: 'compact' | 'comfortable' | 'spacious';
    layoutStyle: string;
    contentTone: string;
    keyElements: string[];
  };
  analyzedAt: number;
}

// ---------------------------------------------------------------------------
// Editor mutation — re-export from canonical source
// ---------------------------------------------------------------------------

export type { EditorMutation } from '@/features/pages/editor/mutations/types';

// ---------------------------------------------------------------------------
// Page summary (lightweight snapshot for context-builder / smart-defaults)
// ---------------------------------------------------------------------------

export interface PageSummary {
  pageId: string;
  title: string;
  fontFamily?: string;
  headlineFontFamily?: string;
  primaryColor?: string;
  backgroundColor?: string;
  blockCount: number;
  sectionCount: number;
  buttonColors: string[];
  headlineStyles: { fontFamily?: string; fontWeight?: string; fontSize?: string }[];
}

// ---------------------------------------------------------------------------
// Chat messages
// ---------------------------------------------------------------------------

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export interface Conversation {
  id: string;
  pageId: string;
  messages: ChatMessage[];
  inspirationProfiles: InspirationProfile[];
  createdAt: number;
  updatedAt: number;
}
