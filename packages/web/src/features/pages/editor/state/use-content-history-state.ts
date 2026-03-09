import { useCallback } from 'react';
import useUndo from 'use-undo';
import { recordEditorMetric } from '../quality/metrics';
import type { EditorContentJson } from '../types';
import type { RecordMutation } from './use-mutation-log';

export interface ContentHistoryState {
  content: EditorContentJson;
  setContent: (content: EditorContentJson | ((prev: EditorContentJson) => EditorContentJson)) => void;
  replaceContent: (content: EditorContentJson) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useContentHistoryState({
  initialContent,
  pageId,
  recordMutation,
}: {
  initialContent: EditorContentJson;
  pageId: string;
  recordMutation: RecordMutation;
}): ContentHistoryState {
  const [state, { set: setState, undo: rawUndo, redo: rawRedo, canUndo, canRedo }] = useUndo(
    initialContent
  );

  const content = state.present;

  const setContent = useCallback(
    (updater: EditorContentJson | ((prev: EditorContentJson) => EditorContentJson)) => {
      setState(typeof updater === 'function' ? updater(state.present) : updater);
    },
    [setState, state.present]
  );

  const replaceContent = useCallback((next: EditorContentJson) => {
    setState(next);
  }, [setState]);

  const undo = useCallback(() => {
    const startedAt = performance.now();
    rawUndo();
    recordEditorMetric('editor_undo_ms', performance.now() - startedAt, { pageId });
    recordMutation('undo');
  }, [rawUndo, pageId, recordMutation]);

  const redo = useCallback(() => {
    const startedAt = performance.now();
    rawRedo();
    recordEditorMetric('editor_redo_ms', performance.now() - startedAt, { pageId });
    recordMutation('redo');
  }, [rawRedo, pageId, recordMutation]);

  return {
    content,
    setContent,
    replaceContent,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
