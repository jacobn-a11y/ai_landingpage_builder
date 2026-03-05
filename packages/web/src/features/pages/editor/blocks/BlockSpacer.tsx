import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

interface BlockSpacerProps {
  id: string;
  height?: number;
  editMode: boolean;
  className?: string;
}

export function BlockSpacer({
  id,
  height = 24,
  editMode,
  className,
}: BlockSpacerProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  if (editMode) {
    return (
      <div
        className={cn(
          'cursor-pointer border border-dashed border-transparent hover:border-muted-foreground/30 rounded min-h-[4px] transition-colors',
          selected && 'border-primary',
          className
        )}
        style={{ minHeight: Math.max(height, 8) }}
        onClick={(e) => {
          e.stopPropagation();
          handleBlockClick(id, e);
        }}
      />
    );
  }

  return <div style={{ height }} className={className} />;
}
