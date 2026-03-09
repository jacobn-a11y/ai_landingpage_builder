/**
 * Viewport store: breakpoint, canvas width, preview mode.
 */

import { createStore } from 'zustand/vanilla';
import type { Breakpoint } from '../types';
import { BREAKPOINT_WIDTHS } from '../types';

export interface ViewportState {
  breakpoint: Breakpoint;
  canvasWidth: number;
  previewMode: boolean;
}

export interface ViewportActions {
  setBreakpoint: (b: Breakpoint) => void;
  setCanvasWidth: (w: number) => void;
  setPreviewMode: (v: boolean) => void;
}

export type ViewportStore = ViewportState & ViewportActions;

export function createViewportStore() {
  return createStore<ViewportStore>()((set) => ({
    breakpoint: 'desktop',
    canvasWidth: BREAKPOINT_WIDTHS.desktop,
    previewMode: false,

    setBreakpoint: (b) => {
      set({ breakpoint: b, canvasWidth: BREAKPOINT_WIDTHS[b] });
    },

    setCanvasWidth: (w) => {
      set({ canvasWidth: w });
    },

    setPreviewMode: (v) => {
      set({ previewMode: v });
    },
  }));
}

export type ViewportStoreApi = ReturnType<typeof createViewportStore>;
