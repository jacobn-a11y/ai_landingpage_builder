/**
 * Layers panel: tree view of blocks with lock/unlock, show/hide,
 * rename on double-click, and visual selection indication.
 */

import { useEditor } from './EditorContext';
import { BLOCK_DEFINITIONS } from './block-registry';
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  GripVertical,
} from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

function getBlockLabel(type: string): string {
  return BLOCK_DEFINITIONS.find((d) => d.type === type)?.label ?? type;
}

function LayerItem({
  blockId,
  depth = 0,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverId,
}: {
  blockId: string;
  depth?: number;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (id: string) => void;
  dragOverId: string | null;
}) {
  const { content, selectedBlockIds, handleBlockClick, removeBlock, updateBlock } = useEditor();
  const block = content.blocks[blockId];
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = useCallback(() => {
    if (!block) return;
    const name = (block.meta as Record<string, unknown>)?.label as string | undefined;
    setEditName(name ?? getBlockLabel(block.type));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [block]);

  const commitRename = useCallback(() => {
    if (!block) return;
    const trimmed = editName.trim();
    if (trimmed && trimmed !== getBlockLabel(block.type)) {
      updateBlock(blockId, {
        meta: { ...(block.meta ?? {}), label: trimmed },
      });
    } else {
      // Clear custom label if it matches default
      const { label: _, ...rest } = (block.meta ?? {}) as Record<string, unknown>;
      updateBlock(blockId, { meta: rest });
    }
    setEditing(false);
  }, [block, blockId, editName, updateBlock]);

  if (!block) return null;

  const meta = (block.meta ?? {}) as Record<string, unknown>;
  const children = block.children ?? [];
  const hasChildren = children.length > 0;
  const selected = selectedBlockIds.includes(blockId);
  const locked = !!meta.locked;
  const hidden = !!meta.hidden;
  const customLabel = meta.label as string | undefined;
  const displayName = customLabel || getBlockLabel(block.type);
  const isDragOver = dragOverId === blockId;

  const toggleLocked = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateBlock(blockId, { meta: { ...meta, locked: !locked } });
  };

  const toggleHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateBlock(blockId, { meta: { ...meta, hidden: !hidden } });
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-0.5 py-1 px-1 rounded cursor-pointer group',
          selected && 'bg-primary/10 text-primary font-medium',
          !selected && 'hover:bg-muted/60',
          hidden && 'opacity-50',
          isDragOver && 'ring-1 ring-primary/50 bg-primary/5'
        )}
        style={{ paddingLeft: depth * 14 + 4 }}
        onClick={(e) => handleBlockClick(blockId, e)}
        onDoubleClick={handleDoubleClick}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(blockId);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragOver(blockId);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(blockId);
        }}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 cursor-grab" />

        <button
          type="button"
          className="p-0.5 hover:bg-muted rounded shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((x) => !x);
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <span className="w-3 inline-block" />
          )}
        </button>

        {editing ? (
          <input
            ref={inputRef}
            className="flex-1 text-xs bg-background border rounded px-1 py-0 min-w-0"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-xs truncate min-w-0">
            {displayName}
          </span>
        )}

        {/* Action buttons - visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
          <button
            type="button"
            className={cn(
              'p-0.5 rounded transition-colors',
              hidden ? 'text-warning opacity-100' : 'hover:bg-muted'
            )}
            onClick={toggleHidden}
            title={hidden ? 'Show block' : 'Hide block'}
          >
            {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button
            type="button"
            className={cn(
              'p-0.5 rounded transition-colors',
              locked ? 'text-warning opacity-100' : 'hover:bg-muted'
            )}
            onClick={toggleLocked}
            title={locked ? 'Unlock block' : 'Lock block'}
          >
            {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
          <button
            type="button"
            className="p-0.5 hover:bg-destructive/20 rounded text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              removeBlock(blockId);
            }}
            title="Delete block"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {children.map((cid) => (
            <LayerItem
              key={cid}
              blockId={cid}
              depth={depth + 1}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              dragOverId={dragOverId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LayersPanel() {
  const { content, moveBlock } = useEditor();
  const rootId = content.root;
  const rootBlock = rootId ? content.blocks[rootId] : null;

  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => {
    setDragSourceId(id);
  }, []);

  const handleDragOver = useCallback((id: string) => {
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!dragSourceId || dragSourceId === targetId) {
        setDragSourceId(null);
        setDragOverId(null);
        return;
      }
      // Find parent of target to insert after it
      const parentId =
        Object.keys(content.blocks).find((bid) =>
          content.blocks[bid].children?.includes(targetId)
        ) ?? content.root;
      const parent = parentId ? content.blocks[parentId] : null;
      const children = parent?.children ?? [];
      const idx = children.indexOf(targetId);
      moveBlock(dragSourceId, parentId || null, idx >= 0 ? idx + 1 : 0);
      setDragSourceId(null);
      setDragOverId(null);
    },
    [dragSourceId, content, moveBlock]
  );

  return (
    <div className="flex flex-col border-r bg-muted/20 min-w-[200px] max-w-[240px]">
      <div className="p-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Layers
      </div>
      <div
        className="flex-1 overflow-auto py-1"
        onDragOver={(e) => e.preventDefault()}
      >
        {rootBlock ? (
          <LayerItem
            blockId={rootId}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            dragOverId={dragOverId}
          />
        ) : (
          <div className="px-4 py-6 text-xs text-muted-foreground text-center">
            No blocks yet.
            <br />
            Add from the toolbar.
          </div>
        )}
      </div>
    </div>
  );
}
