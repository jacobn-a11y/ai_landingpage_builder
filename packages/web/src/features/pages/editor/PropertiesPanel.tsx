/**
 * Properties panel: edit selected block props or page scripts.
 * Uses the inspector registry to render per-block-type controls.
 */

import { useEditor } from './EditorContext';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { PageScriptsPanel } from './PageScriptsPanel';
import { PageSettingsPanel } from './PageSettingsPanel';
import { OverlaysPanel } from './OverlaysPanel';
import { UniversalPropertiesSection } from './UniversalPropertiesSection';
import { getInspector } from './inspectors';

export function PropertiesPanel() {
  const { content, selectedBlockIds, selectedBlockId, updateBlock, removeBlock, layoutMode, breakpoint, copyBlocks, pasteBlocks, groupBlocks, alignBlocks, updateBlocksZIndex } = useEditor();

  if (!selectedBlockId && selectedBlockIds.length === 0) {
    return (
      <div className="flex flex-col border-l bg-muted/20 min-w-[220px]">
        <div className="p-2 border-b text-sm font-medium">Page settings</div>
        <div className="flex-1 overflow-auto">
          <PageSettingsPanel />
          <div className="p-2 border-t text-sm font-medium">Overlays</div>
          <div className="p-3">
            <OverlaysPanel />
          </div>
          <div className="p-2 border-t text-sm font-medium">Page scripts</div>
          <PageScriptsPanel />
        </div>
      </div>
    );
  }

  const block = content.blocks[selectedBlockId!];
  if (!block) {
    return (
      <div className="flex flex-col border-l bg-muted/20 min-w-[220px]">
        <div className="p-2 border-b text-sm font-medium">Properties</div>
        <div className="flex-1 p-4 text-sm text-muted-foreground text-center">
          Block not found
        </div>
      </div>
    );
  }

  const props = (block.props ?? {}) as Record<string, unknown>;

  const handlePropChange = (keyOrUpdates: string | Record<string, unknown>, value?: string | number | boolean | unknown) => {
    if (!selectedBlockId) return;
    const updates = typeof keyOrUpdates === 'object'
      ? keyOrUpdates
      : { [keyOrUpdates]: value };
    if (selectedBlockIds.length > 1) {
      selectedBlockIds.forEach((id) => updateBlock(id, { props: { ...(content.blocks[id]?.props ?? {}), ...updates } }));
    } else {
      updateBlock(selectedBlockId, { props: { ...props, ...updates } });
    }
  };

  // Look up per-type inspector from the registry
  const Inspector = getInspector(block.type);

  return (
    <div className="flex flex-col border-l bg-muted/20 min-w-[220px]">
      <div className="p-2 border-b text-sm font-medium flex items-center justify-between">
        <span>Properties</span>
        <span className="text-xs text-muted-foreground capitalize">{block.type}</span>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Per-type inspector from registry */}
        {Inspector ? (
          <Inspector
            blockId={selectedBlockId!}
            block={block}
            updateBlock={updateBlock}
          />
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              No specific controls for <span className="capitalize">{block.type}</span> blocks.
            </div>
          </div>
        )}

        {/* Universal style properties (always shown) */}
        <UniversalPropertiesSection
          props={props}
          onPropChange={(updates) => handlePropChange(updates)}
          layoutMode={layoutMode}
          breakpoint={breakpoint}
        />

        {/* Multi-selection actions */}
        {selectedBlockIds.length > 0 && (
          <div className="flex flex-wrap gap-1 py-2 border-t">
            <Button variant="outline" size="sm" onClick={copyBlocks} title="Copy (Ctrl+C)">Copy</Button>
            <Button variant="outline" size="sm" onClick={() => pasteBlocks(content.root ?? null)} title="Paste (Ctrl+V)">Paste</Button>
            {selectedBlockIds.length >= 2 && (
              <>
                <Button variant="outline" size="sm" onClick={groupBlocks} title="Group (Ctrl+G)">Group</Button>
                {layoutMode === 'canvas' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => alignBlocks('left')}>Align L</Button>
                    <Button variant="outline" size="sm" onClick={() => alignBlocks('center')}>Align C</Button>
                    <Button variant="outline" size="sm" onClick={() => alignBlocks('right')}>Align R</Button>
                    <Button variant="outline" size="sm" onClick={() => updateBlocksZIndex(1)}>&#8593;</Button>
                    <Button variant="outline" size="sm" onClick={() => updateBlocksZIndex(-1)}>&#8595;</Button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Remove block(s) */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => selectedBlockIds.forEach((id) => removeBlock(id))}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove {selectedBlockIds.length > 1 ? `${selectedBlockIds.length} blocks` : 'block'}
          </Button>
        </div>
      </div>
    </div>
  );
}
