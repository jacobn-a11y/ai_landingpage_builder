import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

interface BlockButtonProps {
  id: string;
  text?: string;
  href?: string;
  openNewTab?: boolean;
  ariaLabel?: string;
  // Typography
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  textColor?: string;
  textAlign?: string;
  // Button styling
  buttonBgColor?: string;
  buttonHoverBgColor?: string;
  buttonTextColor?: string;
  buttonHoverTextColor?: string;
  editMode: boolean;
  className?: string;
}

export function BlockButton({
  id,
  text = 'Button',
  href = '#',
  openNewTab,
  ariaLabel,
  fontFamily,
  fontSize,
  fontWeight,
  buttonBgColor,
  buttonTextColor,
  editMode,
  className,
}: BlockButtonProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  const style: React.CSSProperties = {
    ...(fontFamily ? { fontFamily } : {}),
    ...(fontSize ? { fontSize } : {}),
    ...(fontWeight ? { fontWeight } : {}),
    ...(buttonBgColor ? { backgroundColor: buttonBgColor } : {}),
    ...(buttonTextColor ? { color: buttonTextColor } : {}),
  };

  if (editMode) {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium cursor-pointer border-2 transition-colors',
          !buttonBgColor && 'bg-primary',
          !buttonTextColor && 'text-primary-foreground',
          selected && 'ring-2 ring-primary ring-offset-2',
          className
        )}
        style={style}
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
      target={openNewTab ? '_blank' : undefined}
      rel={openNewTab ? 'noopener noreferrer' : undefined}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
        !buttonBgColor && 'bg-primary',
        !buttonTextColor && 'text-primary-foreground',
        className
      )}
      style={style}
    >
      {text}
    </a>
  );
}
