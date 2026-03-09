import { useRef } from 'react';
import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';
import { RichTextContent } from '../RichTextContent';
import { RichTextToolbar } from '../RichTextToolbar';

interface BlockParagraphProps {
  id: string;
  content?: string;
  contentHtml?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textColor?: string;
  textAlign?: string;
  textTransform?: string;
  linkColor?: string;
  editMode: boolean;
  className?: string;
}

export function BlockParagraph({
  id,
  content: text = '',
  contentHtml,
  fontFamily,
  fontSize = 16,
  fontWeight,
  lineHeight,
  letterSpacing,
  textColor,
  textAlign,
  textTransform,
  linkColor,
  editMode,
  className,
}: BlockParagraphProps) {
  const { updateBlock, handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const elRef = useRef<HTMLDivElement>(null);

  const textStyle: React.CSSProperties = {
    ...(fontFamily ? { fontFamily } : {}),
    fontSize: fontSize + 'px',
    ...(fontWeight ? { fontWeight } : {}),
    ...(lineHeight ? { lineHeight } : {}),
    ...(letterSpacing ? { letterSpacing: letterSpacing + 'px' } : {}),
    ...(textColor ? { color: textColor } : {}),
    ...(textAlign ? { textAlign: textAlign as React.CSSProperties['textAlign'] } : {}),
    ...(textTransform ? { textTransform: textTransform as React.CSSProperties['textTransform'] } : {}),
  };

  if (editMode) {
    return (
      <div
        ref={elRef}
        className={cn('relative group', selected && 'ring-2 ring-primary rounded', className)}
        onClick={(e) => { e.stopPropagation(); handleBlockClick(id, e); }}
      >
        {selected && <RichTextToolbar blockId={id} />}
        <div style={textStyle}>
          <RichTextContent
            blockId={id}
            html={contentHtml ?? text}
            onUpdate={(html) => updateBlock(id, { props: { contentHtml: html } })}
            style={linkColor ? { '--link-color': linkColor } as React.CSSProperties : undefined}
          />
        </div>
      </div>
    );
  }

  const html = contentHtml ?? text;
  if (!html) return null;
  return (
    <div
      className={cn('paragraph-block', className)}
      style={textStyle}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
