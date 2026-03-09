/**
 * Displays pending mutations with human-readable descriptions
 * and Apply / Discard actions.
 */

import type { EditorMutation } from './stores/chat-store';
import { describeMutation, describeMutationBatch, mutationIcon } from './mutation-descriptions';

interface AIMutationCardProps {
  mutations: EditorMutation[];
  onApply: (mutations: EditorMutation[]) => void;
  onDiscard: (mutations: EditorMutation[]) => void;
}

function SingleMutationRow({
  mutation,
  onApply,
  onDiscard,
}: {
  mutation: EditorMutation;
  onApply: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-white rounded border border-gray-200">
      <span className="text-base flex-shrink-0" aria-hidden="true">
        {mutationIcon(mutation.type)}
      </span>
      <span className="flex-1 text-sm text-gray-700 truncate">
        {describeMutation(mutation)}
      </span>
      <button
        onClick={onApply}
        className="px-2.5 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors flex-shrink-0"
      >
        Apply
      </button>
      <button
        onClick={onDiscard}
        className="px-2.5 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex-shrink-0"
      >
        Discard
      </button>
    </div>
  );
}

export function AIMutationCard({ mutations, onApply, onDiscard }: AIMutationCardProps) {
  if (mutations.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      {mutations.length > 1 && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 rounded-lg">
          <span className="text-xs font-medium text-gray-600">
            {describeMutationBatch(mutations)}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => onApply(mutations)}
              className="px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Apply All ({mutations.length})
            </button>
            <button
              onClick={() => onDiscard(mutations)}
              className="px-3 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Discard All
            </button>
          </div>
        </div>
      )}

      {mutations.map((mutation, idx) => (
        <SingleMutationRow
          key={idx}
          mutation={mutation}
          onApply={() => onApply([mutation])}
          onDiscard={() => onDiscard([mutation])}
        />
      ))}
    </div>
  );
}
