import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

interface BlockShapeRectangleProps {
  id: string;
  width?: number;
  height?: number;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  editMode: boolean;
  className?: string;
}

export function BlockShapeRectangle({
  id,
  width = 200,
  height = 100,
  fillColor = '#e5e7eb',
  borderColor = 'transparent',
  borderWidth = 0,
  borderRadius = 0,
  opacity = 1,
  editMode,
  className,
}: BlockShapeRectangleProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  const style: React.CSSProperties = {
    width,
    height,
    backgroundColor: fillColor,
    border: borderWidth ? `${borderWidth}px solid ${borderColor}` : 'none',
    borderRadius,
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
