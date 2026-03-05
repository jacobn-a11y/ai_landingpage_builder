import { useRef } from 'react';
import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

interface BlockCustomHtmlProps {
  id: string;
  html?: string;
  editMode: boolean;
  className?: string;
}

export function BlockCustomHtml({
  id,
  html = '',
  editMode,
  className,
}: BlockCustomHtmlProps) {
  const { updateBlock, handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (editMode) {
    return (
      <div
        className={cn(
          'rounded border min-h-[100px]',
          selected && 'ring-2 ring-primary',
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleBlockClick(id, e);
        }}
      >
        <textarea
          ref={textareaRef}
          className="w-full min-h-[100px] p-2 font-mono text-sm border-0 rounded bg-muted/30 focus:bg-muted/50 outline-none resize-y"
          placeholder="Enter HTML..."
          value={html}
          onChange={(e) => {
            updateBlock(id, { props: { ...{ html }, html: e.target.value } });
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  if (!html) return null;

  return (
    <div
      className={cn('custom-html-block', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
