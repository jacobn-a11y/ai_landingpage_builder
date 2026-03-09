/**
 * Canvas with drag-and-drop, responsive preview, selection highlights, width scrubber.
 * Supports Fluid Grid (flow layout) and Canvas (freeform/absolute positioning) modes.
 */
import { useEffect, useRef, useState } from 'react';
import {
  DndContext, DragOverlay,
  type DragEndEvent, type DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { useEditor } from './EditorContext';
import { BlockRenderer } from './BlockRenderer';
import { DroppableZone, DraggableBlock } from './EditorDnd';
import { WidthScrubber } from './WidthScrubber';
import type { Breakpoint, EditorBlock, EditorContentJson } from './types';
import { cn } from '@/lib/utils';
import { recordEditorMetric } from './quality/metrics';

function resolveCanvasGeometry(
  props: Record<string, unknown>,
  breakpoint: Breakpoint
): { x: number; y: number; width: number; height: number; hidden: boolean } {
  const overrides = (props.overrides as Record<string, Record<string, unknown>> | undefined) ?? {};
  const override = breakpoint === 'desktop' ? undefined : overrides[breakpoint];
  const x = typeof override?.x === 'number' ? override.x : typeof props.x === 'number' ? props.x : 0;
  const y = typeof override?.y === 'number' ? override.y : typeof props.y === 'number' ? props.y : 0;
  const width = typeof override?.width === 'number'
    ? override.width
    : typeof props.width === 'number'
      ? props.width
      : 200;
  const height = typeof override?.height === 'number'
    ? override.height
    : typeof props.height === 'number'
      ? props.height
      : 80;
  const hidden = !!(override?.hidden || props.hidden);
  return {
    x,
    y,
    width,
    height,
    hidden,
  };
}

function applyCanvasGeometry(
  props: Record<string, unknown>,
  breakpoint: Breakpoint,
  updates: Partial<{ x: number; y: number; width: number; height: number }>
): Record<string, unknown> {
  if (breakpoint === 'desktop') {
    return { ...props, ...updates };
  }
  const overrides = (props.overrides as Record<string, Record<string, unknown>> | undefined) ?? {};
  const bpOverrides = overrides[breakpoint] ?? {};
  return {
    ...props,
    overrides: {
      ...overrides,
      [breakpoint]: {
        ...bpOverrides,
        ...updates,
      },
    },
  };
}

function CanvasPreview({ rootId, content, breakpoint }: { rootId: string; content: EditorContentJson; breakpoint: Breakpoint }) {
  const rootBlock = content.blocks[rootId];
  return (
    <div className="relative w-full min-h-[800px] bg-background">
      {(rootBlock?.children ?? []).map((id) => {
        const block = content.blocks[id];
        if (!block) return null;
        const p = (block.props ?? {}) as Record<string, unknown>;
        const frame = resolveCanvasGeometry(p, breakpoint);
        if (frame.hidden) return null;
        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: frame.x,
              top: frame.y,
              width: frame.width,
              minHeight: frame.height,
            }}
          >
            <BlockRenderer blockId={id} />
          </div>
        );
      })}
    </div>
  );
}

function CanvasEdit({
  rootId,
  content,
  activeId,
  selectedBlockIds,
  handleBlockClick,
  insertBlock,
  setSelectedBlockIds,
  updateBlock,
  breakpoint,
}: {
  rootId: string;
  content: EditorContentJson;
  activeId: string | null;
  selectedBlockIds: string[];
  handleBlockClick: (id: string, e: React.MouseEvent) => void;
  insertBlock: (type: string, parentId: string | null, index?: number) => string;
  setSelectedBlockIds: (ids: string[]) => void;
  updateBlock: (id: string, updates: Partial<EditorBlock>) => void;
  breakpoint: Breakpoint;
}) {
  const rootBlock = content.blocks[rootId];
  const childIds = rootBlock?.children ?? [];
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [resizing, setResizing] = useState<{
    blockId: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!resizing) return;

    const onPointerMove = (event: PointerEvent) => {
      const block = content.blocks[resizing.blockId];
      if (!block) return;
      const nextWidth = Math.max(32, Math.round(resizing.startWidth + (event.clientX - resizing.startX)));
      const nextHeight = Math.max(24, Math.round(resizing.startHeight + (event.clientY - resizing.startY)));
      const props = (block.props ?? {}) as Record<string, unknown>;
      updateBlock(resizing.blockId, {
        props: applyCanvasGeometry(props, breakpoint, { width: nextWidth, height: nextHeight }),
      });
    };

    const onPointerUp = () => setResizing(null);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [resizing, content.blocks, updateBlock, breakpoint]);

  const beginResize = (blockId: string, event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const block = content.blocks[blockId];
    if (!block) return;
    const props = (block.props ?? {}) as Record<string, unknown>;
    const frame = resolveCanvasGeometry(props, breakpoint);
    setResizing({
      blockId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: frame.width,
      startHeight: frame.height,
    });
  };

  const updateMarquee = (target: HTMLDivElement, clientX: number, clientY: number) => {
    if (!marqueeStart) return;
    const bounds = target.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    const left = Math.min(marqueeStart.x, x);
    const top = Math.min(marqueeStart.y, y);
    const width = Math.abs(x - marqueeStart.x);
    const height = Math.abs(y - marqueeStart.y);
    setMarqueeRect({ left, top, width, height });
  };

  const finishMarquee = () => {
    if (!marqueeRect || marqueeRect.width < 3 || marqueeRect.height < 3) {
      setMarqueeStart(null);
      setMarqueeRect(null);
      return;
    }
    const picked = childIds.filter((id) => {
      const block = content.blocks[id];
      if (!block) return false;
      const p = (block.props ?? {}) as Record<string, unknown>;
      const frame = resolveCanvasGeometry(p, breakpoint);
      const bx = frame.x;
      const by = frame.y;
      const bw = frame.width;
      const bh = frame.height;
      return (
        bx < marqueeRect.left + marqueeRect.width &&
        bx + bw > marqueeRect.left &&
        by < marqueeRect.top + marqueeRect.height &&
        by + bh > marqueeRect.top
      );
    });
    setSelectedBlockIds(picked);
    setMarqueeStart(null);
    setMarqueeRect(null);
  };

  return (
    <DroppableZone
      id={`drop-${rootId}`}
      className="relative w-full min-h-[800px] bg-background"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        const bounds = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        setMarqueeStart({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
        setMarqueeRect({ left: e.clientX - bounds.left, top: e.clientY - bounds.top, width: 0, height: 0 });
        setSelectedBlockIds([]);
      }}
      onMouseMove={(e) => {
        if (!marqueeStart) return;
        updateMarquee(e.currentTarget as HTMLDivElement, e.clientX, e.clientY);
      }}
      onMouseUp={finishMarquee}
      onMouseLeave={() => {
        if (marqueeStart) finishMarquee();
      }}
    >
      {marqueeRect && marqueeRect.width > 0 && marqueeRect.height > 0 && (
        <div
          className="absolute border border-primary bg-primary/10 pointer-events-none z-20"
          style={{
            left: marqueeRect.left,
            top: marqueeRect.top,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      )}
      {childIds.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors rounded" onClick={(e) => { e.stopPropagation(); insertBlock('paragraph', rootId); }}>
          + Add block to canvas
        </div>
      )}
      {childIds.map((id) => {
        const block = content.blocks[id];
        if (!block) return null;
        const p = (block.props ?? {}) as Record<string, unknown>;
        const frame = resolveCanvasGeometry(p, breakpoint);
        if (frame.hidden) return null;
        const isSelected = selectedBlockIds.includes(id);
        return (
          <DraggableBlock key={id} blockId={id}>
            <div
              className={cn('group/block transition-shadow', isSelected && 'ring-2 ring-primary shadow-md', !isSelected && 'hover:ring-1 hover:ring-primary/40')}
              style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.width, minHeight: frame.height }}
              onClick={(e) => { e.stopPropagation(); handleBlockClick(id, e); }}
            >
              <BlockRenderer blockId={id} isDropTarget={activeId === id} />
              {isSelected && (
                <div className="absolute -top-5 left-0 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-t">{block.type}</div>
              )}
              {isSelected && (
                <div
                  className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-sm border border-primary bg-background cursor-se-resize shadow-sm"
                  title="Resize block"
                  onPointerDown={(e) => beginResize(id, e)}
                />
              )}
            </div>
          </DraggableBlock>
        );
      })}
    </DroppableZone>
  );
}

function FluidBlockItem({ blockId, activeId, selectedBlockIds, handleBlockClick }: {
  blockId: string; activeId: string | null; selectedBlockIds: string[];
  handleBlockClick: (id: string, e: React.MouseEvent) => void;
}) {
  const isSelected = selectedBlockIds.includes(blockId);
  const { content } = useEditor();
  const block = content.blocks[blockId];
  return (
    <DraggableBlock blockId={blockId}>
      <div
        className={cn('group/block relative transition-all rounded', isSelected && 'ring-2 ring-primary shadow-sm', !isSelected && 'hover:ring-1 hover:ring-primary/30')}
        onClick={(e) => { e.stopPropagation(); handleBlockClick(blockId, e); }}
      >
        <BlockRenderer blockId={blockId} isDropTarget={activeId === blockId} />
        {isSelected && block && (
          <div className="absolute -top-5 left-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-t z-10">{block.type}</div>
        )}
      </div>
    </DraggableBlock>
  );
}

export function EditorCanvas() {
  const {
    pageId,
    content, previewMode, layoutMode, canvasWidth, setCanvasWidth,
    pageSettings, selectedBlockIds, setSelectedBlockId, setSelectedBlockIds, breakpoint,
    handleBlockClick, moveBlock, insertBlock, updateBlock,
  } = useEditor();

  const [activeId, setActiveId] = useState<string | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (e: DragStartEvent) => {
    dragStartRef.current = performance.now();
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (dragStartRef.current != null) {
      recordEditorMetric('editor_drag_ms', performance.now() - dragStartRef.current, { pageId });
      dragStartRef.current = null;
    }
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const blockId = active.id as string;
    const overId = over.id as string;
    if (!content.blocks[blockId]) return;

    if (isCanvas) {
      const delta = e.delta;
      const block = content.blocks[blockId];
      const props = (block.props ?? {}) as Record<string, unknown>;
      const frame = resolveCanvasGeometry(props, breakpoint);
      const x = frame.x;
      const y = frame.y;
      const width = frame.width;
      const height = frame.height;
      let nextX = Math.max(0, Math.round(x + delta.x));
      let nextY = Math.max(0, Math.round(y + delta.y));

      const SNAP = 5;
      const rootBlock = content.root ? content.blocks[content.root] : null;
      const siblingIds = (rootBlock?.children ?? []).filter((id) => id !== blockId);
      const snapXTargets: number[] = [0, Math.round(canvasWidth / 2) - Math.round(width / 2)];
      const snapYTargets: number[] = [0];

      siblingIds.forEach((id) => {
        const sibling = content.blocks[id];
        if (!sibling) return;
        const p = (sibling.props ?? {}) as Record<string, unknown>;
        const siblingFrame = resolveCanvasGeometry(p, breakpoint);
        const sx = siblingFrame.x;
        const sy = siblingFrame.y;
        const sw = siblingFrame.width;
        const sh = siblingFrame.height;
        snapXTargets.push(sx, sx + sw, sx + Math.round(sw / 2) - Math.round(width / 2));
        snapYTargets.push(sy, sy + sh, sy + Math.round(sh / 2) - Math.round(height / 2));
      });

      const nearestX = snapXTargets.find((target) => Math.abs(target - nextX) <= SNAP);
      const nearestY = snapYTargets.find((target) => Math.abs(target - nextY) <= SNAP);
      if (typeof nearestX === 'number') nextX = nearestX;
      if (typeof nearestY === 'number') nextY = nearestY;

      updateBlock(blockId, {
        props: applyCanvasGeometry(props, breakpoint, { x: nextX, y: nextY }),
      });
      return;
    }

    if (overId.startsWith('drop-')) {
      const parentId = overId.replace('drop-', '');
      const parent = content.blocks[parentId];
      if ((parent?.children ?? []).indexOf(blockId) >= 0) return;
      moveBlock(blockId, parentId || null, 0);
      return;
    }
    if (content.blocks[overId]) {
      const parentId = Object.keys(content.blocks).find((bid) =>
        content.blocks[bid].children?.includes(overId)
      ) ?? content.root;
      const children = (parentId ? content.blocks[parentId] : null)?.children ?? [];
      const idx = children.indexOf(overId);
      moveBlock(blockId, parentId || null, idx >= 0 ? idx + 1 : 0);
    }
  };

  const handleDragCancel = () => {
    dragStartRef.current = null;
    setActiveId(null);
  };

  const rootId = content.root;
  const rootBlock = rootId ? content.blocks[rootId] : null;
  const isCanvas = layoutMode === 'canvas';
  const pageStyle: React.CSSProperties = {
    ...(pageSettings?.backgroundColor && { backgroundColor: pageSettings.backgroundColor }),
    ...(pageSettings?.fontFamily && { fontFamily: pageSettings.fontFamily }),
  };

  if (previewMode) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
        <WidthScrubber width={canvasWidth} onWidthChange={setCanvasWidth} />
        <div className="flex-1 overflow-auto flex justify-center p-4">
          <div className="bg-background shadow-sm border rounded-lg overflow-hidden transition-[width] duration-200" style={{ width: canvasWidth, maxWidth: '100%', ...pageStyle }}>
            <div className={isCanvas ? 'min-h-[800px] relative' : 'min-h-full'}>
              {rootBlock ? (
                isCanvas ? <CanvasPreview rootId={rootId} content={content} breakpoint={breakpoint} /> : <BlockRenderer blockId={rootId} />
              ) : (
                <div className="p-8 text-center text-muted-foreground">Empty page</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <WidthScrubber width={canvasWidth} onWidthChange={setCanvasWidth} />
        <div className="flex-1 overflow-auto bg-muted/30 p-4" onClick={() => setSelectedBlockId(null)}>
          <div className="mx-auto min-h-[400px] bg-background rounded-lg shadow-sm border transition-[width] duration-200" style={{ maxWidth: '100%', width: canvasWidth, ...pageStyle }}>
            {rootBlock ? (
              isCanvas ? (
                <CanvasEdit
                  rootId={rootId}
                  content={content}
                  activeId={activeId}
                  selectedBlockIds={selectedBlockIds}
                  handleBlockClick={handleBlockClick}
                  insertBlock={insertBlock}
                  setSelectedBlockIds={setSelectedBlockIds}
                  updateBlock={updateBlock}
                  breakpoint={breakpoint}
                />
              ) : (
                <DroppableZone id={`drop-${rootId}`}>
                  <div className="p-4" onClick={(e) => e.stopPropagation()}>
                    <FluidBlockItem blockId={rootId} activeId={activeId} selectedBlockIds={selectedBlockIds} handleBlockClick={handleBlockClick} />
                  </div>
                </DroppableZone>
              )
            ) : (
              <DroppableZone id="drop-root" className="p-8">
                <div
                  className="flex flex-col items-center justify-center py-16 text-muted-foreground cursor-pointer border-2 border-dashed border-muted-foreground/20 rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  onClick={(e) => { e.stopPropagation(); insertBlock('section', null); }}
                >
                  <span className="text-2xl mb-2">+</span>
                  <span className="text-sm">Add first section</span>
                </div>
              </DroppableZone>
            )}
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeId && content.blocks[activeId] ? (
          <div className="opacity-90 bg-background border rounded shadow-lg p-2 max-w-[300px]">
            <BlockRenderer blockId={activeId} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
