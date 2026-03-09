import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

type DividerOrientation = 'horizontal' | 'vertical';

interface BlockDividerProps {
  id: string;
  orientation?: DividerOrientation;
  lineColor?: string;
  lineThickness?: number;
  lineStyle?: string;
  lineWidth?: string;
  editMode: boolean;
  className?: string;
}

export function BlockDivider({ id, orientation = 'horizontal', lineColor, lineThickness = 1, lineStyle = 'solid', lineWidth = '100%', editMode, className }: BlockDividerProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  const hrStyle: React.CSSProperties = orientation === 'horizontal'
    ? {
        borderTop: `${lineThickness}px ${lineStyle} ${lineColor || 'currentColor'}`,
        borderBottom: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        width: lineWidth,
      }
    : {
        borderLeft: `${lineThickness}px ${lineStyle} ${lineColor || 'currentColor'}`,
        borderTop: 'none',
        borderBottom: 'none',
        borderRight: 'none',
        minHeight: 24,
      };

  if (editMode) {
    return (
      <div
        className={cn(
          'cursor-pointer flex items-center justify-center',
          orientation === 'horizontal' ? 'py-2' : 'px-2 min-h-[40px]',
          selected && 'ring-1 ring-primary rounded',
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleBlockClick(id, e);
        }}
      >
        {orientation === 'vertical' ? (
          <div style={hrStyle} />
        ) : (
          <hr style={hrStyle} />
        )}
      </div>
    );
  }

  return orientation === 'vertical' ? (
    <div className={cn('flex items-center justify-center min-h-[24px]', className)}>
      <div style={hrStyle} />
    </div>
  ) : (
    <hr className={className} style={hrStyle} />
  );
}
