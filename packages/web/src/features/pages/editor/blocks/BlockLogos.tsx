import { useEditor } from '../EditorContext';
import { BlockRenderer } from '../BlockRenderer';
import { DroppableZone, DraggableBlock } from '../EditorDnd';
import { cn } from '@/lib/utils';

interface BlockLogosProps {
  id: string;
  children?: string[];
  editMode: boolean;
  isDropTarget?: boolean;
  className?: string;
}

export function BlockLogos({
  id,
  children = [],
  editMode,
  isDropTarget,
  className,
}: BlockLogosProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  return (
    <section
      className={cn(
        'w-full py-8 px-4',
        editMode && 'min-h-[80px] rounded border border-transparent transition-colors',
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
          'max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 opacity-70',
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
