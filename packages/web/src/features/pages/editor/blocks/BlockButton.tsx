import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

interface BlockButtonProps {
  id: string;
  text?: string;
  href?: string;
  editMode: boolean;
  className?: string;
}

export function BlockButton({
  id,
  text = 'Button',
  href = '#',
  editMode,
  className,
}: BlockButtonProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  if (editMode) {
    return (
      <span
        role="button"
        tabIndex={0}
        className={cn(
          'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer border-2 transition-colors',
          selected && 'ring-2 ring-primary ring-offset-2',
          className
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleBlockClick(id, e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            handleBlockClick(id, e as unknown as React.MouseEvent);
          }
        }}
      >
        {text}
      </span>
    );
  }

  return (
    <a
      href={href}
      className={cn(
        'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90',
        className
      )}
    >
      {text}
    </a>
  );
}
