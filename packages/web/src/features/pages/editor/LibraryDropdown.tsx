/**
 * Library dropdown in editor toolbar: insert blocks from uploaded pages.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, type BlockLibraryFolder, type BlockLibraryItem } from '@/lib/api';
import { useEditor } from './EditorContext';
import { Library, Trash2 } from 'lucide-react';

export function LibraryDropdown() {
  const { insertBlockFromLibrary, content, selectedBlockId } = useEditor();
  const [folders, setFolders] = useState<BlockLibraryFolder[]>([]);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const targetParentId = selectedBlockId ?? content.root ?? null;

  useEffect(() => {
    api.library.listFolders().then(({ folders: f }) => setFolders(f)).catch(() => setFolders([]));
  }, []);

  const handleInsert = (item: BlockLibraryItem) => {
    const blockJson = item.blockJson as object;
    insertBlockFromLibrary(blockJson, targetParentId);
  };

  const handleDeleteItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    try {
      await api.library.deleteItem(itemId);
      setFolders((prev) =>
        prev.map((f) => ({
          ...f,
          items: f.items.filter((i) => i.id !== itemId),
        }))
      );
    } catch {
      // Surface error
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    try {
      await api.library.deleteFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (openFolderId === folderId) setOpenFolderId(null);
    } catch {
      // Surface error
    }
  };

  if (folders.length === 0) {
    return (
      <div className="px-2 py-1 text-xs text-muted-foreground">
        <Library className="h-3.5 w-3.5 inline mr-1" />
        Library (upload a page first)
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
        <Library className="h-3.5 w-3.5" />
        <span>Library</span>
      </div>
      <Select value={openFolderId ?? ''} onValueChange={(v) => setOpenFolderId(v || null)}>
        <SelectTrigger className="h-8 px-2 text-xs">
          <SelectValue placeholder="Select folder" />
        </SelectTrigger>
        <SelectContent>
          {folders.map((folder) => (
            <SelectItem key={folder.id} value={folder.id}>
              {folder.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {openFolderId && (
        <div className="flex flex-col gap-0.5 max-h-40 overflow-auto">
          {folders
            .find((f) => f.id === openFolderId)
            ?.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-1 px-2 py-1 rounded hover:bg-muted group"
              >
                <button
                  type="button"
                  className="flex-1 text-left text-xs truncate"
                  onClick={() => handleInsert(item)}
                >
                  {item.name}
                </button>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 shrink-0"
                  onClick={(e: React.MouseEvent) => handleDeleteItem(e, item.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-destructive hover:text-destructive"
            onClick={(e: React.MouseEvent) =>
              openFolderId && handleDeleteFolder(e, openFolderId)
            }
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete folder
          </Button>
        </div>
      )}
    </div>
  );
}
