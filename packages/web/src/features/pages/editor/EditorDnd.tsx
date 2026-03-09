/**
 * Shared DnD components for the editor.
 * DroppableZone shows clear visual feedback when a block is being dragged over.
 * DraggableBlock wraps blocks for drag-and-drop reordering.
 */

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

export function DroppableZone({
  id,
  children,
  className,
  style,
  ...rest
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  const {
    onClick,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  } = rest;
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      className={cn(
        'min-h-[40px] rounded transition-all duration-150',
        isOver && 'ring-2 ring-primary/60 bg-primary/5 shadow-inner',
        className
      )}
      style={style}
      data-droppable={id}
    >
      {children}
      {isOver && (
        <div className="h-0.5 bg-primary/60 rounded-full mx-2 my-1 animate-pulse" />
      )}
    </div>
  );
}

export function DraggableBlock({
  blockId,
  children,
}: {
  blockId: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: blockId, data: { blockId } });

  const style: React.CSSProperties = {
    ...(transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : {}),
    ...(isDragging ? { zIndex: 50 } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'transition-opacity',
        isDragging && 'opacity-40 scale-[0.98]'
      )}
    >
      {children}
    </div>
  );
}
