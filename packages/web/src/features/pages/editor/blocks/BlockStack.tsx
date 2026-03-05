import { useEditor } from '../EditorContext';
import { BlockRenderer } from '../BlockRenderer';
import { DroppableZone, DraggableBlock } from '../EditorDnd';
import { cn } from '@/lib/utils';

interface BlockStackProps {
  id: string;
  children?: string[];
  props?: Record<string, unknown>;
  editMode: boolean;
  isDropTarget?: boolean;
  className?: string;
}

export function BlockStack({
  id,
  children = [],
  props: blockProps = {},
  editMode,
  isDropTarget,
  className,
}: BlockStackProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const { direction = 'column', gap = 8 } = blockProps as {
    direction?: 'row' | 'column';
    gap?: number;
  };

  return (
    <div
      className={cn(
        'w-full flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        editMode && 'min-h-[40px] rounded border border-transparent transition-colors',
        editMode && selected && 'border-primary ring-1 ring-primary/30',
        isDropTarget && 'ring-2 ring-primary/50 bg-primary/5',
        className
      )}
      style={{ gap }}
      onClick={(e) => {
        if (editMode) {
          e.stopPropagation();
          handleBlockClick(id, e);
        }
      }}
    >
      <DroppableZone
        id={`drop-${id}`}
        className={cn(
          'flex w-full',
          direction === 'row' ? 'flex-row' : 'flex-col',
          !editMode && 'min-h-0'
        )}
        style={{ gap }}
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
