import { useRef, useState } from 'react';
import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';
import { RichTextToolbar } from '../RichTextToolbar';
import { sanitizeHtml } from '@/lib/sanitize-html';

function RichTextContent({ html, className }: { html: string; className?: string }) {
  const safe = sanitizeHtml(html);
  return (
    <div
      className={cn('prose prose-sm max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

interface BlockTextProps {
  id: string;
  content?: string;
  contentHtml?: string;
  editMode: boolean;
  className?: string;
}

export function BlockText({
  id,
  content = '',
  contentHtml,
  editMode,
  className,
}: BlockTextProps) {
  const { updateBlock, handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const [editing, setEditing] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const rich = !!contentHtml || (typeof contentHtml === 'string' && contentHtml !== '');

  const displayContent = contentHtml ?? content;
  const isRich = rich || (displayContent && /<[a-z][\s\S]*>/i.test(displayContent));

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    setEditing(false);
    const hasTags = /<[a-z][\s\S]*>/i.test(html);
    const text = e.currentTarget.innerText ?? '';
    if (hasTags) {
      if (html !== displayContent) {
        updateBlock(id, { props: { ...{ content, contentHtml }, contentHtml: html, content: text } });
      }
    } else {
      if (text !== (content || '')) {
        updateBlock(id, { props: { ...{ content, contentHtml }, content: text, contentHtml: undefined } });
      }
    }
  };

  const handleLink = () => {
    const url = prompt('Enter URL:');
    if (url) document.execCommand('createLink', false, url);
    divRef.current?.focus();
  };

  if (editMode) {
    return (
      <div
        className={cn(
          'min-h-[1.5em] rounded border border-transparent px-1 py-0.5 transition-colors',
          selected && 'border-primary ring-1 ring-primary/30',
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleBlockClick(id, e);
        }}
      >
        {selected && (
          <RichTextToolbar
            targetRef={divRef}
            onLink={handleLink}
            className="mb-1"
          />
        )}
        <div
          ref={divRef}
          contentEditable
          suppressContentEditableWarning
          className="outline-none empty:before:content-['Click_to_edit...'] empty:before:text-muted-foreground prose prose-sm max-w-none"
          dangerouslySetInnerHTML={!editing ? { __html: displayContent || '' } : undefined}
          onFocus={() => {
            setEditing(true);
            if (divRef.current) divRef.current.innerHTML = displayContent || '';
          }}
          onBlur={handleBlur}
        />
      </div>
    );
  }

  if (isRich && displayContent) {
    return (
      <RichTextContent className={className} html={displayContent} />
    );
  }

  return (
    <p className={cn('', className)}>
      {content || 'Text'}
    </p>
  );
}
