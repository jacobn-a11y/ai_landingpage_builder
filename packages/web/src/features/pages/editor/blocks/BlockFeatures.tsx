import { useEditor } from '../EditorContext';
import { BlockRenderer } from '../BlockRenderer';
import { DroppableZone, DraggableBlock } from '../EditorDnd';
import { cn } from '@/lib/utils';

interface BlockFeaturesProps {
  id: string;
  children?: string[];
  editMode: boolean;
  isDropTarget?: boolean;
  className?: string;
}

export function BlockFeatures({
  id,
  children = [],
  editMode,
  isDropTarget,
  className,
}: BlockFeaturesProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  return (
    <section
      className={cn(
        'w-full py-12 px-4',
        editMode && 'min-h-[120px] rounded border border-transparent transition-colors',
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
        className={cn(
          'max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8',
          !editMode && 'min-h-0'
        )}
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
    </section>
  );
}
