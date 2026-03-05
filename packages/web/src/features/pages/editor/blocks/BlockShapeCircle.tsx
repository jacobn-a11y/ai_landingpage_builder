import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

interface BlockShapeCircleProps {
  id: string;
  size?: number;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  editMode: boolean;
  className?: string;
}

export function BlockShapeCircle({
  id,
  size = 100,
  fillColor = '#e5e7eb',
  borderColor = 'transparent',
  borderWidth = 0,
  opacity = 1,
  editMode,
  className,
}: BlockShapeCircleProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: fillColor,
    border: borderWidth ? `${borderWidth}px solid ${borderColor}` : 'none',
    opacity,
  };

  if (editMode) {
    return (
      <div
        className={cn(
          'cursor-pointer shrink-0',
          selected && 'ring-2 ring-primary ring-offset-2',
          className
        )}
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          handleBlockClick(id, e);
        }}
      />
    );
  }

  return <div className={cn('shrink-0', className)} style={style} />;
}
