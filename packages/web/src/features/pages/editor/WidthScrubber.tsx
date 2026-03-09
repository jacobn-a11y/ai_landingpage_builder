/**
 * Responsive width scrubber: drag handle to resize canvas width.
 * Shows current pixel width and snaps to breakpoints.
 */

import { useCallback, useRef, useState } from 'react';
import { BREAKPOINT_WIDTHS, type Breakpoint } from './types';
import { cn } from '@/lib/utils';

interface WidthScrubberProps {
  width: number;
  onWidthChange: (w: number) => void;
  onBreakpointHint?: (b: Breakpoint | null) => void;
}

const SNAP_THRESHOLD = 20;
const MIN_WIDTH = 320;
const MAX_WIDTH = 1920;

const BREAKPOINT_LABELS: { key: Breakpoint; width: number; label: string }[] = [
  { key: 'mobile', width: BREAKPOINT_WIDTHS.mobile, label: 'Mobile' },
  { key: 'tablet', width: BREAKPOINT_WIDTHS.tablet, label: 'Tablet' },
  { key: 'desktop', width: BREAKPOINT_WIDTHS.desktop, label: 'Desktop' },
];

export function WidthScrubber({ width, onWidthChange, onBreakpointHint }: WidthScrubberProps) {
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [width]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const delta = (e.clientX - startXRef.current) * 2; // *2 because centered
      let next = Math.round(startWidthRef.current + delta);
      next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, next));

      // Snap to breakpoints
      for (const bp of BREAKPOINT_LABELS) {
        if (Math.abs(next - bp.width) < SNAP_THRESHOLD) {
          next = bp.width;
          onBreakpointHint?.(bp.key);
          onWidthChange(next);
          return;
        }
      }
      onBreakpointHint?.(null);
      onWidthChange(next);
    },
    [dragging, onWidthChange, onBreakpointHint]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(false);
      onBreakpointHint?.(null);
    },
    [onBreakpointHint]
  );

  const nearestBreakpoint = BREAKPOINT_LABELS.find(
    (bp) => Math.abs(width - bp.width) < 2
  );

  return (
    <div className="flex items-center justify-center gap-2 py-1 select-none">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {BREAKPOINT_LABELS.map((bp) => (
          <button
            key={bp.key}
            type="button"
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] transition-colors',
              Math.abs(width - bp.width) < 2
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-muted'
            )}
            onClick={() => onWidthChange(bp.width)}
          >
            {bp.label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded border text-xs tabular-nums',
          dragging ? 'border-primary bg-primary/5' : 'border-border',
          nearestBreakpoint && 'text-primary'
        )}
      >
        <span className="font-medium">{width}px</span>
      </div>

      <div
        className={cn(
          'w-4 h-6 rounded cursor-col-resize flex items-center justify-center transition-colors',
          dragging ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted-foreground/20'
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Drag to resize canvas width"
      >
        <svg width="6" height="14" viewBox="0 0 6 14" fill="currentColor">
          <rect x="0" y="0" width="2" height="14" rx="1" opacity="0.5" />
          <rect x="4" y="0" width="2" height="14" rx="1" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}
