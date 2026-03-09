import { useCallback, useMemo, useState } from 'react';

export interface SelectionState {
  selectedBlockIds: string[];
  selectedBlockId: string | null;
  setSelectedBlockIds: (ids: string[]) => void;
  setSelectedBlockId: (id: string | null) => void;
  toggleBlockSelection: (id: string, addToSelection?: boolean) => void;
  handleBlockClick: (id: string, event: React.MouseEvent) => void;
  clearSelection: () => void;
}

export function useSelectionState(): SelectionState {
  const [selectedBlockIds, setSelectedBlockIdsState] = useState<string[]>([]);

  const selectedBlockId = useMemo(
    () => selectedBlockIds[0] ?? null,
    [selectedBlockIds]
  );

  const setSelectedBlockId = useCallback((id: string | null) => {
    setSelectedBlockIdsState(id ? [id] : []);
  }, []);

  const setSelectedBlockIds = useCallback((ids: string[]) => {
    setSelectedBlockIdsState(ids);
  }, []);

  const toggleBlockSelection = useCallback(
    (id: string, addToSelection?: boolean) => {
      setSelectedBlockIdsState((prev) => {
        const has = prev.includes(id);
        if (addToSelection) {
          return has ? prev.filter((x) => x !== id) : [...prev, id];
        }
        return has && prev.length === 1 ? [] : [id];
      });
    },
    []
  );

  const handleBlockClick = useCallback(
    (id: string, event: React.MouseEvent) => {
      if (event.ctrlKey || event.metaKey) {
        toggleBlockSelection(id, true);
      } else {
        setSelectedBlockId(id);
      }
    },
    [toggleBlockSelection, setSelectedBlockId]
  );

  const clearSelection = useCallback(() => {
    setSelectedBlockIdsState([]);
  }, []);

  return {
    selectedBlockIds,
    selectedBlockId,
    setSelectedBlockIds,
    setSelectedBlockId,
    toggleBlockSelection,
    handleBlockClick,
    clearSelection,
  };
}
