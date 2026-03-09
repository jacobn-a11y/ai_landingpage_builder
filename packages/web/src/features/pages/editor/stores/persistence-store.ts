/**
 * Persistence store: dirty tracking, autosave, save status.
 */

import { createStore } from 'zustand/vanilla';
import { api } from '@/lib/api';
import type { PageScripts } from '@/lib/api';
import type { EditorContentJson } from '../types';
import { toPageContentJson } from '../types';

const AUTOSAVE_DEBOUNCE_MS = 5000;

export interface PersistenceState {
  dirty: boolean;
  saving: boolean;
  lastSaved: Date | null;
}

export interface PersistenceActions {
  save: (
    pageId: string,
    content: EditorContentJson,
    scripts: PageScripts,
    onError: (msg: string) => void,
  ) => Promise<void>;
  markClean: () => void;
  setSaving: (v: boolean) => void;
  /** Check dirty by comparing current content/scripts to last-saved snapshots */
  checkDirty: (content: EditorContentJson, scripts: PageScripts) => boolean;
  /** Update the last-saved reference snapshots (call after successful save) */
  _updateRefs: (content: EditorContentJson, scripts: PageScripts) => void;
  /** Schedule an autosave (debounced). Call whenever content or scripts change. */
  scheduleAutosave: (
    pageId: string,
    content: EditorContentJson,
    scripts: PageScripts,
    onError: (msg: string) => void,
  ) => void;
  /** Cancel any pending autosave timer */
  cancelAutosave: () => void;
  /** Initialise last-saved refs */
  _init: (content: EditorContentJson, scripts: PageScripts) => void;
}

export type PersistenceStore = PersistenceState & PersistenceActions;

export function createPersistenceStore() {
  let lastSavedContentJson = '';
  let lastSavedScriptsJson = '';
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  return createStore<PersistenceStore>()((set, get) => ({
    dirty: false,
    saving: false,
    lastSaved: null,

    _init: (content, scripts) => {
      lastSavedContentJson = JSON.stringify(content);
      lastSavedScriptsJson = JSON.stringify(scripts);
      set({ dirty: false, saving: false, lastSaved: null });
    },

    checkDirty: (content, scripts) => {
      const contentDirty = JSON.stringify(content) !== lastSavedContentJson;
      const scriptsDirty = JSON.stringify(scripts) !== lastSavedScriptsJson;
      const dirty = contentDirty || scriptsDirty;
      set({ dirty });
      return dirty;
    },

    _updateRefs: (content, scripts) => {
      lastSavedContentJson = JSON.stringify(content);
      lastSavedScriptsJson = JSON.stringify(scripts);
      set({ dirty: false });
    },

    markClean: () => {
      set({ dirty: false });
    },

    setSaving: (v) => {
      set({ saving: v });
    },

    save: async (pageId, content, scripts, onError) => {
      const contentDirty = JSON.stringify(content) !== lastSavedContentJson;
      const scriptsDirty = JSON.stringify(scripts) !== lastSavedScriptsJson;
      if (!contentDirty && !scriptsDirty) return;

      set({ saving: true });
      try {
        const payload: { contentJson?: object; scripts?: PageScripts } = {};
        if (contentDirty) {
          payload.contentJson = toPageContentJson(content);
          lastSavedContentJson = JSON.stringify(content);
        }
        if (scriptsDirty) {
          payload.scripts = scripts as PageScripts;
          lastSavedScriptsJson = JSON.stringify(scripts);
        }
        await api.pages.update(pageId, payload);
        set({ lastSaved: new Date(), dirty: false, saving: false });
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Failed to save');
        set({ saving: false });
      }
    },

    scheduleAutosave: (pageId, content, scripts, onError) => {
      if (autosaveTimer) clearTimeout(autosaveTimer);
      const contentDirty = JSON.stringify(content) !== lastSavedContentJson;
      const scriptsDirty = JSON.stringify(scripts) !== lastSavedScriptsJson;
      const dirty = contentDirty || scriptsDirty;
      set({ dirty });
      if (!dirty) return;
      autosaveTimer = setTimeout(() => {
        get().save(pageId, content, scripts, onError);
      }, AUTOSAVE_DEBOUNCE_MS);
    },

    cancelAutosave: () => {
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
        autosaveTimer = null;
      }
    },
  }));
}

export type PersistenceStoreApi = ReturnType<typeof createPersistenceStore>;
