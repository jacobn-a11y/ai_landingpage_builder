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
} from './types';
import { isContainerBlock } from './block-registry';
import { loadGoogleFonts } from './google-fonts';
import { useViewportState } from './state/use-viewport-state';
import { useSelectionState } from './state/use-selection-state';
import { useMutationLog, type EditorMutationRecord } from './state/use-mutation-log';
import { useContentHistoryState } from './state/use-content-history-state';
import { useEditorAutosave } from './state/use-editor-autosave';

function generateBlockId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyBlock(type: string, props?: Record<string, unknown>): EditorBlock {
  const normalizedType = type === 'text' ? 'paragraph' : type;
  const id = generateBlockId();
  const block: EditorBlock = {
    id,
    type: normalizedType as EditorBlock['type'],
    props: props ?? {},
    meta: {},
  };
  if (isContainerBlock(normalizedType as EditorBlock['type'])) {
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
  removeBlocks: (ids: string[]) => void;
  moveBlock: (id: string, parentId: string | null, index: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  previewMode: boolean;
  setPreviewMode: (v: boolean) => void;
  breakpoint: Breakpoint;
  setBreakpoint: (b: Breakpoint) => void;
  autoStackMobileLayout: () => void;
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
  ungroupBlock: () => string[] | null;
  alignBlocks: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeBlocks: (axis: 'horizontal' | 'vertical') => void;
  centerBlocksInCanvas: (axis: 'horizontal' | 'vertical') => void;
  tidyVerticalSpacing: () => void;
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
  /** Scoped CSS from imported blocks, keyed by scopeId */
  scopedStyles: Record<string, string>;
  updateScopedStyle: (scopeId: string, cssText: string) => void;
  deleteScopedStyle: (scopeId: string) => void;
  mutationLog: EditorMutationRecord[];
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}

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
  const { mutationLog, recordMutation } = useMutationLog();
  const {
    content,
    setContent,
    replaceContent,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useContentHistoryState({
    initialContent,
    pageId,
    recordMutation,
  });
  const {
    selectedBlockIds,
    selectedBlockId,
    setSelectedBlockIds,
    setSelectedBlockId,
    toggleBlockSelection,
    handleBlockClick,
    clearSelection,
  } = useSelectionState();
  const clipboardRef = useRef<{ blocks: Record<string, EditorBlock>; ids: string[] } | null>(null);
  const { previewMode, setPreviewMode, breakpoint, setBreakpoint, canvasWidth, setCanvasWidth } = useViewportState();
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

  // Scoped CSS from imported blocks (keyed by scopeId)
  const [scopedStyles, setScopedStyles] = useState<Record<string, string>>({});
  const updateScopedStyle = useCallback((scopeId: string, cssText: string) => {
    setScopedStyles((prev) => ({ ...prev, [scopeId]: cssText }));
  }, []);
  const deleteScopedStyle = useCallback((scopeId: string) => {
    setScopedStyles((prev) => {
      const next = { ...prev };
      delete next[scopeId];
      return next;
    });
  }, []);
  const initialScripts = useMemo(
    () => ({ header: '', footer: '', ...(page.scripts as PageScripts) }),
    [page.id]
  );
  const {
    dirty,
    saving,
    lastSaved,
    scripts,
    updateScripts,
    markContentSaved,
  } = useEditorAutosave({
    pageId,
    content,
    initialContent,
    initialScripts,
    onSaveError: showError,
    recordMutation,
  });

  const autoStackMobileLayout = useCallback(() => {
    setContent((prev) => {
      if (!prev.root || !prev.blocks[prev.root]) return prev;
      const rootBlock = prev.blocks[prev.root];
      const childIds = rootBlock.children ?? [];
      let y = 16;
      const blocks = { ...prev.blocks };
      childIds.forEach((id) => {
        const block = blocks[id];
        if (!block) return;
        const props = (block.props ?? {}) as Record<string, unknown>;
        const overrides = (props.overrides as Record<string, Record<string, unknown>> | undefined) ?? {};
        const estimatedHeight = typeof props.height === 'number' ? props.height : 120;
        const mobile = {
          ...(overrides.mobile ?? {}),
          x: 16,
          y,
          width: 343,
          hidden: false,
        };
        y += Math.max(estimatedHeight, 72) + 16;
        blocks[id] = {
          ...block,
          props: {
            ...props,
            overrides: {
              ...overrides,
              mobile,
            },
          },
        };
      });
      return { ...prev, blocks };
    });
    recordMutation('auto_stack_mobile_layout');
  }, [setContent, recordMutation]);

  const insertBlock = useCallback(
    (type: string, parentId: string | null, index?: number): string => {
      const layoutMode = content.layoutMode ?? 'fluid';
      let block = createEmptyBlock(type);
      const pageSettings = content.pageSettings ?? {};
      const props = { ...(block.props ?? {}) } as Record<string, unknown>;
      if (type === 'headline') {
        if (typeof pageSettings.headlineFontFamily === 'string' && !props.fontFamily) props.fontFamily = pageSettings.headlineFontFamily;
        if (typeof pageSettings.headlineFontWeight === 'string' && !props.fontWeight) props.fontWeight = pageSettings.headlineFontWeight;
      } else if (type === 'paragraph') {
        if (typeof pageSettings.paragraphFontFamily === 'string' && !props.fontFamily) props.fontFamily = pageSettings.paragraphFontFamily;
        if (typeof pageSettings.paragraphFontWeight === 'string' && !props.fontWeight) props.fontWeight = pageSettings.paragraphFontWeight;
      } else if (type === 'button') {
        if (typeof pageSettings.buttonFontFamily === 'string' && !props.fontFamily) props.fontFamily = pageSettings.buttonFontFamily;
        if (typeof pageSettings.buttonFontWeight === 'string' && !props.fontWeight) props.fontWeight = pageSettings.buttonFontWeight;
      }
      block = { ...block, props };
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
        recordMutation('insert_block', [block.id]);
        return block.id;
      }

      const parent = blocks[targetParentId];
      if (!parent) {
        if (!root) root = block.id;
        setContent({ ...content, root, blocks });
        recordMutation('insert_block', [block.id]);
        return block.id;
      }

      const childIds = parent.children ?? [];
      const i = index ?? childIds.length;
      const next = [...childIds.slice(0, i), block.id, ...childIds.slice(i)];
      blocks[targetParentId] = { ...parent, children: next };

      if (!root) root = targetParentId;
      setContent({ ...content, root, blocks });
      recordMutation('insert_block', [block.id]);
      return block.id;
    },
    [content, setContent, recordMutation]
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
        setContent({ ...content, root, blocks });
        recordMutation('insert_block_from_library', [rootBlockId]);
        return rootBlockId;
      }
      const parent = blocks[targetParentId];
      if (!parent) {
        if (!root) root = rootBlockId;
        setContent({ ...content, root, blocks });
        recordMutation('insert_block_from_library', [rootBlockId]);
        return rootBlockId;
      }
      const childIds = parent.children ?? [];
      const i = index ?? childIds.length;
      const next = [...childIds.slice(0, i), rootBlockId, ...childIds.slice(i)];
      blocks[targetParentId] = { ...parent, children: next };
      if (!root) root = targetParentId;
      setContent({ ...content, root, blocks });
      recordMutation('insert_block_from_library', [rootBlockId]);
      return rootBlockId;
    },
    [content, setContent, recordMutation]
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
      recordMutation('update_block', [id]);
    },
    [content, setContent, recordMutation]
  );

  const removeBlocks = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      const toRemove = new Set(ids);
      const blocks = { ...content.blocks };

      const collectDescendants = (bid: string) => {
        const block = blocks[bid];
        if (!block?.children?.length) return;
        block.children.forEach((childId) => {
          toRemove.add(childId);
          collectDescendants(childId);
        });
      };
      ids.forEach(collectDescendants);

      toRemove.forEach((bid) => delete blocks[bid]);

      Object.keys(blocks).forEach((parentId) => {
        const parent = blocks[parentId];
        if (!parent?.children?.length) return;
        const nextChildren = parent.children.filter((childId) => !toRemove.has(childId) && !!blocks[childId]);
        blocks[parentId] = { ...parent, children: nextChildren };
      });

      let root = content.root;
      if (!root || toRemove.has(root) || !blocks[root]) {
        root = Object.keys(blocks)[0] ?? '';
      }

      setContent({ ...content, root, blocks });
      setSelectedBlockIds(selectedBlockIds.filter((id) => !toRemove.has(id)));
      recordMutation('remove_blocks', [...toRemove]);
    },
    [content, setContent, recordMutation, selectedBlockIds, setSelectedBlockIds]
  );

  const removeBlock = useCallback(
    (id: string) => {
      removeBlocks([id]);
      if (selectedBlockId === id) setSelectedBlockId(null);
    },
    [removeBlocks, selectedBlockId, setSelectedBlockId]
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
      recordMutation('move_block', [id]);
    },
    [content, setContent, recordMutation]
  );

  const rollbackToPublished = useCallback(async () => {
    const published = page.lastPublishedContentJson;
    if (!published || typeof published !== 'object') return;
    const parsed = toEditorContentJson(published as object);
    replaceContent(parsed);
    setSelectedBlockId(null);
    try {
      await api.pages.update(pageId, {
        contentJson: toPageContentJson(parsed),
      });
      markContentSaved(parsed);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to rollback');
    }
  }, [page, pageId, replaceContent, setSelectedBlockId, markContentSaved, showError]);

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
      recordMutation('set_layout_mode');
    },
    [setContent, recordMutation]
  );

  const layoutMode = content.layoutMode ?? 'fluid';
  const pageSettings = content.pageSettings ?? {};

  const updatePageSettings = useCallback(
    (updates: Partial<PageSettings>) => {
      setContent((prev) => ({
        ...prev,
        pageSettings: { ...(prev.pageSettings ?? {}), ...updates },
      }));
      recordMutation('update_page_settings');
    },
    [setContent, recordMutation]
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
    recordMutation('group_blocks', [...selectedBlockIds]);
    return container.id;
  }, [content, selectedBlockIds, setContent, recordMutation]);

  const ungroupBlock = useCallback((): string[] | null => {
    if (selectedBlockIds.length !== 1) return null;
    const groupId = selectedBlockIds[0];
    const group = content.blocks[groupId];
    if (!group || group.type !== 'container' || !group.children?.length) return null;

    const parentId = Object.keys(content.blocks).find((bid) =>
      content.blocks[bid].children?.includes(groupId)
    ) ?? content.root;
    if (!parentId) return null;
    const parent = content.blocks[parentId];
    if (!parent?.children) return null;

    const groupIndex = parent.children.indexOf(groupId);
    if (groupIndex < 0) return null;

    const blocks = { ...content.blocks };
    const nextChildren = [
      ...parent.children.slice(0, groupIndex),
      ...group.children,
      ...parent.children.slice(groupIndex + 1),
    ];
    blocks[parentId] = { ...parent, children: nextChildren };
    delete blocks[groupId];

    setContent({ ...content, blocks });
    setSelectedBlockIds([...group.children]);
    recordMutation('ungroup_block', [groupId, ...group.children]);
    return [...group.children];
  }, [content, selectedBlockIds, setContent, setSelectedBlockIds, recordMutation]);

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
      recordMutation(`align_blocks_${alignment}`, [...selectedBlockIds]);
    },
    [content, layoutMode, selectedBlockIds, setContent, recordMutation]
  );

  const distributeBlocks = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      if (layoutMode !== 'canvas' || selectedBlockIds.length < 3) return;
      const blocks = { ...content.blocks };
      const items = selectedBlockIds
        .map((id) => {
          const block = blocks[id];
          if (!block) return null;
          const props = (block.props ?? {}) as Record<string, unknown>;
          return {
            id,
            position: axis === 'horizontal' ? ((props.x as number) ?? 0) : ((props.y as number) ?? 0),
            size: axis === 'horizontal' ? ((props.width as number) ?? 200) : ((props.height as number) ?? 80),
          };
        })
        .filter((item): item is { id: string; position: number; size: number } => item !== null)
        .sort((a, b) => a.position - b.position);

      if (items.length < 3) return;

      const start = items[0].position;
      const end = items[items.length - 1].position + items[items.length - 1].size;
      const totalSize = items.reduce((sum, item) => sum + item.size, 0);
      const gaps = items.length - 1;
      const gapSize = Math.max(0, (end - start - totalSize) / gaps);

      let cursor = start;
      items.forEach((item) => {
        const block = blocks[item.id];
        if (!block) return;
        const props = { ...(block.props ?? {}) } as Record<string, unknown>;
        if (axis === 'horizontal') props.x = Math.round(cursor);
        else props.y = Math.round(cursor);
        blocks[item.id] = { ...block, props };
        cursor += item.size + gapSize;
      });

      setContent({ ...content, blocks });
      recordMutation(`distribute_blocks_${axis}`, [...selectedBlockIds]);
    },
    [content, layoutMode, selectedBlockIds, setContent, recordMutation]
  );

  const centerBlocksInCanvas = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      if (layoutMode !== 'canvas' || selectedBlockIds.length === 0) return;
      const blocks = { ...content.blocks };
      const ids = selectedBlockIds.filter((id) => !!blocks[id]);
      if (ids.length === 0) return;

      const canvasCenterX = Math.round(canvasWidth / 2);
      ids.forEach((id) => {
        const block = blocks[id];
        if (!block) return;
        const props = { ...(block.props ?? {}) } as Record<string, unknown>;
        const width = typeof props.width === 'number' ? props.width : 200;
        const height = typeof props.height === 'number' ? props.height : 80;
        if (axis === 'horizontal') {
          props.x = Math.max(0, Math.round(canvasCenterX - width / 2));
        } else {
          props.y = Math.max(0, Math.round(400 - height / 2));
        }
        blocks[id] = { ...block, props };
      });
      setContent({ ...content, blocks });
      recordMutation(`center_blocks_${axis}`, [...ids]);
    },
    [content, layoutMode, selectedBlockIds, canvasWidth, setContent, recordMutation]
  );

  const tidyVerticalSpacing = useCallback(() => {
    if (layoutMode !== 'canvas') return;
    const rootChildren = content.root ? (content.blocks[content.root]?.children ?? []) : [];
    const targetIds = selectedBlockIds.length >= 2 ? selectedBlockIds : rootChildren;
    const blocks = { ...content.blocks };
    const items = targetIds
      .map((id) => {
        const block = blocks[id];
        if (!block) return null;
        const props = (block.props ?? {}) as Record<string, unknown>;
        return {
          id,
          x: typeof props.x === 'number' ? props.x : 0,
          y: typeof props.y === 'number' ? props.y : 0,
          h: typeof props.height === 'number' ? props.height : 80,
        };
      })
      .filter((item): item is { id: string; x: number; y: number; h: number } => item !== null)
      .sort((a, b) => a.y - b.y);

    if (items.length < 2) return;
    const gap = 16;
    let cursor = items[0].y;
    items.forEach((item) => {
      const block = blocks[item.id];
      if (!block) return;
      const props = { ...(block.props ?? {}) } as Record<string, unknown>;
      props.y = Math.round(cursor);
      blocks[item.id] = { ...block, props };
      cursor += item.h + gap;
    });

    setContent({ ...content, blocks });
    recordMutation('tidy_vertical_spacing', items.map((i) => i.id));
  }, [content, layoutMode, selectedBlockIds, setContent, recordMutation]);

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
      recordMutation('update_blocks_zindex', [...selectedBlockIds]);
    },
    [content, selectedBlockIds, setContent, recordMutation]
  );

  const stickyBars = content.stickyBars ?? [];
  const popups = content.popups ?? [];

  const addStickyBar = useCallback((): string => {
    const container = createEmptyBlock('container');
    const paragraph = createEmptyBlock('paragraph', { content: 'Announcement text' });
    const button = createEmptyBlock('button', { text: 'Learn more', href: '#' });
    container.children = [paragraph.id, button.id];
    const blocks: Record<string, EditorBlock> = {
      [container.id]: container,
      [paragraph.id]: paragraph,
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
    const paragraph = createEmptyBlock('paragraph', { content: 'Popup content' });
    const button = createEmptyBlock('button', { text: 'Close', href: '#' });
    container.children = [paragraph.id, button.id];
    const blocks: Record<string, EditorBlock> = {
      [container.id]: container,
      [paragraph.id]: paragraph,
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
        if (e.shiftKey) {
          e.preventDefault();
          ungroupBlock();
          return;
        }
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
        clearSelection();
        setSelectedBlockId(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBlockIds.length > 0) {
          e.preventDefault();
          removeBlocks(selectedBlockIds);
          clearSelection();
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Arrow key nudge: 1px, or 10px with Shift
        if (selectedBlockIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const blocks = { ...content.blocks };
          selectedBlockIds.forEach((id) => {
            const block = blocks[id];
            if (!block) return;
            const p = (block.props ?? {}) as Record<string, unknown>;
            const x = (typeof p.x === 'number' ? p.x : 0);
            const y = (typeof p.y === 'number' ? p.y : 0);
            let nx = x;
            let ny = y;
            if (e.key === 'ArrowUp') ny = y - step;
            else if (e.key === 'ArrowDown') ny = y + step;
            else if (e.key === 'ArrowLeft') nx = x - step;
            else if (e.key === 'ArrowRight') nx = x + step;
            blocks[id] = { ...block, props: { ...p, x: nx, y: ny } };
          });
          setContent({ ...content, blocks });
          recordMutation('nudge_blocks', [...selectedBlockIds]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyBlocks, pasteBlocks, groupBlocks, ungroupBlock, removeBlocks, selectedBlockIds, content, undo, redo, canUndo, canRedo, clearSelection, setSelectedBlockId, setContent, recordMutation]);

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
      removeBlocks,
      moveBlock,
      undo,
      redo,
      canUndo,
      canRedo,
      previewMode,
      setPreviewMode,
      breakpoint,
      setBreakpoint,
      autoStackMobileLayout,
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
      ungroupBlock,
      alignBlocks,
      distributeBlocks,
      centerBlocksInCanvas,
      tidyVerticalSpacing,
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
      scopedStyles,
      updateScopedStyle,
      deleteScopedStyle,
      mutationLog,
    }),
    [
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
      removeBlocks,
      moveBlock,
      undo,
      redo,
      canUndo,
      canRedo,
      previewMode,
      setPreviewMode,
      breakpoint,
      setBreakpoint,
      autoStackMobileLayout,
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
      ungroupBlock,
      alignBlocks,
      distributeBlocks,
      centerBlocksInCanvas,
      tidyVerticalSpacing,
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
      scopedStyles,
      updateScopedStyle,
      deleteScopedStyle,
      mutationLog,
    ]
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}
