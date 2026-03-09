/**
 * Canvas with drag-and-drop, responsive preview, selection highlights, width scrubber.
 * Supports Fluid Grid (flow layout) and Canvas (freeform/absolute positioning) modes.
 */
import { useState } from 'react';
import {
  DndContext, DragOverlay,
  type DragEndEvent, type DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { useEditor } from './EditorContext';
import { BlockRenderer } from './BlockRenderer';
import { DroppableZone, DraggableBlock } from './EditorDnd';
import { WidthScrubber } from './WidthScrubber';
import type { EditorContentJson } from './types';
import { cn } from '@/lib/utils';

function CanvasPreview({ rootId, content }: { rootId: string; content: EditorContentJson }) {
  const rootBlock = content.blocks[rootId];
  return (
    <div className="relative w-full min-h-[800px] bg-background">
      {(rootBlock?.children ?? []).map((id) => {
        const block = content.blocks[id];
        if (!block) return null;
        const p = (block.props ?? {}) as Record<string, unknown>;
        return (
          <div key={id} style={{ position: 'absolute', left: (p.x as number) ?? 0, top: (p.y as number) ?? 0, width: (p.width as number) ?? 200, minHeight: (p.height as number) ?? 80 }}>
            <BlockRenderer blockId={id} />
          </div>
        );
      })}
    </div>
  );
}

function CanvasEdit({
  rootId, content, activeId, selectedBlockIds, handleBlockClick, insertBlock,
}: {
  rootId: string; content: EditorContentJson; activeId: string | null;
  selectedBlockIds: string[];
  handleBlockClick: (id: string, e: React.MouseEvent) => void;
  insertBlock: (type: string, parentId: string | null, index?: number) => string;
}) {
  const rootBlock = content.blocks[rootId];
  const childIds = rootBlock?.children ?? [];
  return (
    <DroppableZone id={`drop-${rootId}`} className="relative w-full min-h-[800px] bg-background">
      {childIds.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors rounded" onClick={(e) => { e.stopPropagation(); insertBlock('text', rootId); }}>
          + Add block to canvas
        </div>
      )}
      {childIds.map((id) => {
        const block = content.blocks[id];
        if (!block) return null;
        const p = (block.props ?? {}) as Record<string, unknown>;
        const isSelected = selectedBlockIds.includes(id);
        return (
          <DraggableBlock key={id} blockId={id}>
            <div
              className={cn('group/block transition-shadow', isSelected && 'ring-2 ring-primary shadow-md', !isSelected && 'hover:ring-1 hover:ring-primary/40')}
              style={{ position: 'absolute', left: (p.x as number) ?? 0, top: (p.y as number) ?? 0, width: (p.width as number) ?? 200, minHeight: (p.height as number) ?? 80 }}
              onClick={(e) => { e.stopPropagation(); handleBlockClick(id, e); }}
            >
              <BlockRenderer blockId={id} isDropTarget={activeId === id} />
              {isSelected && (
                <div className="absolute -top-5 left-0 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-t">{block.type}</div>
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
    content, previewMode, layoutMode, canvasWidth, setCanvasWidth,
    pageSettings, selectedBlockIds, setSelectedBlockId,
    handleBlockClick, moveBlock, insertBlock,
  } = useEditor();

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const blockId = active.id as string;
    const overId = over.id as string;
    if (!content.blocks[blockId]) return;

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
                isCanvas ? <CanvasPreview rootId={rootId} content={content} /> : <BlockRenderer blockId={rootId} />
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
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <WidthScrubber width={canvasWidth} onWidthChange={setCanvasWidth} />
        <div className="flex-1 overflow-auto bg-muted/30 p-4" onClick={() => setSelectedBlockId(null)}>
          <div className="mx-auto min-h-[400px] bg-background rounded-lg shadow-sm border transition-[width] duration-200" style={{ maxWidth: '100%', width: canvasWidth, ...pageStyle }}>
            {rootBlock ? (
              isCanvas ? (
                <CanvasEdit rootId={rootId} content={content} activeId={activeId} selectedBlockIds={selectedBlockIds} handleBlockClick={handleBlockClick} insertBlock={insertBlock} />
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
