/**
 * Properties panel: edit selected block props or page scripts.
 */

import { useEditor } from './EditorContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
import { PageScriptsPanel } from './PageScriptsPanel';
import { PageSettingsPanel } from './PageSettingsPanel';
import { OverlaysPanel } from './OverlaysPanel';
import { UniversalPropertiesSection } from './UniversalPropertiesSection';

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

  return (
    <div className="flex flex-col border-l bg-muted/20 min-w-[220px]">
      <div className="p-2 border-b text-sm font-medium">Properties</div>
      <div className="flex-1 overflow-auto p-3 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Block type</Label>
          <div className="text-sm text-muted-foreground capitalize">
            {block.type}
          </div>
        </div>

        {block.type === 'text' && (
          <div className="space-y-2">
            <Label htmlFor="prop-content" className="text-xs">Content (plain)</Label>
            <Input
              id="prop-content"
              value={(props.content as string) ?? ''}
              onChange={(e) => handlePropChange('content', e.target.value)}
              className="text-sm"
              placeholder="Use toolbar when selected for rich text"
            />
            <p className="text-[10px] text-muted-foreground">
              Use {`{{param}}`} for URL params, e.g. {`{{name}}`}
            </p>
          </div>
        )}

        {block.type === 'image' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="prop-src" className="text-xs">Image URL</Label>
              <Input
                id="prop-src"
                value={(props.src as string) ?? ''}
                onChange={(e) => handlePropChange('src', e.target.value)}
                placeholder="https://..."
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-alt" className="text-xs">Alt text</Label>
              <Input
                id="prop-alt"
                value={(props.alt as string) ?? ''}
                onChange={(e) => handlePropChange('alt', e.target.value)}
                className="text-sm"
              />
            </div>
          </>
        )}

        {block.type === 'button' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="prop-text" className="text-xs">Button text</Label>
              <Input
                id="prop-text"
                value={(props.text as string) ?? 'Button'}
                onChange={(e) => handlePropChange('text', e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-href" className="text-xs">Link URL</Label>
              <Input
                id="prop-href"
                value={(props.href as string) ?? '#'}
                onChange={(e) => handlePropChange('href', e.target.value)}
                className="text-sm"
              />
            </div>
          </>
        )}

        {block.type === 'divider' && (
          <div className="space-y-2">
            <Label className="text-xs">Orientation</Label>
            <Select
              value={(props.orientation as string) ?? 'horizontal'}
              onValueChange={(v) => handlePropChange('orientation', v)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {block.type === 'spacer' && (
          <div className="space-y-2">
            <Label htmlFor="prop-height" className="text-xs">Height (px)</Label>
            <Input
              id="prop-height"
              type="number"
              value={(props.height as number) ?? 24}
              onChange={(e) =>
                handlePropChange('height', parseInt(e.target.value, 10) || 24)
              }
              className="text-sm"
            />
          </div>
        )}

        {block.type === 'video' && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Provider</Label>
              <Select
                value={(props.provider as string) ?? 'youtube'}
                onValueChange={(v) => handlePropChange('provider', v)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="vimeo">Vimeo</SelectItem>
                  <SelectItem value="wistia">Wistia</SelectItem>
                  <SelectItem value="custom">Custom URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-url" className="text-xs">Video URL</Label>
              <Input
                id="prop-url"
                value={(props.url as string) ?? ''}
                onChange={(e) => handlePropChange('url', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.autoplay as boolean) ?? false}
                onCheckedChange={(v) => handlePropChange('autoplay', v)}
              />
              <Label className="text-xs">Autoplay</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.mute as boolean) ?? false}
                onCheckedChange={(v) => handlePropChange('mute', v)}
              />
              <Label className="text-xs">Mute</Label>
            </div>
          </>
        )}

        {block.type === 'shapeRectangle' && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                value={(props.width as number) ?? 200}
                onChange={(e) => handlePropChange('width', parseInt(e.target.value, 10) || 200)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Height</Label>
              <Input
                type="number"
                value={(props.height as number) ?? 100}
                onChange={(e) => handlePropChange('height', parseInt(e.target.value, 10) || 100)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Fill color</Label>
              <Input
                type="text"
                value={(props.fillColor as string) ?? '#e5e7eb'}
                onChange={(e) => handlePropChange('fillColor', e.target.value)}
                placeholder="#e5e7eb"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Border radius</Label>
              <Input
                type="number"
                value={(props.borderRadius as number) ?? 0}
                onChange={(e) => handlePropChange('borderRadius', parseInt(e.target.value, 10) || 0)}
                className="text-sm"
              />
            </div>
          </>
        )}

        {block.type === 'shapeCircle' && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Size (px)</Label>
              <Input
                type="number"
                value={(props.size as number) ?? 100}
                onChange={(e) => handlePropChange('size', parseInt(e.target.value, 10) || 100)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Fill color</Label>
              <Input
                type="text"
                value={(props.fillColor as string) ?? '#e5e7eb'}
                onChange={(e) => handlePropChange('fillColor', e.target.value)}
                placeholder="#e5e7eb"
                className="text-sm"
              />
            </div>
          </>
        )}

        {block.type === 'countdown' && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Target date/time</Label>
              <Input
                type="datetime-local"
                value={(props.targetDate as string)?.slice(0, 16) ?? ''}
                onChange={(e) => handlePropChange('targetDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Days label</Label>
              <Input
                value={(props.daysLabel as string) ?? 'Days'}
                onChange={(e) => handlePropChange('daysLabel', e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Hours label</Label>
              <Input
                value={(props.hoursLabel as string) ?? 'Hours'}
                onChange={(e) => handlePropChange('hoursLabel', e.target.value)}
                className="text-sm"
              />
            </div>
          </>
        )}

        {block.type === 'table' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.hasHeader as boolean) ?? true}
                onCheckedChange={(v) => handlePropChange('hasHeader', v)}
              />
              <Label className="text-xs">Header row</Label>
            </div>
            <Label className="text-xs">Table data (JSON)</Label>
            <textarea
              value={JSON.stringify((props.rows as string[][]) ?? [['H1', 'H2'], ['C1', 'C2']], null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value || '[]');
                  if (Array.isArray(parsed)) handlePropChange('rows', parsed as string[][]);
                } catch {
                  // invalid json, ignore
                }
              }}
              className="w-full min-h-[80px] p-2 text-sm font-mono border rounded bg-background"
            />
          </div>
        )}

        {block.type === 'form' && (
          <div className="space-y-2">
            <Label htmlFor="prop-formId" className="text-xs">Form ID</Label>
            <Input
              id="prop-formId"
              value={(props.formId as string) ?? ''}
              onChange={(e) => handlePropChange('formId', e.target.value)}
              placeholder="form-id"
              className="text-sm"
            />
          </div>
        )}

        {block.type === 'customHtml' && (
          <div className="space-y-2">
            <Label htmlFor="prop-html" className="text-xs">HTML</Label>
            <textarea
              id="prop-html"
              value={(props.html as string) ?? ''}
              onChange={(e) => handlePropChange('html', e.target.value)}
              className="w-full min-h-[80px] p-2 text-sm font-mono border rounded bg-background"
              placeholder="<div>...</div>"
            />
          </div>
        )}

        <UniversalPropertiesSection
          props={props}
          onPropChange={(updates) => handlePropChange(updates)}
          layoutMode={layoutMode}
          breakpoint={breakpoint}
        />

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
                    <Button variant="outline" size="sm" onClick={() => updateBlocksZIndex(1)}>↑</Button>
                    <Button variant="outline" size="sm" onClick={() => updateBlocksZIndex(-1)}>↓</Button>
                  </>
                )}
              </>
            )}
          </div>
        )}
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
