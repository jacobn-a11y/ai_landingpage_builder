/**
 * Editor context: content, selection, undo/redo, autosave, preview, responsive.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useUndo from 'use-undo';
import { api } from '@/lib/api';
import type { Page, PageScripts } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import {
  type EditorContentJson,
  type EditorBlock,
  type LayoutMode,
  type PageSettings,
  type StickyBar,
  type Popup,
  toEditorContentJson,
  toPageContentJson,
  type Breakpoint,
  BREAKPOINT_WIDTHS,
} from './types';
import { isContainerBlock } from './block-registry';
import { loadGoogleFonts } from './google-fonts';

function generateBlockId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyBlock(type: string, props?: Record<string, unknown>): EditorBlock {
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
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}

const AUTOSAVE_DEBOUNCE_MS = 5000;

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
    [page.id]
  );

  const [state, { set: setState, undo, redo, canUndo, canRedo }] = useUndo(
    initialContent
  );

  const content = state.present;
  const [selectedBlockIds, setSelectedBlockIdsState] = useState<string[]>([]);
  const selectedBlockId = selectedBlockIds[0] ?? null;
  const setSelectedBlockId = useCallback((id: string | null) => {
    setSelectedBlockIdsState(id ? [id] : []);
  }, []);
  const clipboardRef = useRef<{ blocks: Record<string, EditorBlock>; ids: string[] } | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
  const [canvasWidth, setCanvasWidth] = useState(BREAKPOINT_WIDTHS.desktop);
  useEffect(() => {
    setCanvasWidth(BREAKPOINT_WIDTHS[breakpoint]);
  }, [breakpoint]);
  // Load Google Fonts used in all blocks on page load
  useEffect(() => {
    const fonts = new Set<string>();
    Object.values(content.blocks).forEach((block) => {
      const p = block.props as Record<string, unknown> | undefined;
      if (!p) return;
      if (typeof p.fontFamily === 'string' && p.fontFamily) fonts.add(p.fontFamily);
      if (typeof p.titleFontFamily === 'string' && p.titleFontFamily) fonts.add(p.titleFontFamily);
    });
    if (fonts.size > 0) loadGoogleFonts(Array.from(fonts));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>(JSON.stringify(initialContent));
  const initialScripts = useMemo(
    () => ({ header: '', footer: '', ...(page.scripts as PageScripts) }),
    [page.id]
  );
  const [scripts, setScripts] = useState<PageScripts>(initialScripts);
  const lastSavedScriptsRef = useRef<string>(JSON.stringify(initialScripts));

  const updateScripts = useCallback((updates: Partial<PageScripts>) => {
    setScripts((prev) => ({ ...prev, ...updates }));
  }, []);

  const setContent = useCallback(
    (updater: EditorContentJson | ((prev: EditorContentJson) => EditorContentJson)) => {
      setState(
        typeof updater === 'function'
          ? updater(state.present)
          : updater
      );
    },
    [setState, state.present]
  );

  const contentDirty = useMemo(() => {
    const current = JSON.stringify(content);
    return current !== lastSavedContentRef.current;
  }, [content]);

  const scriptsDirty = useMemo(() => {
    const current = JSON.stringify(scripts);
    return current !== lastSavedScriptsRef.current;
  }, [scripts]);

  const dirty = contentDirty || scriptsDirty;

  const save = useCallback(async () => {
    if (!contentDirty && !scriptsDirty) return;
    setSaving(true);
    try {
      const payload: { contentJson?: object; scripts?: PageScripts } = {};
      if (contentDirty) {
        payload.contentJson = toPageContentJson(content);
        lastSavedContentRef.current = JSON.stringify(content);
      }
      if (scriptsDirty) {
        payload.scripts = scripts;
        lastSavedScriptsRef.current = JSON.stringify(scripts);
      }
      await api.pages.update(pageId, payload);
      setLastSaved(new Date());
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [pageId, content, scripts, contentDirty, scriptsDirty]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      save();
    }, AUTOSAVE_DEBOUNCE_MS);
    saveTimeoutRef.current = t;
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [content, scripts, dirty, save]);

  const insertBlock = useCallback(
    (type: string, parentId: string | null, index?: number): string => {
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
          props: {
            ...block.props,
            x: 20,
            y,
            width: 200,
            height: 80,
          },
        };
      }
      const blocks = { ...content.blocks, [block.id]: block };
      let root = content.root;

      const targetParentId = parentId ?? root;
      if (!targetParentId) {
        root = block.id;
        setContent({ ...content, root, blocks });
        return block.id;
      }

      const parent = blocks[targetParentId];
      if (!parent) {
        if (!root) root = block.id;
        setContent({ ...content, root, blocks });
        return block.id;
      }

      const childIds = parent.children ?? [];
      const i = index ?? childIds.length;
      const next = [...childIds.slice(0, i), block.id, ...childIds.slice(i)];
      blocks[targetParentId] = { ...parent, children: next };

      if (!root) root = targetParentId;
      setContent({ ...content, root, blocks });
      return block.id;
    },
    [content, setContent]
  );

  const insertBlockFromLibrary = useCallback(
    (blockJson: object, parentId: string | null, index?: number): string => {
      const isSubtree = blockJson && typeof blockJson === 'object' && 'root' in blockJson && 'blocks' in blockJson;
      const sourceBlocks = isSubtree
        ? (blockJson as { root: string; blocks: Record<string, { id: string; type: string; children?: string[]; props?: object }> }).blocks
        : { [(blockJson as { id: string }).id]: blockJson as { id: string; type: string; children?: string[]; props?: object } };
      const rootId = isSubtree ? (blockJson as { root: string }).root : (blockJson as { id: string }).id;
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
        setContent({ root, blocks });
        return rootBlockId;
      }
      const parent = blocks[targetParentId];
      if (!parent) {
        if (!root) root = rootBlockId;
        setContent({ root, blocks });
        return rootBlockId;
      }
      const childIds = parent.children ?? [];
      const i = index ?? childIds.length;
      const next = [...childIds.slice(0, i), rootBlockId, ...childIds.slice(i)];
      blocks[targetParentId] = { ...parent, children: next };
      if (!root) root = targetParentId;
      setContent({ root, blocks });
      return rootBlockId;
    },
    [content, setContent]
  );

  const updateBlock = useCallback(
    (id: string, updates: Partial<EditorBlock>) => {
      const block = content.blocks[id];
      if (!block) return;
      const next = {
        ...content.blocks,
        [id]: { ...block, ...updates },
      };
      setContent({ ...content, blocks: next });
    },
    [content, setContent]
  );

  const removeBlock = useCallback(
    (id: string) => {
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
      setContent({ root, blocks });
      if (selectedBlockId === id) setSelectedBlockId(null);
    },
    [content, setContent, selectedBlockId]
  );

  const moveBlock = useCallback(
    (id: string, parentId: string | null, index: number) => {
      const blocks = JSON.parse(JSON.stringify(content.blocks)) as Record<string, EditorBlock>;
      const removeFromParent = (bid: string) => {
        for (const [pid, p] of Object.entries(blocks)) {
          if (p.children?.includes(bid)) {
            blocks[pid] = {
              ...p,
              children: p.children.filter((c) => c !== bid),
            };
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
      setContent({ ...content, blocks });
    },
    [content, setContent]
  );

  const rollbackToPublished = useCallback(async () => {
    const published = page.lastPublishedContentJson;
    if (!published || typeof published !== 'object') return;
    const parsed = toEditorContentJson(published as object);
    setState(parsed);
    setSelectedBlockId(null);
    try {
      await api.pages.update(pageId, {
        contentJson: toPageContentJson(parsed),
      });
      lastSavedContentRef.current = JSON.stringify(parsed);
      setLastSaved(new Date());
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to rollback');
    }
  }, [page, pageId, setState, showError]);

  const canRollback =
    !!page.lastPublishedContentJson &&
    Object.keys((page.lastPublishedContentJson as object) ?? {}).length > 0;

  const setLayoutMode = useCallback(
    (mode: LayoutMode) => {
      setContent((prev) => {
        const next = { ...prev, layoutMode: mode };
        if (mode === 'canvas') {
          const rootBlock = prev.root ? prev.blocks[prev.root] : null;
          const childIds = rootBlock?.children ?? [];
          let y = 20;
          const blocks = { ...prev.blocks };
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
        return next;
      });
    },
    [setContent]
  );

  const layoutMode = content.layoutMode ?? 'fluid';
  const pageSettings = content.pageSettings ?? {};

  const updatePageSettings = useCallback(
    (updates: Partial<PageSettings>) => {
      setContent((prev) => ({
        ...prev,
        pageSettings: { ...(prev.pageSettings ?? {}), ...updates },
      }));
    },
    [setContent]
  );

  const setSelectedBlockIds = useCallback((ids: string[]) => {
    setSelectedBlockIdsState(ids);
  }, []);

  const toggleBlockSelection = useCallback(
    (id: string, addToSelection?: boolean) => {
      setSelectedBlockIdsState((prev) => {
        const has = prev.includes(id);
        if (addToSelection) {
          return has ? prev.filter((x) => x !== id) : [...prev, id];
        }
        return has && prev.length === 1 ? [] : [id];
      });
    },
    []
  );

  const handleBlockClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        toggleBlockSelection(id, true);
      } else {
        setSelectedBlockId(id);
      }
    },
    [toggleBlockSelection, setSelectedBlockId]
  );

  const copyBlocks = useCallback(() => {
    if (selectedBlockIds.length === 0) return;
    const blocks: Record<string, EditorBlock> = {};
    selectedBlockIds.forEach((id) => {
      const b = content.blocks[id];
      if (b) blocks[id] = { ...b };
    });
    clipboardRef.current = { blocks, ids: [...selectedBlockIds] };
  }, [content.blocks, selectedBlockIds]);

  const pasteBlocks = useCallback(
    (parentId: string | null, index?: number): string[] | null => {
      const clip = clipboardRef.current;
      if (!clip || clip.ids.length === 0) return null;
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
        setContent({ ...content, root: newIds[0], blocks });
        setSelectedBlockIds(newIds);
        return newIds;
      }
      const parent = blocks[targetParentId];
      if (!parent) return null;
      const childIds = parent.children ?? [];
      const i = index ?? childIds.length;
      const next = [...childIds.slice(0, i), ...newIds, ...childIds.slice(i)];
      blocks[targetParentId] = { ...parent, children: next };
      setContent({ ...content, blocks });
      setSelectedBlockIds(newIds);
      return newIds;
    },
    [content, setContent]
  );

  const groupBlocks = useCallback((): string | null => {
    if (selectedBlockIds.length < 2) return null;
    const parentId = Object.keys(content.blocks).find((bid) =>
      content.blocks[bid].children?.includes(selectedBlockIds[0])
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
    const nextChildren = [...remaining.slice(0, firstIdx), container.id, ...remaining.slice(firstIdx)];
    blocks[parentId] = { ...parent, children: nextChildren };
    container.children = toMove;
    toMove.forEach((id) => {
      const b = blocks[id];
      if (b) blocks[id] = { ...b };
    });
    setContent({ ...content, blocks });
    setSelectedBlockIds([container.id]);
    return container.id;
  }, [content, selectedBlockIds, setContent]);

  const alignBlocks = useCallback(
    (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (layoutMode !== 'canvas' || selectedBlockIds.length < 2) return;
      const blocks = { ...content.blocks };
      const items = selectedBlockIds
        .map((id) => {
          const b = blocks[id];
          const p = (b?.props ?? {}) as Record<string, unknown>;
          return { id, x: (p.x as number) ?? 0, y: (p.y as number) ?? 0, w: (p.width as number) ?? 200, h: (p.height as number) ?? 80 };
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
      setContent({ ...content, blocks });
    },
    [content, layoutMode, selectedBlockIds, setContent]
  );

  const updateBlocksZIndex = useCallback(
    (delta: number) => {
      if (selectedBlockIds.length === 0) return;
      const blocks = { ...content.blocks };
      selectedBlockIds.forEach((id) => {
        const b = blocks[id];
        if (!b) return;
        const props = { ...(b.props ?? {}) } as Record<string, unknown>;
        const current = (props.zIndex as number) ?? 0;
        props.zIndex = Math.max(0, current + delta);
        blocks[id] = { ...b, props };
      });
      setContent({ ...content, blocks });
    },
    [content, selectedBlockIds, setContent]
  );

  const stickyBars = content.stickyBars ?? [];
  const popups = content.popups ?? [];

  const addStickyBar = useCallback((): string => {
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
    setContent((prev) => ({
      ...prev,
      stickyBars: [...(prev.stickyBars ?? []), bar],
    }));
    return id;
  }, [setContent]);

  const updateStickyBar = useCallback(
    (id: string, updates: Partial<Omit<StickyBar, 'root' | 'blocks'>>) => {
      setContent((prev) => ({
        ...prev,
        stickyBars: (prev.stickyBars ?? []).map((b) =>
          b.id === id ? { ...b, ...updates } : b
        ),
      }));
    },
    [setContent]
  );

  const removeStickyBar = useCallback(
    (id: string) => {
      setContent((prev) => ({
        ...prev,
        stickyBars: (prev.stickyBars ?? []).filter((b) => b.id !== id),
      }));
    },
    [setContent]
  );

  const addPopup = useCallback((): string => {
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
    setContent((prev) => ({
      ...prev,
      popups: [...(prev.popups ?? []), popup],
    }));
    return id;
  }, [setContent]);

  const updatePopup = useCallback(
    (id: string, updates: Partial<Omit<Popup, 'root' | 'blocks'>>) => {
      setContent((prev) => ({
        ...prev,
        popups: (prev.popups ?? []).map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      }));
    },
    [setContent]
  );

  const removePopup = useCallback(
    (id: string) => {
      setContent((prev) => ({
        ...prev,
        popups: (prev.popups ?? []).filter((p) => p.id !== id),
      }));
    },
    [setContent]
  );

  const updateOverlayBlocks = useCallback(
    (type: 'stickyBar' | 'popup', id: string, root: string, blocks: Record<string, EditorBlock>) => {
      setContent((prev) => {
        if (type === 'stickyBar') {
          return {
            ...prev,
            stickyBars: (prev.stickyBars ?? []).map((b) =>
              b.id === id ? { ...b, root, blocks } : b
            ),
          };
        }
        return {
          ...prev,
          popups: (prev.popups ?? []).map((p) =>
            p.id === id ? { ...p, root, blocks } : p
          ),
        };
      });
    },
    [setContent]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'c') {
        e.preventDefault();
        copyBlocks();
      } else if (mod && e.key === 'v') {
        e.preventDefault();
        pasteBlocks(content.root, undefined);
      } else if (mod && e.key === 'g') {
        e.preventDefault();
        groupBlocks();
      } else if (mod && e.key === 'd') {
        // Duplicate selected blocks
        e.preventDefault();
        if (selectedBlockIds.length > 0) {
          copyBlocks();
          pasteBlocks(content.root, undefined);
        }
      } else if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      } else if ((mod && e.key === 'z' && e.shiftKey) || (mod && e.key === 'y')) {
        e.preventDefault();
        if (canRedo) redo();
      } else if (e.key === 'Escape') {
        setSelectedBlockIds([]);
        setSelectedBlockId(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBlockIds.length > 0) {
          e.preventDefault();
          selectedBlockIds.forEach((id) => removeBlock(id));
          setSelectedBlockIds([]);
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Arrow key nudge: 1px, or 10px with Shift
        if (selectedBlockIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          selectedBlockIds.forEach((id) => {
            const block = content.blocks[id];
            if (!block) return;
            const p = (block.props ?? {}) as Record<string, unknown>;
            const x = (typeof p.x === 'number' ? p.x : 0);
            const y = (typeof p.y === 'number' ? p.y : 0);
            let nx = x, ny = y;
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
  }, [copyBlocks, pasteBlocks, groupBlocks, removeBlock, selectedBlockIds, content, undo, redo, canUndo, canRedo, setSelectedBlockIds, setSelectedBlockId, updateBlock]);

  const value: EditorContextValue = useMemo(
    () => ({
      pageId,
      page,
      content,
      setContent,
      selectedBlockId,
      setSelectedBlockId,
      insertBlock,
      insertBlockFromLibrary,
      updateBlock,
      removeBlock,
      moveBlock,
      undo,
      redo,
      canUndo,
      canRedo,
      previewMode,
      setPreviewMode,
      breakpoint,
      setBreakpoint,
      canvasWidth,
      setCanvasWidth,
      dirty,
      saving,
      lastSaved,
      scripts,
      updateScripts,
      rollbackToPublished,
      canRollback,
      layoutMode,
      setLayoutMode,
      pageSettings,
      updatePageSettings,
      selectedBlockIds,
      setSelectedBlockIds,
      toggleBlockSelection,
      handleBlockClick,
      copyBlocks,
      pasteBlocks,
      groupBlocks,
      alignBlocks,
      updateBlocksZIndex,
      stickyBars,
      popups,
      addStickyBar,
      updateStickyBar,
      removeStickyBar,
      addPopup,
      updatePopup,
      removePopup,
      updateOverlayBlocks,
    }),
    [
      pageId,
      page,
      content,
      setContent,
      selectedBlockId,
      insertBlock,
      insertBlockFromLibrary,
      updateBlock,
      removeBlock,
      moveBlock,
      undo,
      redo,
      canUndo,
      canRedo,
      previewMode,
      breakpoint,
      canvasWidth,
      dirty,
      saving,
      lastSaved,
      scripts,
      updateScripts,
      rollbackToPublished,
      canRollback,
      layoutMode,
      setLayoutMode,
      pageSettings,
      updatePageSettings,
      selectedBlockIds,
      setSelectedBlockIds,
      toggleBlockSelection,
      handleBlockClick,
      copyBlocks,
      pasteBlocks,
      groupBlocks,
      alignBlocks,
      updateBlocksZIndex,
      stickyBars,
      popups,
      addStickyBar,
      updateStickyBar,
      removeStickyBar,
      addPopup,
      updatePopup,
      updateOverlayBlocks,
    ]
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}
