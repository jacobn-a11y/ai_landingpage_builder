import { useEditor } from '../EditorContext';
import { BlockRenderer } from '../BlockRenderer';
import { DroppableZone, DraggableBlock } from '../EditorDnd';
import { cn } from '@/lib/utils';

interface BlockGridProps {
  id: string;
  children?: string[];
  props?: Record<string, unknown>;
  editMode: boolean;
  isDropTarget?: boolean;
  className?: string;
}

export function BlockGrid({
  id,
  children = [],
  props: blockProps = {},
  editMode,
  isDropTarget,
  className,
}: BlockGridProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const { columns = 3, gap = 16 } = blockProps as { columns?: number; gap?: number };

  return (
    <div
      className={cn(
        'w-full',
        editMode && 'min-h-[60px] rounded border border-transparent transition-colors',
        editMode && selected && 'border-primary ring-1 ring-primary/30',
        isDropTarget && 'ring-2 ring-primary/50 bg-primary/5',
        className
      )}
      onClick={(e) => {
        if (editMode) {
          e.stopPropagation();
          handleBlockClick(id, e);
        }
      }}
    >
      <DroppableZone
        id={`drop-${id}`}
        className={cn(!editMode && 'min-h-0')}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap,
        }}
      >
        {children.map((childId) =>
        editMode ? (
          <DraggableBlock key={childId} blockId={childId}>
            <BlockRenderer blockId={childId} />
          </DraggableBlock>
        ) : (
          <BlockRenderer key={childId} blockId={childId} />
        )
      )}
      </DroppableZone>
    </div>
  );
}
