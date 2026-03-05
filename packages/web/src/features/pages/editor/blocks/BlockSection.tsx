import { useEditor } from '../EditorContext';
import { BlockRenderer } from '../BlockRenderer';
import { DroppableZone, DraggableBlock } from '../EditorDnd';
import { cn } from '@/lib/utils';

interface BlockSectionProps {
  id: string;
  children?: string[];
  props?: Record<string, unknown>;
  editMode: boolean;
  isDropTarget?: boolean;
  className?: string;
}

export function BlockSection({
  id,
  children = [],
  props: blockProps = {},
  editMode,
  isDropTarget,
  className,
}: BlockSectionProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const { maxWidth, padding, backgroundColor } = blockProps as {
    maxWidth?: number;
    padding?: number;
    backgroundColor?: string;
  };

  const style: React.CSSProperties = {};
  if (maxWidth != null) style.maxWidth = maxWidth;
  if (padding != null) style.padding = padding;
  if (backgroundColor) style.backgroundColor = backgroundColor;

  return (
    <section
      className={cn(
        'w-full',
        editMode && 'min-h-[60px] rounded border border-transparent transition-colors',
        editMode && selected && 'border-primary ring-1 ring-primary/30',
        isDropTarget && 'ring-2 ring-primary/50 bg-primary/5',
        className
      )}
      style={style}
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
          'flex flex-col gap-2 w-full max-w-[var(--section-max-width,1200px)] mx-auto',
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
