/**
 * Shared DnD components for the editor.
 */

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

export function DroppableZone({
  id,
  children,
  className,
  style,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[40px] rounded transition-colors',
        isOver && 'ring-2 ring-primary/50 bg-primary/5',
        className
      )}
      style={style}
      data-droppable={id}
    >
      {children}
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

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(isDragging && 'opacity-50')}
    >
      {children}
    </div>
  );
}
