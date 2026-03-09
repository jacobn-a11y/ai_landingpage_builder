import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize-html';

type RichTextContentProps = {
  html: string;
  className?: string;
  style?: React.CSSProperties;
};

export function RichTextContent({ html, className, style }: RichTextContentProps) {
  const safe = sanitizeHtml(html);
  return (
    <div
      className={cn('prose prose-sm max-w-none', className)}
      style={style}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
