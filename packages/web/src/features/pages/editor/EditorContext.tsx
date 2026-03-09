/**
 * Editor context – thin compatibility shim.
 *
 * Initialises the Zustand stores and exposes the same EditorContextValue
 * interface so that existing components continue to work unchanged.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useStore } from 'zustand';
import type { Page, PageScripts } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type {
  EditorContentJson,
  EditorBlock,
  LayoutMode,
  PageSettings,
  StickyBar,
  Popup,
  Breakpoint,
} from './types';
import {
  toEditorContentJson,
} from './types';
import { loadGoogleFonts } from './google-fonts';
import {
  createDocumentStore,
  createEmptyBlock,
  type DocumentStoreApi,
} from './stores/document-store';
import {
  createSelectionStore,
  type SelectionStoreApi,
} from './stores/selection-store';
import {
  createViewportStore,
  type ViewportStoreApi,
} from './stores/viewport-store';
import {
  createPersistenceStore,
  type PersistenceStoreApi,
} from './stores/persistence-store';

// Re-export for backward compatibility
export { createEmptyBlock };

export interface EditorContextValue {
  pageId: string;
  page: Page | null;
  content: EditorContentJson;
  setContent: (content: EditorContentJson | ((prev: EditorContentJson) => EditorContentJson)) => void;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  insertBlock: (type: string, parentId: string | null, index?: number) => string;
  insertBlockFromLibrary: (blockJson: object, parentId: string | null, index?: number) => string;
  updateBlock: (id: string, updates: Partial<EditorBlock>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, parentId: string | null, index: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  breakpoint: Breakpoint;
  setBreakpoint: (b: Breakpoint) => void;
  canvasWidth: number;
  setCanvasWidth: (w: number) => void;
  dirty: boolean;
  saving: boolean;
  lastSaved: Date | null;
  scripts: PageScripts;
  updateScripts: (updates: Partial<PageScripts>) => void;
  rollbackToPublished: () => Promise<void>;
  canRollback: boolean;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  pageSettings: PageSettings;
  updatePageSettings: (updates: Partial<PageSettings>) => void;
  selectedBlockIds: string[];
  setSelectedBlockIds: (ids: string[]) => void;
  toggleBlockSelection: (id: string, addToSelection?: boolean) => void;
  handleBlockClick: (id: string, e: React.MouseEvent) => void;
  copyBlocks: () => void;
  pasteBlocks: (parentId: string | null, index?: number) => string[] | null;
  groupBlocks: () => string | null;
  alignBlocks: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  updateBlocksZIndex: (delta: number) => void;
  stickyBars: StickyBar[];
  popups: Popup[];
  addStickyBar: () => string;
  updateStickyBar: (id: string, updates: Partial<Omit<StickyBar, 'root' | 'blocks'>>) => void;
  removeStickyBar: (id: string) => void;
  addPopup: () => string;
  updatePopup: (id: string, updates: Partial<Omit<Popup, 'root' | 'blocks'>>) => void;
  removePopup: (id: string) => void;
  updateOverlayBlocks: (type: 'stickyBar' | 'popup', id: string, root: string, blocks: Record<string, EditorBlock>) => void;
  scopedStyles: Record<string, string>;
  updateScopedStyle: (scopeId: string, cssText: string) => void;
  deleteScopedStyle: (scopeId: string) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Stores context – keeps store references stable across renders
// ---------------------------------------------------------------------------

interface StoreRefs {
  document: DocumentStoreApi;
  selection: SelectionStoreApi;
  viewport: ViewportStoreApi;
  persistence: PersistenceStoreApi;
}

const StoreRefsContext = createContext<StoreRefs | null>(null);

/** Direct access to the underlying Zustand stores (for new code). */
export function useEditorStores() {
  const refs = useContext(StoreRefsContext);
  if (!refs) throw new Error('useEditorStores must be used within EditorProvider');
  return refs;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function EditorProvider({
  page,
  children,
}: {
  page: Page;
  children: React.ReactNode;
}) {
  const { showError } = useToast();
  const pageId = page.id;

  const initialContent = useMemo(
    () => toEditorContentJson(page.contentJson ?? null),
    [page.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const initialScripts = useMemo(
    () => ({ header: '', footer: '', ...(page.scripts as PageScripts) }),
    [page.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Create stores once per page
  const storeRefs = useRef<StoreRefs | null>(null);
  if (!storeRefs.current) {
    storeRefs.current = {
      document: createDocumentStore(initialContent, initialScripts),
      selection: createSelectionStore(),
      viewport: createViewportStore(),
      persistence: createPersistenceStore(),
    };
    storeRefs.current.persistence.getState()._init(initialContent, initialScripts);
  }

  const stores = storeRefs.current;

  // Subscribe to Zustand stores
  const doc = useStore(stores.document);
  const sel = useStore(stores.selection);
  const vp = useStore(stores.viewport);
  const pers = useStore(stores.persistence);

  // Load Google Fonts on initial mount
  useEffect(() => {
    const fonts = new Set<string>();
    Object.values(initialContent.blocks).forEach((block) => {
      const p = block.props as Record<string, unknown> | undefined;
      if (!p) return;
      if (typeof p.fontFamily === 'string' && p.fontFamily) fonts.add(p.fontFamily);
      if (typeof p.titleFontFamily === 'string' && p.titleFontFamily) fonts.add(p.titleFontFamily);
    });
    if (fonts.size > 0) loadGoogleFonts(Array.from(fonts));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave whenever content or scripts change
  useEffect(() => {
    pers.scheduleAutosave(pageId, doc.content, doc.scripts as PageScripts, showError);
    return () => pers.cancelAutosave();
  }, [doc.content, doc.scripts, pageId]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Callbacks that bridge stores (need both document + selection) --

  const copyBlocks = useCallback(() => {
    doc.copyBlocks(sel.selectedBlockIds);
  }, [doc.copyBlocks, sel.selectedBlockIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const pasteBlocks = useCallback(
    (parentId: string | null, index?: number) => {
      const newIds = doc.pasteBlocks(sel.selectedBlockIds, parentId, index);
      if (newIds) sel.setSelectedBlockIds(newIds);
      return newIds;
    },
    [doc.pasteBlocks, sel.selectedBlockIds, sel.setSelectedBlockIds], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const groupBlocks = useCallback((): string | null => {
    const containerId = doc.groupBlocks(sel.selectedBlockIds);
    if (containerId) sel.setSelectedBlockIds([containerId]);
    return containerId;
  }, [doc.groupBlocks, sel.selectedBlockIds, sel.setSelectedBlockIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeBlock = useCallback(
    (id: string) => {
      doc.removeBlock(id);
      if (sel.selectedBlockId === id) sel.setSelectedBlockId(null);
    },
    [doc.removeBlock, sel.selectedBlockId, sel.setSelectedBlockId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const alignBlocks = useCallback(
    (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (doc.layoutMode !== 'canvas' || sel.selectedBlockIds.length < 2) return;
      const content = stores.document.getState().content;
      const blocks = { ...content.blocks };
      const items = sel.selectedBlockIds
        .map((id) => {
          const b = blocks[id];
          const p = (b?.props ?? {}) as Record<string, unknown>;
          return {
            id,
            x: (p.x as number) ?? 0,
            y: (p.y as number) ?? 0,
            w: (p.width as number) ?? 200,
            h: (p.height as number) ?? 80,
          };
        })
        .filter((b) => blocks[b.id]);
      if (items.length < 2) return;
      const minX = Math.min(...items.map((i) => i.x));
      const maxX = Math.max(...items.map((i) => i.x + i.w));
      const minY = Math.min(...items.map((i) => i.y));
      const maxY = Math.max(...items.map((i) => i.y + i.h));
      items.forEach((item) => {
        const b = blocks[item.id];
        const props = { ...(b.props ?? {}) } as Record<string, unknown>;
        if (alignment === 'left') props.x = minX;
        else if (alignment === 'right') props.x = maxX - item.w;
        else if (alignment === 'center') props.x = minX + (maxX - minX) / 2 - item.w / 2;
        else if (alignment === 'top') props.y = minY;
        else if (alignment === 'bottom') props.y = maxY - item.h;
        else if (alignment === 'middle') props.y = minY + (maxY - minY) / 2 - item.h / 2;
        blocks[item.id] = { ...b, props };
      });
      doc.setContent({ ...content, blocks });
    },
    [doc.layoutMode, sel.selectedBlockIds, doc.setContent], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const updateBlocksZIndex = useCallback(
    (delta: number) => {
      if (sel.selectedBlockIds.length === 0) return;
      const content = stores.document.getState().content;
      const blocks = { ...content.blocks };
      sel.selectedBlockIds.forEach((id) => {
        const b = blocks[id];
        if (!b) return;
        const props = { ...(b.props ?? {}) } as Record<string, unknown>;
        const current = (props.zIndex as number) ?? 0;
        props.zIndex = Math.max(0, current + delta);
        blocks[id] = { ...b, props };
      });
      doc.setContent({ ...content, blocks });
    },
    [sel.selectedBlockIds, doc.setContent], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const rollbackToPublished = useCallback(async () => {
    const published = page.lastPublishedContentJson;
    if (!published || typeof published !== 'object') return;
    const parsed = toEditorContentJson(published as object);
    doc.setContent(parsed);
    sel.setSelectedBlockId(null);
    try {
      const { toPageContentJson } = await import('./types');
      const { api } = await import('@/lib/api');
      await api.pages.update(pageId, { contentJson: toPageContentJson(parsed) });
      pers._updateRefs(parsed, doc.scripts as PageScripts);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to rollback');
    }
  }, [page, pageId, showError]); // eslint-disable-line react-hooks/exhaustive-deps

  const canRollback =
    !!page.lastPublishedContentJson &&
    Object.keys((page.lastPublishedContentJson as object) ?? {}).length > 0;

  // -- Keyboard shortcuts --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      )
        return;
      const mod = e.metaKey || e.ctrlKey;
      const { selectedBlockIds } = stores.selection.getState();
      const { content, undo, redo, canUndo, canRedo, updateBlock } = stores.document.getState();

      if (mod && e.key === 'c') {
        e.preventDefault();
        stores.document.getState().copyBlocks(selectedBlockIds);
      } else if (mod && e.key === 'v') {
        e.preventDefault();
        const newIds = stores.document.getState().pasteBlocks(selectedBlockIds, content.root, undefined);
        if (newIds) stores.selection.getState().setSelectedBlockIds(newIds);
      } else if (mod && e.key === 'g') {
        e.preventDefault();
        const cid = stores.document.getState().groupBlocks(selectedBlockIds);
        if (cid) stores.selection.getState().setSelectedBlockIds([cid]);
      } else if (mod && e.key === 'd') {
        e.preventDefault();
        if (selectedBlockIds.length > 0) {
          stores.document.getState().copyBlocks(selectedBlockIds);
          const newIds = stores.document.getState().pasteBlocks(selectedBlockIds, content.root, undefined);
          if (newIds) stores.selection.getState().setSelectedBlockIds(newIds);
        }
      } else if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      } else if ((mod && e.key === 'z' && e.shiftKey) || (mod && e.key === 'y')) {
        e.preventDefault();
        if (canRedo) redo();
      } else if (e.key === 'Escape') {
        stores.selection.getState().clearSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBlockIds.length > 0) {
          e.preventDefault();
          selectedBlockIds.forEach((id) => stores.document.getState().removeBlock(id));
          stores.selection.getState().clearSelection();
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedBlockIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          selectedBlockIds.forEach((id) => {
            const block = content.blocks[id];
            if (!block) return;
            const p = (block.props ?? {}) as Record<string, unknown>;
            const x = typeof p.x === 'number' ? p.x : 0;
            const y = typeof p.y === 'number' ? p.y : 0;
            let nx = x,
              ny = y;
            if (e.key === 'ArrowUp') ny = y - step;
            else if (e.key === 'ArrowDown') ny = y + step;
            else if (e.key === 'ArrowLeft') nx = x - step;
            else if (e.key === 'ArrowRight') nx = x + step;
            updateBlock(id, { props: { ...p, x: nx, y: ny } });
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Build the combined value --
  const value: EditorContextValue = useMemo(
    () => ({
      pageId,
      page,
      content: doc.content,
      setContent: doc.setContent,
      selectedBlockId: sel.selectedBlockId,
      setSelectedBlockId: sel.setSelectedBlockId,
      insertBlock: doc.insertBlock,
      insertBlockFromLibrary: doc.insertBlockFromLibrary,
      updateBlock: doc.updateBlock,
      removeBlock,
      moveBlock: doc.moveBlock,
      undo: doc.undo,
      redo: doc.redo,
      canUndo: doc.canUndo,
      canRedo: doc.canRedo,
      previewMode: vp.previewMode,
      setPreviewMode: vp.setPreviewMode,
      breakpoint: vp.breakpoint,
      setBreakpoint: vp.setBreakpoint,
      canvasWidth: vp.canvasWidth,
      setCanvasWidth: vp.setCanvasWidth,
      dirty: pers.dirty,
      saving: pers.saving,
      lastSaved: pers.lastSaved,
      scripts: doc.scripts as PageScripts,
      updateScripts: doc.updateScripts,
      rollbackToPublished,
      canRollback,
      layoutMode: doc.layoutMode,
      setLayoutMode: doc.setLayoutMode,
      pageSettings: doc.pageSettings,
      updatePageSettings: doc.updatePageSettings,
      selectedBlockIds: sel.selectedBlockIds,
      setSelectedBlockIds: sel.setSelectedBlockIds,
      toggleBlockSelection: sel.toggleBlockSelection,
      handleBlockClick: sel.handleBlockClick,
      copyBlocks,
      pasteBlocks,
      groupBlocks,
      alignBlocks,
      updateBlocksZIndex,
      stickyBars: doc.stickyBars,
      popups: doc.popups,
      addStickyBar: doc.addStickyBar,
      updateStickyBar: doc.updateStickyBar,
      removeStickyBar: doc.removeStickyBar,
      addPopup: doc.addPopup,
      updatePopup: doc.updatePopup,
      removePopup: doc.removePopup,
      updateOverlayBlocks: doc.updateOverlayBlocks,
      scopedStyles: doc.scopedStyles,
      updateScopedStyle: doc.updateScopedStyle,
      deleteScopedStyle: doc.deleteScopedStyle,
    }),
    [
      pageId,
      page,
      doc,
      sel,
      vp,
      pers.dirty,
      pers.saving,
      pers.lastSaved,
      removeBlock,
      rollbackToPublished,
      canRollback,
      copyBlocks,
      pasteBlocks,
      groupBlocks,
      alignBlocks,
      updateBlocksZIndex,
    ],
  );

  return (
    <StoreRefsContext.Provider value={stores}>
      <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
    </StoreRefsContext.Provider>
  );
}
