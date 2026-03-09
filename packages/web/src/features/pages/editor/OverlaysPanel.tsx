/**
 * Overlays panel: manage sticky bars and popups.
 */

import { useState } from 'react';
import { useEditor } from './EditorContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GripVertical, X, PanelTop, PanelBottom } from 'lucide-react';
import { BLOCK_DEFINITIONS } from './block-registry';
import type { StickyBar, Popup } from './types';

function OverlayBlockList({
  rootId,
  blocks,
  onAddBlock,
  onRemoveBlock,
  selectedId,
  onSelect,
}: {
  rootId: string;
  blocks: Record<string, { id: string; type: string; children?: string[] }>;
  onAddBlock: (parentId: string) => void;
  onRemoveBlock: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const block = rootId ? blocks[rootId] : null;
  if (!block) return null;
  const children = block.children ?? [];

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm cursor-pointer ${selectedId === block.id ? 'bg-primary/10' : 'hover:bg-muted'}`}
        onClick={() => onSelect(block.id)}
      >
        <span className="text-muted-foreground">
          {BLOCK_DEFINITIONS.find((d) => d.type === block.type)?.label ?? block.type}
        </span>
        <button
          type="button"
          className="ml-auto text-destructive hover:bg-destructive/20 rounded p-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveBlock(block.id);
          }}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {children.map((cid) => (
        <div key={cid} className="pl-4">
          <OverlayBlockList
            rootId={cid}
            blocks={blocks}
            onAddBlock={onAddBlock}
            onRemoveBlock={onRemoveBlock}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );
}

function genId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function StickyBarEditorDialog({
  bar,
  open,
  onOpenChange,
  onSave,
}: {
  bar: StickyBar;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<StickyBar>) => void;
}) {
  const { updateOverlayBlocks } = useEditor();
  const [position, setPosition] = useState(bar.position);
  const [backgroundColor, setBackgroundColor] = useState(bar.backgroundColor ?? '');
  const [blocks, setBlocks] = useState(bar.blocks);
  const [root, setRoot] = useState(bar.root);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const handleAddBlock = (parentId: string) => {
    const id = genId();
    const newBlock = {
      id,
      type: 'paragraph' as const,
      props: { content: 'New block' },
      meta: {},
    };
    const parent = blocks[parentId];
    if (!parent) return;
    const childIds = parent.children ?? [];
    const updatedParent = { ...parent, children: [...childIds, id] };
    const newBlocks = { ...blocks, [id]: newBlock, [parentId]: updatedParent };
    setBlocks(newBlocks);
  };

  const handleRemoveBlock = (id: string) => {
    const newBlocks = { ...blocks };
    delete newBlocks[id];
    Object.values(newBlocks).forEach((b) => {
      if (b.children?.includes(id)) {
        (newBlocks[b.id] as { children?: string[] }).children = b.children!.filter((c) => c !== id);
      }
    });
    if (root === id) {
      const firstRemaining = Object.keys(newBlocks)[0];
      setRoot(firstRemaining ?? '');
    }
    setBlocks(newBlocks);
  };

  const handleSave = () => {
    onSave({ position, backgroundColor: backgroundColor || undefined });
    updateOverlayBlocks('stickyBar', bar.id, root, blocks);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit sticky bar</DialogTitle>
        </DialogHeader>
        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col gap-4 overflow-auto">
            <div className="space-y-2">
              <Label className="text-xs">Position</Label>
              <Select value={position} onValueChange={(v: 'top' | 'bottom') => setPosition(v)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Background color</Label>
              <Input
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="#1e293b"
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Content blocks</Label>
                {root && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleAddBlock(root)}>
                    + Add block
                  </Button>
                )}
              </div>
              <div className="border rounded p-2 bg-muted/20 max-h-[200px] overflow-auto">
                {root ? (
                  <OverlayBlockList
                    rootId={root}
                    blocks={blocks}
                    onAddBlock={handleAddBlock}
                    onRemoveBlock={handleRemoveBlock}
                    selectedId={selectedBlockId}
                    onSelect={setSelectedBlockId}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No blocks</p>
                )}
              </div>
            </div>
          </div>
          <div className="w-[280px] border rounded p-4 overflow-auto bg-muted/10">
            <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
            <div
              className="p-4 rounded text-sm"
              style={{
                backgroundColor: backgroundColor || '#1e293b',
                color: '#fff',
              }}
            >
              {root && blocks[root] ? (
                <OverlayPreview rootId={root} blocks={blocks} />
              ) : (
                <p className="text-muted-foreground">Empty</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OverlayPreview({
  rootId,
  blocks,
}: {
  rootId: string;
  blocks: Record<string, { id: string; type: string; children?: string[]; props?: Record<string, unknown> }>;
}) {
  const block = blocks[rootId];
  if (!block) return null;
  const children = block.children ?? [];
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {(block.type === 'paragraph' || block.type === 'headline' || block.type === 'text') && (
        <span>{(block.props?.content as string) ?? 'Text'}</span>
      )}
      {block.type === 'button' && (
        <span className="px-2 py-1 bg-white/20 rounded text-sm">
          {(block.props?.text as string) ?? 'Button'}
        </span>
      )}
      {block.type === 'container' && (
        <div className="flex flex-wrap gap-2">
          {children.map((cid) => (
            <OverlayPreview key={cid} rootId={cid} blocks={blocks} />
          ))}
        </div>
      )}
      {!['container', 'text', 'paragraph', 'headline', 'button'].includes(block.type) &&
        children.map((cid) => (
          <OverlayPreview key={cid} rootId={cid} blocks={blocks} />
        ))}
    </div>
  );
}

function PopupEditorDialog({
  popup,
  open,
  onOpenChange,
  onSave,
}: {
  popup: Popup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Popup>) => void;
}) {
  const { updateOverlayBlocks } = useEditor();
  const [trigger, setTrigger] = useState(popup.trigger);
  const [delaySeconds, setDelaySeconds] = useState(popup.delaySeconds ?? 3);
  const [blocks, setBlocks] = useState(popup.blocks);
  const [root, setRoot] = useState(popup.root);

  const handleRemoveBlock = (id: string) => {
    const newBlocks = { ...blocks };
    delete newBlocks[id];
    Object.values(newBlocks).forEach((b) => {
      if (b.children?.includes(id)) {
        (newBlocks[b.id] as { children?: string[] }).children = b.children!.filter((c) => c !== id);
      }
    });
    if (root === id) {
      const firstRemaining = Object.keys(newBlocks)[0];
      setRoot(firstRemaining ?? '');
    }
    setBlocks(newBlocks);
  };

  const handleSave = () => {
    onSave({ trigger, delaySeconds });
    updateOverlayBlocks('popup', popup.id, root, blocks);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit popup</DialogTitle>
        </DialogHeader>
        <div className="flex gap-4 flex-1 min-h-0 overflow-auto">
          <div className="flex-1 flex flex-col gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Trigger</Label>
              <Select value={trigger} onValueChange={(v: 'onLoad' | 'delay' | 'exitIntent') => setTrigger(v)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onLoad">On page load</SelectItem>
                  <SelectItem value="delay">After delay</SelectItem>
                  <SelectItem value="exitIntent">Exit intent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {trigger === 'delay' && (
              <div className="space-y-2">
                <Label className="text-xs">Delay (seconds)</Label>
                <Input
                  type="number"
                  min={1}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 3)}
                  className="h-8"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Content blocks</Label>
              <div className="border rounded p-2 bg-muted/20 max-h-[200px] overflow-auto">
                {root ? (
                  <OverlayBlockList
                    rootId={root}
                    blocks={blocks}
                    onAddBlock={() => {}}
                    onRemoveBlock={handleRemoveBlock}
                    selectedId={null}
                    onSelect={() => {}}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No blocks</p>
                )}
              </div>
            </div>
          </div>
          <div className="w-[280px] border rounded p-4 overflow-auto bg-muted/10">
            <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
            <div className="p-4 rounded border bg-background">
              {root && blocks[root] ? (
                <OverlayPreview rootId={root} blocks={blocks} />
              ) : (
                <p className="text-muted-foreground text-sm">Empty</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OverlaysPanel() {
  const {
    stickyBars,
    popups,
    addStickyBar,
    updateStickyBar,
    removeStickyBar,
    addPopup,
    updatePopup,
    removePopup,
  } = useEditor();
  const [editingStickyBar, setEditingStickyBar] = useState<StickyBar | null>(null);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-medium">Sticky bars</Label>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => addStickyBar()}>
            + Add
          </Button>
        </div>
        <div className="space-y-1">
          {stickyBars.map((bar) => (
            <div
              key={bar.id}
              className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted group"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              {bar.position === 'top' ? (
                <PanelTop className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <PanelBottom className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="flex-1 text-sm truncate">
                {bar.position === 'top' ? 'Top bar' : 'Bottom bar'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100"
                onClick={() => setEditingStickyBar(bar)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100"
                onClick={() => removeStickyBar(bar.id)}
              >
                Remove
              </Button>
            </div>
          ))}
          {stickyBars.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No sticky bars</p>
          )}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-medium">Popups</Label>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => addPopup()}>
            + Add
          </Button>
        </div>
        <div className="space-y-1">
          {popups.map((popup) => (
            <div
              key={popup.id}
              className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted group"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 text-sm truncate">
                {popup.trigger === 'onLoad' ? 'On load' : popup.trigger === 'delay' ? `After ${popup.delaySeconds}s` : 'Exit intent'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100"
                onClick={() => setEditingPopup(popup)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100"
                onClick={() => removePopup(popup.id)}
              >
                Remove
              </Button>
            </div>
          ))}
          {popups.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No popups</p>
          )}
        </div>
      </div>
      {editingStickyBar && (
        <StickyBarEditorDialog
          bar={editingStickyBar}
          open={!!editingStickyBar}
          onOpenChange={(open) => !open && setEditingStickyBar(null)}
          onSave={(updates) => updateStickyBar(editingStickyBar.id, updates)}
        />
      )}
      {editingPopup && (
        <PopupEditorDialog
          popup={editingPopup}
          open={!!editingPopup}
          onOpenChange={(open) => !open && setEditingPopup(null)}
          onSave={(updates) => updatePopup(editingPopup.id, updates)}
        />
      )}
    </div>
  );
}
