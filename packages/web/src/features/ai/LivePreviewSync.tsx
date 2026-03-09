/**
 * Block 17: Live Preview Sync
 *
 * Floating action bar that appears after AI edits, showing a summary of
 * changes with Accept All / Reject All / Review options.
 *
 * Tracks before/after EditorContentJson snapshots so the user can accept
 * (commit changes) or reject (revert to snapshot).
 */

import { useCallback, useMemo, useState } from 'react';
import type { EditorContentJson } from '@/features/pages/editor/types';
import { computeBlockDiff, totalChanges } from './diff-utils';
import { DiffOverlay } from './DiffOverlay';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LivePreviewSyncProps {
  /** Content snapshot taken BEFORE the AI mutation batch was applied */
  beforeContent: EditorContentJson;
  /** Current (post-AI) content */
  afterContent: EditorContentJson;
  /** Commit the after-state as accepted */
  onAccept: () => void;
  /** Revert to beforeContent */
  onReject: () => void;
  /** Open a per-block review flow (optional) */
  onReview?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LivePreviewSync({
  beforeContent,
  afterContent,
  onAccept,
  onReject,
  onReview,
}: LivePreviewSyncProps) {
  const [dismissed, setDismissed] = useState(false);

  const diff = useMemo(
    () => computeBlockDiff(beforeContent, afterContent),
    [beforeContent, afterContent],
  );

  const changeCount = totalChanges(diff);

  const handleAccept = useCallback(() => {
    onAccept();
    setDismissed(true);
  }, [onAccept]);

  const handleReject = useCallback(() => {
    onReject();
    setDismissed(true);
  }, [onReject]);

  if (dismissed || changeCount === 0) return null;

  return (
    <>
      {/* Diff outlines on blocks */}
      <DiffOverlay
        changedBlockIds={diff.modified}
        addedBlockIds={diff.added}
        removedBlockIds={diff.removed}
        autoDismissMs={0}
        onDismiss={() => setDismissed(true)}
      />

      {/* Floating action bar */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-xl">
          {/* Summary */}
          <span className="text-sm font-medium text-gray-700">
            AI made{' '}
            <span className="font-bold text-indigo-600">{changeCount}</span>{' '}
            {changeCount === 1 ? 'change' : 'changes'}
          </span>

          {/* Divider */}
          <span className="h-5 w-px bg-gray-200" />

          {/* Accept All */}
          <button
            type="button"
            onClick={handleAccept}
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 transition-colors"
          >
            Accept All
          </button>

          {/* Reject All */}
          <button
            type="button"
            onClick={handleReject}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 transition-colors"
          >
            Reject All
          </button>

          {/* Review (optional) */}
          {onReview && (
            <button
              type="button"
              onClick={onReview}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Review
            </button>
          )}
        </div>
      </div>
    </>
  );
}
