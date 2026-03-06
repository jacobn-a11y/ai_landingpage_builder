import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { FolderNode } from '@/lib/api';

interface FolderTreeProps {
  folders: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId?: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}

function FolderItem({
  folder,
  depth,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  expandedIds,
  onToggleExpand,
}: {
  folder: FolderNode;
  depth: number;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId?: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const { canEdit } = useAuth();
  const hasChildren = folder.children.length > 0;
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id;

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer group',
          isSelected && 'bg-primary/10 text-primary font-medium'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => onToggleExpand(folder.id)}
          className="p-0.5 hover:bg-muted rounded"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="w-4 inline-block" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelectFolder(folder.id)}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{folder.name}</span>
        </button>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onCreateFolder(folder.id);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  expandedIds,
  onToggleExpand,
}: FolderTreeProps) {
  const { canEdit } = useAuth();
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onSelectFolder(null)}
        className={cn(
          'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left',
          selectedFolderId === null && 'bg-primary/10 text-primary font-medium'
        )}
      >
        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        All pages
      </button>
      <button
        type="button"
        onClick={() => onSelectFolder('root')}
        className={cn(
          'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left',
          selectedFolderId === 'root' && 'bg-primary/10 text-primary font-medium'
        )}
      >
        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        Root
      </button>
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          depth={0}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          onCreateFolder={onCreateFolder}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
        />
      ))}
      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start mt-2"
          onClick={() => onCreateFolder()}
        >
          <Plus className="h-4 w-4 mr-2" />
          New folder
        </Button>
      )}
    </div>
  );
}
