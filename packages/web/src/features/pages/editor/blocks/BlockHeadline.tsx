import { createElement, useRef } from 'react';
import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';
import { RichTextContent } from '../RichTextContent';
import { RichTextToolbar } from '../RichTextToolbar';

interface BlockHeadlineProps {
  id: string;
  content?: string;
  contentHtml?: string;
  headingLevel?: string;
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

const HEADING_DEFAULTS: Record<string, number> = {
  h1: 48, h2: 36, h3: 28, h4: 24, h5: 20, h6: 16,
};

export function BlockHeadline({
  id,
  content: text = '',
  contentHtml,
  headingLevel = 'h2',
  fontFamily,
  fontSize,
  fontWeight = '700',
  lineHeight,
  letterSpacing,
  textColor,
  textAlign,
  textTransform,
  linkColor,
  editMode,
  className,
}: BlockHeadlineProps) {
  const { updateBlock, handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const elRef = useRef<HTMLDivElement>(null);
  const tag = headingLevel && headingLevel.match(/^h[1-6]$/) ? headingLevel : 'h2';
  const defaultSize = HEADING_DEFAULTS[tag] ?? 36;

  const textStyle: React.CSSProperties = {
    ...(fontFamily ? { fontFamily } : {}),
    fontSize: (fontSize ?? defaultSize) + 'px',
    ...(fontWeight ? { fontWeight } : {}),
    ...(lineHeight ? { lineHeight: lineHeight } : {}),
    ...(letterSpacing ? { letterSpacing: letterSpacing + 'px' } : {}),
    ...(textColor ? { color: textColor } : {}),
    ...(textAlign ? { textAlign: textAlign as React.CSSProperties['textAlign'] } : {}),
    ...(textTransform ? { textTransform: textTransform as React.CSSProperties['textTransform'] } : {}),
    margin: 0,
  };

  if (editMode) {
    return (
      <div
        ref={elRef}
        className={cn('relative group', selected && 'ring-2 ring-primary rounded', className)}
        onClick={(e) => { e.stopPropagation(); handleBlockClick(id, e); }}
      >
        {selected && <RichTextToolbar blockId={id} />}
        {createElement(tag, { style: textStyle },
          <RichTextContent
            blockId={id}
            html={contentHtml ?? text}
            onUpdate={(html) => updateBlock(id, { props: { contentHtml: html } })}
            style={linkColor ? { '--link-color': linkColor } as React.CSSProperties : undefined}
          />
        )}
      </div>
    );
  }

  const html = contentHtml ?? text;
  if (!html) return null;
  return createElement(tag, {
    className: cn('headline-block', className),
    style: textStyle,
    dangerouslySetInnerHTML: { __html: html },
  });
}
