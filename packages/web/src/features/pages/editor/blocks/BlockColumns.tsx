import { useEditor } from '../EditorContext';
import { BlockRenderer } from '../BlockRenderer';
import { DroppableZone, DraggableBlock } from '../EditorDnd';
import { cn } from '@/lib/utils';

interface BlockColumnsProps {
  id: string;
  children?: string[];
  props?: Record<string, unknown>;
  editMode: boolean;
  isDropTarget?: boolean;
  className?: string;
}

export function BlockColumns({
  id,
  children = [],
  props: blockProps = {},
  editMode,
  isDropTarget,
  className,
}: BlockColumnsProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const { columns = 2 } = blockProps as { columns?: number };

  const colWidths = Array(columns).fill('1fr').join(' ');

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
          gridTemplateColumns: colWidths,
          gap: 16,
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
