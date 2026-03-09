import { useRef, useState, createElement } from 'react';
import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';
import { RichTextToolbar } from '../RichTextToolbar';
import { sanitizeHtml } from '@/lib/sanitize-html';

function RichTextContent({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) {
  const safe = sanitizeHtml(html);
  return (
    <div
      className={cn('prose prose-sm max-w-none', className)}
      style={style}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

interface BlockTextProps {
  id: string;
  content?: string;
  contentHtml?: string;
  headingLevel?: string;
  // Typography
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

export function BlockText({
  id,
  content = '',
  contentHtml,
  headingLevel,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textColor,
  textAlign,
  textTransform,
  linkColor,
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

  const textStyle: React.CSSProperties = {
    ...(fontFamily ? { fontFamily } : {}),
    ...(fontSize ? { fontSize } : {}),
    ...(fontWeight ? { fontWeight } : {}),
    ...(lineHeight ? { lineHeight } : {}),
    ...(letterSpacing ? { letterSpacing } : {}),
    ...(textColor ? { color: textColor } : {}),
    ...(textAlign ? { textAlign: textAlign as React.CSSProperties['textAlign'] } : {}),
    ...(textTransform ? { textTransform: textTransform as React.CSSProperties['textTransform'] } : {}),
  };

  // Inject link color via CSS custom property
  if (linkColor) {
    (textStyle as Record<string, string>)['--link-color'] = linkColor;
  }

  const tag = headingLevel && headingLevel !== 'p' ? headingLevel : undefined;

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
    if (url) {
      try {
        const raw = url.trim();
        const normalized = raw.replace(/\s+/g, '').toLowerCase();
        if (
          normalized.startsWith('javascript:') ||
          normalized.startsWith('vbscript:') ||
          normalized.startsWith('data:text/html')
        ) {
          return;
        }
        if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) {
          document.execCommand('createLink', false, raw);
          return;
        }
        const parsed = new URL(raw, window.location.origin);
        if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return;
        document.execCommand('createLink', false, parsed.href);
      } catch {
        // Invalid URL — ignore
      }
    }
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
        style={textStyle}
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
          dangerouslySetInnerHTML={!editing ? { __html: sanitizeHtml(displayContent || '') } : undefined}
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
      <RichTextContent className={className} html={displayContent} style={textStyle} />
    );
  }

  // Render as heading tag if specified
  if (tag) {
    return createElement(tag, { className: cn('', className), style: textStyle }, content || 'Text');
  }

  return (
    <p className={cn('', className)} style={textStyle}>
      {content || 'Text'}
    </p>
  );
}
