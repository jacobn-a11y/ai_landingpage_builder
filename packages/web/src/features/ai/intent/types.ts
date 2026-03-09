/**
 * Intent types — Block 7
 *
 * Deterministic intents can be executed without an LLM call.
 * The `needsLLM` fallback is used for anything the deterministic
 * layer cannot confidently classify.
 */

import type { PageSummary } from '../page-context';

export type DeterministicIntent =
  | { type: 'editText'; blockId: string; newText: string }
  | { type: 'changeColor'; blockId: string; prop: string; value: string }
  | { type: 'changeFont'; blockId: string; fontFamily: string }
  | { type: 'changeFontSize'; blockId: string; delta: number }
  | { type: 'setFontSize'; blockId: string; value: number }
  | { type: 'addSection'; sectionType: string; position: 'before' | 'after'; referenceId?: string }
  | { type: 'removeBlock'; blockId: string }
  | { type: 'duplicateBlock'; blockId: string }
  | { type: 'reorder'; blockId: string; direction: 'up' | 'down' }
  | { type: 'toggleVisibility'; blockId: string; device: 'desktop' | 'tablet' | 'mobile' }
  | { type: 'changeAlignment'; blockId: string; align: 'left' | 'center' | 'right' };

export type Intent =
  | DeterministicIntent
  | { type: 'needsLLM'; userMessage: string; context: PageSummary };
