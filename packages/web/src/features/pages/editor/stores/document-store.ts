/**
 * Document store: manages editor content, blocks, undo/redo, layout, page settings,
 * scoped styles, scripts, and overlay (sticky bars / popups) state.
 */

import { createStore } from 'zustand/vanilla';
import type {
  EditorContentJson,
  EditorBlock,
  LayoutMode,
  PageSettings,
  StickyBar,
  Popup,
} from '../types';
import { isContainerBlock } from '../block-registry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateBlockId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyBlock(
  type: string,
  props?: Record<string, unknown>,
): EditorBlock {
  const id = generateBlockId();
  const block: EditorBlock = {
    id,
    type: type as EditorBlock['type'],
    props: props ?? {},
    meta: {},
  };
  if (isContainerBlock(type as EditorBlock['type'])) {
    block.children = [];
  }
  return block;
}

// ---------------------------------------------------------------------------
// Undo / redo history
// ---------------------------------------------------------------------------

interface History {
  past: EditorContentJson[];
  future: EditorContentJson[];
}

const MAX_HISTORY = 100;

// ---------------------------------------------------------------------------
// State & actions
// ---------------------------------------------------------------------------

export interface DocumentState {
  content: EditorContentJson;
  scopedStyles: Record<string, string>;
  scripts: { header?: string; footer?: string };

  // derived helpers (kept in state for convenience)
  layoutMode: LayoutMode;
  pageSettings: PageSettings;
  stickyBars: StickyBar[];
  popups: Popup[];

  // undo / redo
  canUndo: boolean;
  canRedo: boolean;
}

export interface DocumentActions {
  // Content
  setContent: (
    updater: EditorContentJson | ((prev: EditorContentJson) => EditorContentJson),
  ) => void;
  _pushHistory: () => void;

  // Blocks
  insertBlock: (type: string, parentId: string | null, index?: number) => string;
  insertBlockFromLibrary: (blockJson: object, parentId: string | null, index?: number) => string;
  updateBlock: (id: string, updates: Partial<EditorBlock>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, parentId: string | null, index: number) => void;
  copyBlocks: (selectedBlockIds: string[]) => void;
  pasteBlocks: (selectedBlockIds: string[], parentId: string | null, index?: number) => string[] | null;
  groupBlocks: (selectedBlockIds: string[]) => string | null;

  // Undo / redo
  undo: () => void;
  redo: () => void;

  // Scoped styles
  updateScopedStyle: (scopeId: string, cssText: string) => void;
  deleteScopedStyle: (scopeId: string) => void;

  // Page settings & layout
  setLayoutMode: (mode: LayoutMode) => void;
  updatePageSettings: (updates: Partial<PageSettings>) => void;

  // Scripts
  updateScripts: (updates: Partial<{ header?: string; footer?: string }>) => void;

  // Overlays
  addStickyBar: () => string;
  updateStickyBar: (id: string, updates: Partial<Omit<StickyBar, 'root' | 'blocks'>>) => void;
  removeStickyBar: (id: string) => void;
  addPopup: () => string;
  updatePopup: (id: string, updates: Partial<Omit<Popup, 'root' | 'blocks'>>) => void;
  removePopup: (id: string) => void;
  updateOverlayBlocks: (
    type: 'stickyBar' | 'popup',
    id: string,
    root: string,
    blocks: Record<string, EditorBlock>,
  ) => void;

  // Initialisation (called once by the shim / provider)
  _init: (content: EditorContentJson, scripts: { header?: string; footer?: string }) => void;
}

export type DocumentStore = DocumentState & DocumentActions;

// ---------------------------------------------------------------------------
// Clipboard (module-level, not serialised)
// ---------------------------------------------------------------------------

let clipboard: { blocks: Record<string, EditorBlock>; ids: string[] } | null = null;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDocumentStore(
  initialContent: EditorContentJson,
  initialScripts: { header?: string; footer?: string },
) {
  // History lives outside the zustand state to avoid re-renders on every push
  const history: History = { past: [], future: [] };

  return createStore<DocumentStore>()((set, get) => {
    // Helper: derive convenience fields from content
    const derive = (content: EditorContentJson) => ({
      layoutMode: (content.layoutMode ?? 'fluid') as LayoutMode,
      pageSettings: content.pageSettings ?? {},
      stickyBars: content.stickyBars ?? [],
      popups: content.popups ?? [],
    });

    // Helper: push current content to past stack (call BEFORE mutating)
    const pushHistory = () => {
      const { content } = get();
      history.past.push(content);
      if (history.past.length > MAX_HISTORY) history.past.shift();
      history.future = [];
      set({ canUndo: true, canRedo: false });
    };

    // Helper: set content + derived
    const applyContent = (content: EditorContentJson) => {
      set({ content, ...derive(content) });
    };

    return {
      // -- initial state --
      content: initialContent,
      scopedStyles: {},
      scripts: initialScripts,
      ...derive(initialContent),
      canUndo: false,
      canRedo: false,

      // -- _init --
      _init: (content, scripts) => {
        history.past = [];
        history.future = [];
        set({ content, scripts, ...derive(content), canUndo: false, canRedo: false });
      },

      // -- _pushHistory (exposed for shim compatibility) --
      _pushHistory: pushHistory,

      // -- setContent --
      setContent: (updater) => {
        pushHistory();
        const prev = get().content;
        const next = typeof updater === 'function' ? updater(prev) : updater;
        applyContent(next);
      },

      // -- undo / redo --
      undo: () => {
        if (history.past.length === 0) return;
        const { content } = get();
        history.future.push(content);
        const prev = history.past.pop()!;
        set({
          content: prev,
          ...derive(prev),
          canUndo: history.past.length > 0,
          canRedo: true,
        });
      },

      redo: () => {
        if (history.future.length === 0) return;
        const { content } = get();
        history.past.push(content);
        const next = history.future.pop()!;
        set({
          content: next,
          ...derive(next),
          canUndo: true,
          canRedo: history.future.length > 0,
        });
      },

      // -- insertBlock --
      insertBlock: (type, parentId, index) => {
        pushHistory();
        const { content } = get();
        const layoutMode = content.layoutMode ?? 'fluid';
        let block = createEmptyBlock(type);

        if (layoutMode === 'canvas' && (parentId === content.root || !parentId)) {
          const rootBlock = content.root ? content.blocks[content.root] : null;
          const siblingIds = rootBlock?.children ?? [];
          let y = 20;
          siblingIds.forEach((id) => {
            const b = content.blocks[id];
            const by = (b?.props?.y as number) ?? 0;
            const bh = (b?.props?.height as number) ?? 80;
            y = Math.max(y, by + bh + 10);
          });
          block = {
            ...block,
            props: { ...block.props, x: 20, y, width: 200, height: 80 },
          };
        }

        const blocks = { ...content.blocks, [block.id]: block };
        let root = content.root;
        const targetParentId = parentId ?? root;

        if (!targetParentId) {
          root = block.id;
          applyContent({ ...content, root, blocks });
          return block.id;
        }

        const parent = blocks[targetParentId];
        if (!parent) {
          if (!root) root = block.id;
          applyContent({ ...content, root, blocks });
          return block.id;
        }

        const childIds = parent.children ?? [];
        const i = index ?? childIds.length;
        const next = [...childIds.slice(0, i), block.id, ...childIds.slice(i)];
        blocks[targetParentId] = { ...parent, children: next };
        if (!root) root = targetParentId;
        applyContent({ ...content, root, blocks });
        return block.id;
      },

      // -- insertBlockFromLibrary --
      insertBlockFromLibrary: (blockJson, parentId, index) => {
        pushHistory();
        const { content } = get();
        const isSubtree =
          blockJson &&
          typeof blockJson === 'object' &&
          'root' in blockJson &&
          'blocks' in blockJson;
        const sourceBlocks = isSubtree
          ? (blockJson as { root: string; blocks: Record<string, { id: string; type: string; children?: string[]; props?: object }> }).blocks
          : { [(blockJson as { id: string }).id]: blockJson as { id: string; type: string; children?: string[]; props?: object } };
        const rootId = isSubtree
          ? (blockJson as { root: string }).root
          : (blockJson as { id: string }).id;

        const idMap = new Map<string, string>();
        const allBlocks: Record<string, EditorBlock> = {};

        const cloneBlock = (b: { id: string; type: string; children?: string[]; props?: object }): EditorBlock => {
          const newId = generateBlockId();
          idMap.set(b.id, newId);
          const block: EditorBlock = {
            id: newId,
            type: b.type as EditorBlock['type'],
            props: { ...(b.props ?? {}) },
            meta: {},
          };
          if (b.children?.length) {
            block.children = b.children.map((cid) => {
              const child = sourceBlocks[cid];
              if (child) {
                const cloned = cloneBlock(child);
                allBlocks[cloned.id] = cloned;
                return cloned.id;
              }
              return generateBlockId();
            });
          }
          return block;
        };

        const rootBlock = sourceBlocks[rootId];
        const clonedRoot = rootBlock ? cloneBlock(rootBlock) : null;
        const rootBlockId = clonedRoot ? clonedRoot.id : generateBlockId();
        if (clonedRoot) allBlocks[rootBlockId] = clonedRoot;

        const blocks = { ...content.blocks, ...allBlocks };
        let root = content.root;
        const targetParentId = parentId ?? root;

        if (!targetParentId) {
          root = rootBlockId;
          applyContent({ root, blocks });
          return rootBlockId;
        }

        const parent = blocks[targetParentId];
        if (!parent) {
          if (!root) root = rootBlockId;
          applyContent({ root, blocks });
          return rootBlockId;
        }

        const childIds = parent.children ?? [];
        const i = index ?? childIds.length;
        const next = [...childIds.slice(0, i), rootBlockId, ...childIds.slice(i)];
        blocks[targetParentId] = { ...parent, children: next };
        if (!root) root = targetParentId;
        applyContent({ root, blocks });
        return rootBlockId;
      },

      // -- updateBlock --
      updateBlock: (id, updates) => {
        pushHistory();
        const { content } = get();
        const block = content.blocks[id];
        if (!block) return;
        const blocks = { ...content.blocks, [id]: { ...block, ...updates } };
        applyContent({ ...content, blocks });
      },

      // -- removeBlock --
      removeBlock: (id) => {
        pushHistory();
        const { content } = get();
        const blocks = { ...content.blocks };
        delete blocks[id];
        const visit = (bid: string) => {
          const b = blocks[bid];
          if (b?.children) {
            b.children.forEach(visit);
            delete blocks[bid];
          }
        };
        visit(id);
        const updateParent = (parentId: string) => {
          const p = blocks[parentId];
          if (p?.children) {
            blocks[parentId] = {
              ...p,
              children: p.children.filter((c: string) => c !== id && blocks[c]),
            };
          }
        };
        Object.keys(blocks).forEach(updateParent);
        let root = content.root;
        if (root === id) {
          root = Object.keys(blocks)[0] ?? '';
        }
        applyContent({ ...content, root, blocks });
      },

      // -- moveBlock --
      moveBlock: (id, parentId, index) => {
        pushHistory();
        const { content } = get();
        const blocks = JSON.parse(JSON.stringify(content.blocks)) as Record<string, EditorBlock>;
        const removeFromParent = (bid: string) => {
          for (const [pid, p] of Object.entries(blocks)) {
            if (p.children?.includes(bid)) {
              blocks[pid] = { ...p, children: p.children.filter((c) => c !== bid) };
              return;
            }
          }
        };
        removeFromParent(id);
        const targetParent = parentId ?? content.root;
        if (targetParent) {
          const p = blocks[targetParent];
          if (p?.children) {
            const filtered = p.children.filter((c) => c !== id);
            const next = [...filtered.slice(0, index), id, ...filtered.slice(index)];
            blocks[targetParent] = { ...p, children: next };
          } else {
            blocks[targetParent] = { ...p, children: [id] };
          }
        }
        applyContent({ ...content, blocks });
      },

      // -- copyBlocks --
      copyBlocks: (selectedBlockIds) => {
        if (selectedBlockIds.length === 0) return;
        const { content } = get();
        const blocks: Record<string, EditorBlock> = {};
        selectedBlockIds.forEach((id) => {
          const b = content.blocks[id];
          if (b) blocks[id] = { ...b };
        });
        clipboard = { blocks, ids: [...selectedBlockIds] };
      },

      // -- pasteBlocks --
      pasteBlocks: (_selectedBlockIds, parentId, index) => {
        const clip = clipboard;
        if (!clip || clip.ids.length === 0) return null;
        pushHistory();
        const { content } = get();

        const idMap = new Map<string, string>();
        const allBlocks: Record<string, EditorBlock> = {};
        const cloneBlock = (b: EditorBlock): EditorBlock => {
          const newId = generateBlockId();
          idMap.set(b.id, newId);
          const block: EditorBlock = {
            id: newId,
            type: b.type,
            props: { ...(b.props ?? {}) },
            meta: {},
          };
          if (b.children?.length) {
            block.children = b.children.map((cid) => {
              const child = clip!.blocks[cid];
              if (child) {
                const cloned = cloneBlock(child);
                allBlocks[cloned.id] = cloned;
                return cloned.id;
              }
              return generateBlockId();
            });
          }
          allBlocks[block.id] = block;
          return block;
        };

        const newIds: string[] = [];
        clip.ids.forEach((oldId) => {
          const b = clip.blocks[oldId];
          if (b) {
            const cloned = cloneBlock(b);
            allBlocks[cloned.id] = cloned;
            newIds.push(cloned.id);
          }
        });

        const targetParentId = parentId ?? content.root;
        const blocks = { ...content.blocks, ...allBlocks };
        if (!targetParentId) {
          applyContent({ ...content, root: newIds[0], blocks });
          return newIds;
        }
        const parent = blocks[targetParentId];
        if (!parent) return null;
        const childIds = parent.children ?? [];
        const i = index ?? childIds.length;
        const next = [...childIds.slice(0, i), ...newIds, ...childIds.slice(i)];
        blocks[targetParentId] = { ...parent, children: next };
        applyContent({ ...content, blocks });
        return newIds;
      },

      // -- groupBlocks --
      groupBlocks: (selectedBlockIds) => {
        if (selectedBlockIds.length < 2) return null;
        pushHistory();
        const { content } = get();
        const parentId =
          Object.keys(content.blocks).find((bid) =>
            content.blocks[bid].children?.includes(selectedBlockIds[0]),
          ) ?? content.root;
        const parent = parentId ? content.blocks[parentId] : null;
        if (!parent?.children) return null;

        const indices = selectedBlockIds
          .map((id) => parent.children!.indexOf(id))
          .filter((i) => i >= 0)
          .sort((a, b) => a - b);
        if (indices.length < 2) return null;

        const firstIdx = indices[0];
        const container = createEmptyBlock('container');
        const toMove = indices.map((i) => parent.children![i]);
        const blocks = { ...content.blocks, [container.id]: container };
        const remaining = parent.children.filter((_, i) => !indices.includes(i));
        const nextChildren = [
          ...remaining.slice(0, firstIdx),
          container.id,
          ...remaining.slice(firstIdx),
        ];
        blocks[parentId!] = { ...parent, children: nextChildren };
        container.children = toMove;
        toMove.forEach((id) => {
          const b = blocks[id];
          if (b) blocks[id] = { ...b };
        });
        applyContent({ ...content, blocks });
        return container.id;
      },

      // -- scoped styles --
      updateScopedStyle: (scopeId, cssText) => {
        set((s) => ({ scopedStyles: { ...s.scopedStyles, [scopeId]: cssText } }));
      },
      deleteScopedStyle: (scopeId) => {
        set((s) => {
          const next = { ...s.scopedStyles };
          delete next[scopeId];
          return { scopedStyles: next };
        });
      },

      // -- layout mode --
      setLayoutMode: (mode) => {
        const { content } = get();
        pushHistory();
        const next: EditorContentJson = { ...content, layoutMode: mode };
        if (mode === 'canvas') {
          const rootBlock = content.root ? content.blocks[content.root] : null;
          const childIds = rootBlock?.children ?? [];
          let y = 20;
          const blocks = { ...content.blocks };
          childIds.forEach((id) => {
            const b = blocks[id];
            if (b && (b.props?.x == null || b.props?.y == null)) {
              blocks[id] = {
                ...b,
                props: {
                  ...(b.props ?? {}),
                  x: (b.props?.x as number) ?? 20,
                  y: (b.props?.y as number) ?? y,
                  width: (b.props?.width as number) ?? 200,
                  height: (b.props?.height as number) ?? 80,
                },
              };
              y += 100;
            }
          });
          next.blocks = blocks;
        }
        applyContent(next);
      },

      // -- page settings --
      updatePageSettings: (updates) => {
        pushHistory();
        const { content } = get();
        applyContent({
          ...content,
          pageSettings: { ...(content.pageSettings ?? {}), ...updates },
        });
      },

      // -- scripts --
      updateScripts: (updates) => {
        set((s) => ({ scripts: { ...s.scripts, ...updates } }));
      },

      // -- sticky bars --
      addStickyBar: () => {
        const container = createEmptyBlock('container');
        const text = createEmptyBlock('text', { content: 'Announcement text' });
        const button = createEmptyBlock('button', { text: 'Learn more', href: '#' });
        container.children = [text.id, button.id];
        const blocks: Record<string, EditorBlock> = {
          [container.id]: container,
          [text.id]: text,
          [button.id]: button,
        };
        const id = `sb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const bar: StickyBar = {
          id,
          root: container.id,
          blocks,
          position: 'top',
          backgroundColor: '#1e293b',
        };
        pushHistory();
        const { content } = get();
        applyContent({ ...content, stickyBars: [...(content.stickyBars ?? []), bar] });
        return id;
      },

      updateStickyBar: (id, updates) => {
        pushHistory();
        const { content } = get();
        applyContent({
          ...content,
          stickyBars: (content.stickyBars ?? []).map((b) =>
            b.id === id ? { ...b, ...updates } : b,
          ),
        });
      },

      removeStickyBar: (id) => {
        pushHistory();
        const { content } = get();
        applyContent({
          ...content,
          stickyBars: (content.stickyBars ?? []).filter((b) => b.id !== id),
        });
      },

      // -- popups --
      addPopup: () => {
        const container = createEmptyBlock('container');
        const text = createEmptyBlock('text', { content: 'Popup content' });
        const button = createEmptyBlock('button', { text: 'Close', href: '#' });
        container.children = [text.id, button.id];
        const blocks: Record<string, EditorBlock> = {
          [container.id]: container,
          [text.id]: text,
          [button.id]: button,
        };
        const id = `pop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const popup: Popup = {
          id,
          root: container.id,
          blocks,
          trigger: 'delay',
          delaySeconds: 3,
        };
        pushHistory();
        const { content } = get();
        applyContent({ ...content, popups: [...(content.popups ?? []), popup] });
        return id;
      },

      updatePopup: (id, updates) => {
        pushHistory();
        const { content } = get();
        applyContent({
          ...content,
          popups: (content.popups ?? []).map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        });
      },

      removePopup: (id) => {
        pushHistory();
        const { content } = get();
        applyContent({
          ...content,
          popups: (content.popups ?? []).filter((p) => p.id !== id),
        });
      },

      // -- updateOverlayBlocks --
      updateOverlayBlocks: (type, id, root, blocks) => {
        pushHistory();
        const { content } = get();
        if (type === 'stickyBar') {
          applyContent({
            ...content,
            stickyBars: (content.stickyBars ?? []).map((b) =>
              b.id === id ? { ...b, root, blocks } : b,
            ),
          });
        } else {
          applyContent({
            ...content,
            popups: (content.popups ?? []).map((p) =>
              p.id === id ? { ...p, root, blocks } : p,
            ),
          });
        }
      },
    };
  });
}

export type DocumentStoreApi = ReturnType<typeof createDocumentStore>;
