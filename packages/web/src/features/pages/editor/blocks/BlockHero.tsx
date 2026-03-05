import { useEditor } from '../EditorContext';
import { BlockRenderer } from '../BlockRenderer';
import { DroppableZone, DraggableBlock } from '../EditorDnd';
import { cn } from '@/lib/utils';

interface BlockHeroProps {
  id: string;
  children?: string[];
  props?: Record<string, unknown>;
  editMode: boolean;
  isDropTarget?: boolean;
  className?: string;
}

export function BlockHero({
  id,
  children = [],
  editMode,
  isDropTarget,
  className,
}: BlockHeroProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  return (
    <section
      className={cn(
        'w-full py-16 px-4 flex flex-col items-center justify-center text-center min-h-[300px] bg-muted/30',
        editMode && 'rounded border border-transparent transition-colors',
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
        className={cn('max-w-3xl mx-auto flex flex-col gap-4', !editMode && 'min-h-0')}
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
