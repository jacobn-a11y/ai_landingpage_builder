import { useCallback, useState } from 'react';

export interface EditorMutationRecord {
  id: string;
  kind: string;
  at: string;
  blockIds?: string[];
}

export type RecordMutation = (kind: string, blockIds?: string[]) => void;

export function useMutationLog(maxEntries = 100): {
  mutationLog: EditorMutationRecord[];
  recordMutation: RecordMutation;
} {
  const [mutationLog, setMutationLog] = useState<EditorMutationRecord[]>([]);

  const recordMutation = useCallback<RecordMutation>((kind, blockIds) => {
    const entry: EditorMutationRecord = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      kind,
      at: new Date().toISOString(),
      ...(blockIds?.length ? { blockIds } : {}),
    };
    setMutationLog((prev) => [...prev.slice(-(maxEntries - 1)), entry]);
  }, [maxEntries]);

  return {
    mutationLog,
    recordMutation,
  };
}
