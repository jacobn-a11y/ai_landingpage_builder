import { useState } from 'react';
import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionSection {
  id: string;
  title: string;
  content: string;
  defaultExpanded?: boolean;
}

interface BlockAccordionProps {
  id: string;
  sections?: AccordionSection[];
  expandOneOnly?: boolean;
  arrowColor?: string;
  dividerColor?: string;
  sectionSpacing?: number;
  titleFontFamily?: string;
  titleFontSize?: number;
  titleFontWeight?: string;
  titleColor?: string;
  contentColor?: string;
  editMode: boolean;
  className?: string;
}

const DEFAULT_SECTIONS: AccordionSection[] = [
  { id: '1', title: 'Section 1', content: 'Content for section 1', defaultExpanded: true },
  { id: '2', title: 'Section 2', content: 'Content for section 2' },
  { id: '3', title: 'Section 3', content: 'Content for section 3' },
];

export function BlockAccordion({
  id,
  sections = DEFAULT_SECTIONS,
  expandOneOnly = false,
  arrowColor,
  dividerColor = '#e5e7eb',
  sectionSpacing = 0,
  titleFontFamily,
  titleFontSize = 16,
  titleFontWeight = '600',
  titleColor,
  contentColor,
  editMode,
  className,
}: BlockAccordionProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(sections.filter((s) => s.defaultExpanded).map((s) => s.id))
  );

  const toggle = (sectionId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        if (expandOneOnly) next.clear();
        next.add(sectionId);
      }
      return next;
    });
  };

  const titleStyle: React.CSSProperties = {
    ...(titleFontFamily ? { fontFamily: titleFontFamily } : {}),
    fontSize: titleFontSize + 'px',
    fontWeight: titleFontWeight,
    ...(titleColor ? { color: titleColor } : {}),
  };

  return (
    <div
      className={cn(
        'accordion-block rounded',
        selected && editMode && 'ring-2 ring-primary',
        className
      )}
      onClick={editMode ? (e) => { e.stopPropagation(); handleBlockClick(id, e); } : undefined}
      style={{ display: 'flex', flexDirection: 'column', gap: sectionSpacing + 'px' }}
    >
      {sections.map((section, i) => {
        const expanded = expandedIds.has(section.id);
        return (
          <div
            key={section.id}
            style={i > 0 && dividerColor ? { borderTop: `1px solid ${dividerColor}` } : undefined}
          >
            <button
              className="w-full flex items-center justify-between py-3 px-2 text-left cursor-pointer bg-transparent border-0"
              onClick={(e) => { e.stopPropagation(); toggle(section.id); }}
              style={titleStyle}
            >
              <span>{section.title}</span>
              {expanded
                ? <ChevronDown className="h-4 w-4 shrink-0" style={arrowColor ? { color: arrowColor } : undefined} />
                : <ChevronRight className="h-4 w-4 shrink-0" style={arrowColor ? { color: arrowColor } : undefined} />
              }
            </button>
            {expanded && (
              <div
                className="px-2 pb-3 text-sm"
                style={contentColor ? { color: contentColor } : undefined}
              >
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
