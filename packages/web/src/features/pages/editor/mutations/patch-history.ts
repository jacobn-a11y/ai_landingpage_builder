/**
 * Snapshot-based undo/redo history tagged with transaction IDs for AI traceability.
 */

import type { EditorContentJson } from '../types';

export interface HistoryEntry {
  txnId: string;
  snapshot: EditorContentJson;
}

const MAX_HISTORY = 100;

/**
 * PatchHistory maintains undo/redo stacks of editor state snapshots.
 * Each entry is tagged with a transaction ID for traceability.
 */
export class PatchHistory {
  private _undoStack: HistoryEntry[] = [];
  private _redoStack: HistoryEntry[] = [];

  /**
   * Push a new state snapshot onto the undo stack.
   * The `beforeState` is saved so that undoing restores it.
   * Clears the redo stack (new edits invalidate the redo chain).
   */
  push(txnId: string, beforeState: EditorContentJson, _afterState: EditorContentJson): void {
    this._undoStack.push({
      txnId,
      snapshot: JSON.parse(JSON.stringify(beforeState)),
    });

    // Enforce max history limit
    if (this._undoStack.length > MAX_HISTORY) {
      this._undoStack.shift();
    }

    // Clear redo stack on new mutation
    this._redoStack = [];
  }

  /**
   * Undo the last transaction.
   * Returns the previous state snapshot or null if nothing to undo.
   * The current state must be passed in so it can be pushed onto the redo stack.
   */
  undo(currentState: EditorContentJson): { txnId: string; state: EditorContentJson } | null {
    const entry = this._undoStack.pop();
    if (!entry) return null;

    // Push the current state onto the redo stack
    this._redoStack.push({
      txnId: entry.txnId,
      snapshot: JSON.parse(JSON.stringify(currentState)),
    });

    return {
      txnId: entry.txnId,
      state: JSON.parse(JSON.stringify(entry.snapshot)),
    };
  }

  /**
   * Redo the last undone transaction.
   * Returns the restored state snapshot or null if nothing to redo.
   * The current state must be passed in so it can be pushed onto the undo stack.
   */
  redo(currentState: EditorContentJson): { txnId: string; state: EditorContentJson } | null {
    const entry = this._redoStack.pop();
    if (!entry) return null;

    // Push the current state onto the undo stack
    this._undoStack.push({
      txnId: entry.txnId,
      snapshot: JSON.parse(JSON.stringify(currentState)),
    });

    return {
      txnId: entry.txnId,
      state: JSON.parse(JSON.stringify(entry.snapshot)),
    };
  }

  get canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  get undoCount(): number {
    return this._undoStack.length;
  }

  get redoCount(): number {
    return this._redoStack.length;
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this._undoStack = [];
    this._redoStack = [];
  }
}
