/**
 * Overlay store: sticky bars and popups.
 *
 * NOTE: In the current architecture overlays are stored inside EditorContentJson
 * and managed by the document store. This file re-exports convenience types so
 * that consumers can import from the stores barrel. The actual mutations live in
 * document-store.ts to keep undo/redo consistent.
 */

export type {
  StickyBar,
  Popup,
} from '../types';
