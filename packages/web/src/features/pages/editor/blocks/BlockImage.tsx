import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

interface BlockImageProps {
  id: string;
  src?: string;
  alt?: string;
  editMode: boolean;
  className?: string;
}

export function BlockImage({
  id,
  src = '',
  alt = '',
  editMode,
  className,
}: BlockImageProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  if (editMode) {
    return (
      <div
        className={cn(
          'relative min-h-[80px] rounded border-2 border-dashed border-muted-foreground/30 bg-muted/30',
          selected && 'border-primary',
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleBlockClick(id, e);
        }}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="max-w-full h-auto object-contain"
            style={{ maxHeight: 200 }}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Add image URL in properties
          </span>
        )}
      </div>
    );
  }

  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={cn('max-w-full h-auto object-contain', className)}
    />
  );
}
