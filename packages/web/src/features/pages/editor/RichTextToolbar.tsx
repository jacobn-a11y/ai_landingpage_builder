import { Bold, Italic, Underline, Strikethrough, Link, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered } from 'lucide-react';
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

  const btn = (title: string, onClick: () => void, icon: React.ReactNode) => (
    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClick} title={title}>
      {icon}
    </Button>
  );

  return (
    <div className={className}>
      <span className="flex items-center gap-0.5 p-1 bg-muted rounded border flex-wrap">
        {btn('Bold', () => exec('bold'), <Bold className="h-3.5 w-3.5" />)}
        {btn('Italic', () => exec('italic'), <Italic className="h-3.5 w-3.5" />)}
        {btn('Underline', () => exec('underline'), <Underline className="h-3.5 w-3.5" />)}
        {btn('Strikethrough', () => exec('strikeThrough'), <Strikethrough className="h-3.5 w-3.5" />)}
        <span className="w-px h-5 bg-border mx-0.5" />
        {btn('Link', onLink, <Link className="h-3.5 w-3.5" />)}
        <span className="w-px h-5 bg-border mx-0.5" />
        {btn('Align Left', () => exec('justifyLeft'), <AlignLeft className="h-3.5 w-3.5" />)}
        {btn('Align Center', () => exec('justifyCenter'), <AlignCenter className="h-3.5 w-3.5" />)}
        {btn('Align Right', () => exec('justifyRight'), <AlignRight className="h-3.5 w-3.5" />)}
        {btn('Justify', () => exec('justifyFull'), <AlignJustify className="h-3.5 w-3.5" />)}
        <span className="w-px h-5 bg-border mx-0.5" />
        {btn('Bulleted List', () => exec('insertUnorderedList'), <List className="h-3.5 w-3.5" />)}
        {btn('Numbered List', () => exec('insertOrderedList'), <ListOrdered className="h-3.5 w-3.5" />)}
      </span>
    </div>
  );
}
