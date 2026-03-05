/**
 * Layers panel: tree view of blocks.
 */

import { useEditor } from './EditorContext';
import { BLOCK_DEFINITIONS } from './block-registry';
import { ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function getBlockLabel(type: string): string {
  return BLOCK_DEFINITIONS.find((d) => d.type === type)?.label ?? type;
}

function LayerItem({
  blockId,
  depth = 0,
}: {
  blockId: string;
  depth?: number;
}) {
  const { content, selectedBlockIds, handleBlockClick, removeBlock } = useEditor();
  const block = content.blocks[blockId];
  const [expanded, setExpanded] = useState(true);

  if (!block) return null;

  const children = block.children ?? [];
  const hasChildren = children.length > 0;
  const selected = selectedBlockIds.includes(blockId);

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded cursor-pointer group',
          selected && 'bg-primary/10 text-primary'
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={(e) => handleBlockClick(blockId, e)}
      >
        <button
          type="button"
          className="p-0.5 hover:bg-muted rounded"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((x) => !x);
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="w-3.5 inline-block" />
          )}
        </button>
        <span className="flex-1 text-sm truncate">
          {getBlockLabel(block.type)}
        </span>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            removeBlock(blockId);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {hasChildren && expanded && (
        <div>
          {children.map((cid) => (
            <LayerItem key={cid} blockId={cid} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function LayersPanel() {
  const { content } = useEditor();
  const rootId = content.root;
  const rootBlock = rootId ? content.blocks[rootId] : null;

  return (
    <div className="flex flex-col border-r bg-muted/20 min-w-[180px]">
      <div className="p-2 border-b text-sm font-medium">Layers</div>
      <div className="flex-1 overflow-auto py-1">
        {rootBlock ? (
          <LayerItem blockId={rootId} />
        ) : (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">
            No blocks. Add from toolbar.
          </div>
        )}
      </div>
    </div>
  );
}
