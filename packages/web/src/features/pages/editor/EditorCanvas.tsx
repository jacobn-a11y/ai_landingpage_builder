/**
 * Canvas with drag-and-drop. Drop zones for blocks. Renders block tree.
 * Supports Fluid Grid (flow layout) and Canvas (freeform/absolute positioning) modes.
 */

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useEditor } from './EditorContext';
import { BlockRenderer } from './BlockRenderer';
import { DroppableZone, DraggableBlock } from './EditorDnd';
import type { EditorContentJson } from './types';

function CanvasPreview({ rootId, content }: { rootId: string; content: EditorContentJson }) {
  const rootBlock = content.blocks[rootId];
  const childIds = rootBlock?.children ?? [];
  return (
    <div className="relative w-full min-h-[800px] bg-background">
      {childIds.map((id) => {
        const block = content.blocks[id];
        if (!block) return null;
        const props = (block.props ?? {}) as Record<string, unknown>;
        const x = (props.x as number) ?? 0;
        const y = (props.y as number) ?? 0;
        const w = (props.width as number) ?? 200;
        const h = (props.height as number) ?? 80;
        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              minHeight: h,
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
  handleBlockClick,
  insertBlock,
}: {
  rootId: string;
  content: EditorContentJson;
  activeId: string | null;
  handleBlockClick: (id: string, e: React.MouseEvent) => void;
  insertBlock: (type: string, parentId: string | null, index?: number) => string;
}) {
  const rootBlock = content.blocks[rootId];
  const childIds = rootBlock?.children ?? [];
  return (
    <DroppableZone id={`drop-${rootId}`} className="relative w-full min-h-[800px] bg-background">
      {childIds.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors rounded"
          onClick={(e) => {
            e.stopPropagation();
            insertBlock('text', rootId);
          }}
        >
          + Add block to canvas
        </div>
      )}
      {childIds.map((id) => {
        const block = content.blocks[id];
        if (!block) return null;
        const props = (block.props ?? {}) as Record<string, unknown>;
        const x = (props.x as number) ?? 0;
        const y = (props.y as number) ?? 0;
        const w = (props.width as number) ?? 200;
        const h = (props.height as number) ?? 80;
        return (
          <DraggableBlock key={id} blockId={id}>
            <div
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: w,
                minHeight: h,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleBlockClick(id, e);
              }}
            >
              <BlockRenderer blockId={id} isDropTarget={activeId === id} />
            </div>
          </DraggableBlock>
        );
      })}
    </DroppableZone>
  );
}

export function EditorCanvas() {
  const {
    content,
    previewMode,
    layoutMode,
    canvasWidth,
    pageSettings,
    setSelectedBlockId,
    handleBlockClick,
    moveBlock,
    insertBlock,
  } = useEditor();

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const blockId = active.id as string;
    const overId = over.id as string;

    const block = content.blocks[blockId];
    const overBlock = content.blocks[overId];
    if (!block) return;

    if (overId.startsWith('drop-')) {
      const parentId = overId.replace('drop-', '');
      const parent = content.blocks[parentId];
      const children = parent?.children ?? [];
      const index = children.indexOf(blockId);
      if (index >= 0) return;
      moveBlock(blockId, parentId || null, 0);
      return;
    }

    if (overBlock) {
      const parentId = Object.keys(content.blocks).find((bid) =>
        content.blocks[bid].children?.includes(overId)
      ) ?? content.root;
      const parent = parentId ? content.blocks[parentId] : null;
      const children = parent?.children ?? [];
      const idx = children.indexOf(overId);
      const insertIdx = idx >= 0 ? idx + 1 : 0;
      moveBlock(blockId, parentId || null, insertIdx);
    }
  };

  const rootId = content.root;
  const rootBlock = rootId ? content.blocks[rootId] : null;
  const isCanvas = layoutMode === 'canvas';

  const canvasStyle: React.CSSProperties = {
    maxWidth: '100%',
    ...(pageSettings?.backgroundColor && { backgroundColor: pageSettings.backgroundColor }),
    ...(pageSettings?.fontFamily && { fontFamily: pageSettings.fontFamily }),
  };

  if (previewMode) {
    return (
      <div
        className="flex-1 overflow-auto bg-background"
        style={canvasStyle}
      >
        <div className={isCanvas ? 'min-h-[800px] relative' : 'min-h-full'}>
          {rootBlock ? (
            isCanvas ? (
              <CanvasPreview rootId={rootId} content={content} />
            ) : (
              <BlockRenderer blockId={rootId} />
            )
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Empty page
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex-1 overflow-auto bg-muted/30 p-4"
        onClick={() => setSelectedBlockId(null)}
      >
        <div
          className="mx-auto min-h-[400px] bg-background rounded-lg shadow-sm border"
          style={{ maxWidth: '100%', width: canvasWidth }}
        >
          {rootBlock ? (
            isCanvas ? (
              <CanvasEdit
                rootId={rootId}
                content={content}
                activeId={activeId}
                handleBlockClick={handleBlockClick}
                insertBlock={insertBlock}
              />
            ) : (
              <DroppableZone id={`drop-${rootId}`}>
                <div
                  className="p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DraggableBlock blockId={rootId}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBlockClick(rootId, e);
                      }}
                    >
                      <BlockRenderer blockId={rootId} isDropTarget={activeId === rootId} />
                    </div>
                  </DraggableBlock>
                </div>
              </DroppableZone>
            )
          ) : (
            <DroppableZone id="drop-root" className="p-8">
              <div
                className="text-center text-muted-foreground cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  insertBlock('section', null);
                }}
              >
                + Add first block
              </div>
            </DroppableZone>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeId && content.blocks[activeId] ? (
          <div className="opacity-90 bg-background border rounded shadow-lg p-2">
            <BlockRenderer blockId={activeId} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
