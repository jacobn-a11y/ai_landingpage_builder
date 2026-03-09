/**
 * Block 17: Diff Overlay
 *
 * Renders colored outlines around blocks to visualise AI changes:
 *   green  = added
 *   yellow = modified
 *   red    = removed (briefly, before they disappear)
 *
 * Uses CSS `outline` so it does not affect layout.
 */

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DiffOverlayProps {
  changedBlockIds: string[];
  addedBlockIds: string[];
  removedBlockIds: string[];
  /** Auto-dismiss after this many ms (0 = manual dismiss only). Default 8000. */
  autoDismissMs?: number;
  /** Called when the overlay is dismissed */
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Style definitions
// ---------------------------------------------------------------------------

const OUTLINE_STYLES = {
  added: '2px solid #22c55e',    // green-500
  modified: '2px solid #eab308', // yellow-500
  removed: '2px dashed #ef4444', // red-500
} as const;

const OVERLAY_BG = {
  added: 'rgba(34, 197, 94, 0.06)',
  modified: 'rgba(234, 179, 8, 0.06)',
  removed: 'rgba(239, 68, 68, 0.06)',
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DiffOverlay({
  changedBlockIds,
  addedBlockIds,
  removedBlockIds,
  autoDismissMs = 8000,
  onDismiss,
}: DiffOverlayProps) {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  // Apply / remove outlines via DOM (non-React-managed block elements)
  useEffect(() => {
    if (!visible) return;

    const applied: Array<{ el: HTMLElement; prev: string; prevBg: string }> = [];

    const applyStyle = (
      ids: string[],
      category: 'added' | 'modified' | 'removed',
    ) => {
      for (const id of ids) {
        const el = document.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
        if (!el) continue;
        applied.push({
          el,
          prev: el.style.outline,
          prevBg: el.style.backgroundColor,
        });
        el.style.outline = OUTLINE_STYLES[category];
        el.style.outlineOffset = '-1px';
        el.style.backgroundColor = OVERLAY_BG[category];
        el.style.transition = 'outline 0.3s ease, background-color 0.3s ease';
      }
    };

    applyStyle(addedBlockIds, 'added');
    applyStyle(changedBlockIds, 'modified');
    applyStyle(removedBlockIds, 'removed');

    return () => {
      for (const { el, prev, prevBg } of applied) {
        el.style.outline = prev;
        el.style.outlineOffset = '';
        el.style.backgroundColor = prevBg;
        el.style.transition = '';
      }
    };
  }, [visible, changedBlockIds, addedBlockIds, removedBlockIds]);

  if (!visible) return null;

  const total = changedBlockIds.length + addedBlockIds.length + removedBlockIds.length;
  if (total === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-lg flex items-center gap-3 text-sm">
        {/* Legend dots */}
        {addedBlockIds.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-gray-600">{addedBlockIds.length} added</span>
          </span>
        )}
        {changedBlockIds.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <span className="text-gray-600">{changedBlockIds.length} changed</span>
          </span>
        )}
        {removedBlockIds.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-gray-600">{removedBlockIds.length} removed</span>
          </span>
        )}

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          className="ml-2 rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Dismiss diff overlay"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
