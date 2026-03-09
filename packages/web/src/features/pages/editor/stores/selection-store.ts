/**
 * Selection store: tracks which blocks are currently selected.
 */

import { createStore } from 'zustand/vanilla';

export interface SelectionState {
  selectedBlockIds: string[];
  selectedBlockId: string | null;
}

export interface SelectionActions {
  setSelectedBlockId: (id: string | null) => void;
  setSelectedBlockIds: (ids: string[]) => void;
  toggleBlockSelection: (id: string, addToSelection?: boolean) => void;
  handleBlockClick: (id: string, e: { ctrlKey: boolean; metaKey: boolean }) => void;
  clearSelection: () => void;
}

export type SelectionStore = SelectionState & SelectionActions;

export function createSelectionStore() {
  return createStore<SelectionStore>()((set) => ({
    selectedBlockIds: [],
    selectedBlockId: null,

    setSelectedBlockId: (id) => {
      set({ selectedBlockIds: id ? [id] : [], selectedBlockId: id });
    },

    setSelectedBlockIds: (ids) => {
      set({ selectedBlockIds: ids, selectedBlockId: ids[0] ?? null });
    },

    toggleBlockSelection: (id, addToSelection) => {
      set((s) => {
        const has = s.selectedBlockIds.includes(id);
        let next: string[];
        if (addToSelection) {
          next = has
            ? s.selectedBlockIds.filter((x) => x !== id)
            : [...s.selectedBlockIds, id];
        } else {
          next = has && s.selectedBlockIds.length === 1 ? [] : [id];
        }
        return { selectedBlockIds: next, selectedBlockId: next[0] ?? null };
      });
    },

    handleBlockClick: (id, e) => {
      if (e.ctrlKey || e.metaKey) {
        set((s) => {
          const has = s.selectedBlockIds.includes(id);
          const next = has
            ? s.selectedBlockIds.filter((x) => x !== id)
            : [...s.selectedBlockIds, id];
          return { selectedBlockIds: next, selectedBlockId: next[0] ?? null };
        });
      } else {
        set({ selectedBlockIds: [id], selectedBlockId: id });
      }
    },

    clearSelection: () => {
      set({ selectedBlockIds: [], selectedBlockId: null });
    },
  }));
}

export type SelectionStoreApi = ReturnType<typeof createSelectionStore>;
