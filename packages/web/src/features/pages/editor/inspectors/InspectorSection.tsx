/**
 * Collapsible section used inside per-type inspectors.
 */

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface InspectorSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function InspectorSection({
  title,
  defaultOpen = true,
  children,
}: InspectorSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="flex items-center gap-1 w-full text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {title}
      </button>
      {open && <div className="space-y-2 pl-1">{children}</div>}
    </div>
  );
}
