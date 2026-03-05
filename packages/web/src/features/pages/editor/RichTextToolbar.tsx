import { Bold, Italic, Underline, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RichTextToolbarProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  onLink: () => void;
  className?: string;
}

export function RichTextToolbar({ targetRef, onLink, className }: RichTextToolbarProps) {
  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    targetRef.current?.focus();
  };

  return (
    <div className={className}>
      <span className="flex items-center gap-0.5 p-1 bg-muted rounded border">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => exec('bold')}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => exec('italic')}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => exec('underline')}
          title="Underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onLink}
          title="Link"
        >
          <Link className="h-3.5 w-3.5" />
        </Button>
      </span>
    </div>
  );
}
