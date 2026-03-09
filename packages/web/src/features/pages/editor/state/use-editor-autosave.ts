import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { PageScripts } from '@/lib/api';
import { recordEditorMetric } from '../quality/metrics';
import { toPageContentJson, type EditorContentJson } from '../types';
import type { RecordMutation } from './use-mutation-log';

const AUTOSAVE_DEBOUNCE_MS = 5000;

export interface EditorAutosaveState {
  dirty: boolean;
  saving: boolean;
  lastSaved: Date | null;
  scripts: PageScripts;
  updateScripts: (updates: Partial<PageScripts>) => void;
  markContentSaved: (content: EditorContentJson) => void;
}

export function useEditorAutosave({
  pageId,
  content,
  initialContent,
  initialScripts,
  onSaveError,
  recordMutation,
}: {
  pageId: string;
  content: EditorContentJson;
  initialContent: EditorContentJson;
  initialScripts: PageScripts;
  onSaveError: (message: string) => void;
  recordMutation: RecordMutation;
}): EditorAutosaveState {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [scripts, setScripts] = useState<PageScripts>(initialScripts);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>(JSON.stringify(initialContent));
  const lastSavedScriptsRef = useRef<string>(JSON.stringify(initialScripts));

  useEffect(() => {
    setScripts(initialScripts);
    lastSavedScriptsRef.current = JSON.stringify(initialScripts);
  }, [initialScripts]);

  const contentDirty = useMemo(() => {
    const current = JSON.stringify(content);
    return current !== lastSavedContentRef.current;
  }, [content]);

  const scriptsDirty = useMemo(() => {
    const current = JSON.stringify(scripts);
    return current !== lastSavedScriptsRef.current;
  }, [scripts]);

  const dirty = contentDirty || scriptsDirty;

  const updateScripts = useCallback((updates: Partial<PageScripts>) => {
    setScripts((prev) => ({ ...prev, ...updates }));
    recordMutation('update_scripts');
  }, [recordMutation]);

  const markContentSaved = useCallback((nextContent: EditorContentJson) => {
    lastSavedContentRef.current = JSON.stringify(nextContent);
    setLastSaved(new Date());
  }, []);

  const save = useCallback(async () => {
    if (!contentDirty && !scriptsDirty) return;
    setSaving(true);
    const startedAt = performance.now();

    try {
      const payload: { contentJson?: object; scripts?: PageScripts } = {};
      if (contentDirty) payload.contentJson = toPageContentJson(content);
      if (scriptsDirty) payload.scripts = scripts;

      await api.pages.update(pageId, payload);

      if (contentDirty) {
        lastSavedContentRef.current = JSON.stringify(content);
      }
      if (scriptsDirty) {
        lastSavedScriptsRef.current = JSON.stringify(scripts);
      }

      setLastSaved(new Date());
      recordEditorMetric('editor_autosave_ms', performance.now() - startedAt, { pageId });
      recordEditorMetric('editor_save_success', undefined, { pageId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      onSaveError(message);
      recordEditorMetric('editor_save_error', undefined, { pageId });
    } finally {
      setSaving(false);
    }
  }, [pageId, content, scripts, contentDirty, scriptsDirty, onSaveError]);

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      void save();
    }, AUTOSAVE_DEBOUNCE_MS);
    saveTimeoutRef.current = timer;

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [content, scripts, dirty, save]);

  return {
    dirty,
    saving,
    lastSaved,
    scripts,
    updateScripts,
    markContentSaved,
  };
}
