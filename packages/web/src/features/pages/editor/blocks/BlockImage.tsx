import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

interface BlockImageProps {
  id: string;
  src?: string;
  alt?: string;
  linkHref?: string;
  linkNewTab?: boolean;
  objectFit?: string;
  lazyLoad?: boolean;
  editMode: boolean;
  className?: string;
}

export function BlockImage({
  id,
  src = '',
  alt = '',
  linkHref,
  linkNewTab,
  objectFit = 'contain',
  lazyLoad = true,
  editMode,
  className,
}: BlockImageProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  const imgStyle: React.CSSProperties = {
    objectFit: objectFit as React.CSSProperties['objectFit'],
  };

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
            className="max-w-full h-auto"
            style={{ ...imgStyle, maxHeight: 200 }}
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

  const img = (
    <img
      src={src}
      alt={alt}
      loading={lazyLoad ? 'lazy' : undefined}
      className={cn('max-w-full h-auto', className)}
      style={imgStyle}
    />
  );

  if (linkHref) {
    return (
      <a href={linkHref} target={linkNewTab ? '_blank' : undefined} rel={linkNewTab ? 'noopener noreferrer' : undefined}>
        {img}
      </a>
    );
  }

  return img;
}
