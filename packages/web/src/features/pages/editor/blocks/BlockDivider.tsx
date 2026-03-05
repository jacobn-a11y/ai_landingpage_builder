import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

type DividerOrientation = 'horizontal' | 'vertical';

interface BlockDividerProps {
  id: string;
  orientation?: DividerOrientation;
  editMode: boolean;
  className?: string;
}

export function BlockDivider({ id, orientation = 'horizontal', editMode, className }: BlockDividerProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

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
          <div className="h-full min-h-[24px] w-px bg-border" />
        ) : (
          <hr className="w-full border-border" />
        )}
      </div>
    );
  }

  return orientation === 'vertical' ? (
    <div className={cn('flex items-center justify-center min-h-[24px]', className)}>
      <div className="h-full min-h-[24px] w-px bg-border" />
    </div>
  ) : (
    <hr className={cn('border-border', className)} />
  );
}
