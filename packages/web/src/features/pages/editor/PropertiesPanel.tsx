/**
 * Properties panel: edit selected block props or page scripts.
 * Includes full typography controls, element-specific panels, and ColorPicker integration.
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
import { ColorPicker } from '@/components/ui/color-picker';
import { loadGoogleFont, POPULAR_GOOGLE_FONTS } from './google-fonts';

/* ── Shared constants ── */

const SYSTEM_FONTS = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New'];
const FONT_FAMILIES = [...POPULAR_GOOGLE_FONTS, ...SYSTEM_FONTS];

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96];

const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
  { value: '900', label: 'Black' },
];

/* ── Typography Section (shared across text / button / heading) ── */

function TypographySection({
  props,
  onChange,
  prefix = '',
}: {
  props: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  prefix?: string;
}) {
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);
  const k = (name: string) => prefix + name;

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Typography</div>
      <div>
        <Label className="text-[10px] text-muted-foreground">Font family</Label>
        <Select value={str(props[k('fontFamily')]) ?? ''} onValueChange={(v) => { if (v) loadGoogleFont(v); onChange(k('fontFamily'), v || undefined); }}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Size</Label>
          <Select value={String(num(props[k('fontSize')]) ?? '')} onValueChange={(v) => onChange(k('fontSize'), v ? parseInt(v, 10) : undefined)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>{s}px</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Weight</Label>
          <Select value={str(props[k('fontWeight')]) ?? ''} onValueChange={(v) => onChange(k('fontWeight'), v || undefined)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((w) => (
                <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Line height</Label>
          <Input
            type="number"
            step={0.1}
            value={num(props[k('lineHeight')]) ?? ''}
            onChange={(e) => onChange(k('lineHeight'), e.target.value ? parseFloat(e.target.value) : undefined)}
            className="h-7 text-xs"
            placeholder="1.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Letter spacing</Label>
          <Input
            type="number"
            step={0.1}
            value={num(props[k('letterSpacing')]) ?? ''}
            onChange={(e) => onChange(k('letterSpacing'), e.target.value ? parseFloat(e.target.value) : undefined)}
            className="h-7 text-xs"
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">Text color</Label>
        <ColorPicker
          color={str(props[k('textColor')]) ?? ''}
          onChange={(c) => onChange(k('textColor'), c || undefined)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Align</Label>
          <Select value={str(props[k('textAlign')]) ?? ''} onValueChange={(v) => onChange(k('textAlign'), v || undefined)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="justify">Justify</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Transform</Label>
          <Select value={str(props[k('textTransform')]) ?? ''} onValueChange={(v) => onChange(k('textTransform'), v || undefined)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="uppercase">UPPER</SelectItem>
              <SelectItem value="lowercase">lower</SelectItem>
              <SelectItem value="capitalize">Capital</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/* ── Main Panel ── */

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

  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

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

        {/* ─── Headline block ─── */}
        {block.type === 'headline' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Heading level</Label>
              <Select
                value={str(props.headingLevel) ?? 'h2'}
                onValueChange={(v) => handlePropChange('headingLevel', v)}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">H1</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                  <SelectItem value="h4">H4</SelectItem>
                  <SelectItem value="h5">H5</SelectItem>
                  <SelectItem value="h6">H6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Content (plain)</Label>
              <Input
                value={(props.content as string) ?? ''}
                onChange={(e) => handlePropChange('content', e.target.value)}
                className="text-sm"
                placeholder="Double-click on canvas to edit inline"
              />
            </div>
            <TypographySection props={props} onChange={(k, v) => handlePropChange(k, v)} />
            <div>
              <Label className="text-[10px] text-muted-foreground">Link color</Label>
              <ColorPicker
                color={str(props.linkColor) ?? ''}
                onChange={(c) => handlePropChange('linkColor', c || undefined)}
              />
            </div>
          </div>
        )}

        {/* ─── Paragraph block ─── */}
        {block.type === 'paragraph' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Content (plain)</Label>
              <Input
                value={(props.content as string) ?? ''}
                onChange={(e) => handlePropChange('content', e.target.value)}
                className="text-sm"
                placeholder="Double-click on canvas to edit inline"
              />
              <p className="text-[10px] text-muted-foreground">
                Use {`{{param}}`} for URL params, e.g. {`{{name}}`}
              </p>
            </div>
            <TypographySection props={props} onChange={(k, v) => handlePropChange(k, v)} />
            <div>
              <Label className="text-[10px] text-muted-foreground">Link color</Label>
              <ColorPicker
                color={str(props.linkColor) ?? ''}
                onChange={(c) => handlePropChange('linkColor', c || undefined)}
              />
            </div>
          </div>
        )}

        {/* ─── Text block (legacy) ─── */}
        {block.type === 'text' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Heading level</Label>
              <Select
                value={str(props.headingLevel) ?? 'p'}
                onValueChange={(v) => handlePropChange('headingLevel', v)}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="p">Paragraph</SelectItem>
                  <SelectItem value="h1">H1</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                  <SelectItem value="h4">H4</SelectItem>
                  <SelectItem value="h5">H5</SelectItem>
                  <SelectItem value="h6">H6</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <TypographySection props={props} onChange={(k, v) => handlePropChange(k, v)} />
            <div>
              <Label className="text-[10px] text-muted-foreground">Link color</Label>
              <ColorPicker
                color={str(props.linkColor) ?? ''}
                onChange={(c) => handlePropChange('linkColor', c || undefined)}
              />
            </div>
          </div>
        )}

        {/* ─── Image block ─── */}
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
            <div className="space-y-2">
              <Label className="text-xs">Link URL</Label>
              <Input
                value={str(props.linkHref) ?? ''}
                onChange={(e) => handlePropChange('linkHref', e.target.value || undefined)}
                placeholder="https://..."
                className="h-7 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.linkNewTab as boolean) ?? false}
                onCheckedChange={(v) => handlePropChange('linkNewTab', v)}
              />
              <Label className="text-xs">Open in new tab</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Object fit</Label>
              <Select
                value={str(props.objectFit) ?? 'cover'}
                onValueChange={(v) => handlePropChange('objectFit', v)}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="contain">Contain</SelectItem>
                  <SelectItem value="fill">Fill</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.lazyLoad as boolean) ?? false}
                onCheckedChange={(v) => handlePropChange('lazyLoad', v)}
              />
              <Label className="text-xs">Lazy loading</Label>
            </div>
          </>
        )}

        {/* ─── Button block ─── */}
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
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.openNewTab as boolean) ?? false}
                onCheckedChange={(v) => handlePropChange('openNewTab', v)}
              />
              <Label className="text-xs">Open in new tab</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Aria label</Label>
              <Input
                value={str(props.ariaLabel) ?? ''}
                onChange={(e) => handlePropChange('ariaLabel', e.target.value || undefined)}
                className="h-7 text-xs"
                placeholder="Accessible label"
              />
            </div>
            <TypographySection props={props} onChange={(k, v) => handlePropChange(k, v)} />
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Button colors</div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Background</Label>
                <ColorPicker
                  color={str(props.buttonBgColor) ?? ''}
                  onChange={(c) => handlePropChange('buttonBgColor', c || undefined)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Text color</Label>
                <ColorPicker
                  color={str(props.buttonTextColor) ?? ''}
                  onChange={(c) => handlePropChange('buttonTextColor', c || undefined)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Hover background</Label>
                <ColorPicker
                  color={str(props.buttonHoverBgColor) ?? ''}
                  onChange={(c) => handlePropChange('buttonHoverBgColor', c || undefined)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Hover text color</Label>
                <ColorPicker
                  color={str(props.buttonHoverTextColor) ?? ''}
                  onChange={(c) => handlePropChange('buttonHoverTextColor', c || undefined)}
                />
              </div>
            </div>
          </>
        )}

        {/* ─── Divider block ─── */}
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
            <div>
              <Label className="text-[10px] text-muted-foreground">Line color</Label>
              <ColorPicker
                color={str(props.lineColor) ?? ''}
                onChange={(c) => handlePropChange('lineColor', c || undefined)}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Thickness (px)</Label>
              <Input
                type="number"
                value={num(props.lineThickness) ?? ''}
                onChange={(e) => handlePropChange('lineThickness', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="h-7 text-xs"
                placeholder="1"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Style</Label>
              <Select
                value={str(props.lineStyle) ?? 'solid'}
                onValueChange={(v) => handlePropChange('lineStyle', v)}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Width</Label>
              <Input
                type="text"
                value={str(props.lineWidth) ?? ''}
                onChange={(e) => handlePropChange('lineWidth', e.target.value || undefined)}
                className="h-7 text-xs"
                placeholder="100% or 200px"
              />
            </div>
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

        {/* ─── Video block ─── */}
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
                  <SelectItem value="loom">Loom</SelectItem>
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
            <div className="space-y-2">
              <Label className="text-xs">Video title</Label>
              <Input
                value={str(props.videoTitle) ?? ''}
                onChange={(e) => handlePropChange('videoTitle', e.target.value || undefined)}
                className="h-7 text-xs"
                placeholder="Title for accessibility"
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
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.loop as boolean) ?? false}
                onCheckedChange={(v) => handlePropChange('loop', v)}
              />
              <Label className="text-xs">Loop</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.showControls as boolean) ?? true}
                onCheckedChange={(v) => handlePropChange('showControls', v)}
              />
              <Label className="text-xs">Show controls</Label>
            </div>
          </>
        )}

        {/* ─── Shape rectangle ─── */}
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
              <ColorPicker
                color={str(props.fillColor) ?? '#e5e7eb'}
                onChange={(c) => handlePropChange('fillColor', c)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Border color</Label>
              <ColorPicker
                color={str(props.borderColor) ?? ''}
                onChange={(c) => handlePropChange('borderColor', c || undefined)}
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
            <div className="space-y-1">
              <Label className="text-xs">Opacity</Label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={num(props.shapeOpacity) ?? 100}
                  onChange={(e) => handlePropChange('shapeOpacity', parseInt(e.target.value, 10))}
                  className="flex-1"
                />
                <span className="text-xs w-8 text-right">{num(props.shapeOpacity) ?? 100}%</span>
              </div>
            </div>
          </>
        )}

        {/* ─── Shape circle ─── */}
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
              <ColorPicker
                color={str(props.fillColor) ?? '#e5e7eb'}
                onChange={(c) => handlePropChange('fillColor', c)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Border color</Label>
              <ColorPicker
                color={str(props.borderColor) ?? ''}
                onChange={(c) => handlePropChange('borderColor', c || undefined)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Opacity</Label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={num(props.shapeOpacity) ?? 100}
                  onChange={(e) => handlePropChange('shapeOpacity', parseInt(e.target.value, 10))}
                  className="flex-1"
                />
                <span className="text-xs w-8 text-right">{num(props.shapeOpacity) ?? 100}%</span>
              </div>
            </div>
          </>
        )}

        {/* ─── Countdown block ─── */}
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Days label</Label>
                <Input value={str(props.daysLabel) ?? 'Days'} onChange={(e) => handlePropChange('daysLabel', e.target.value)} className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Hours label</Label>
                <Input value={str(props.hoursLabel) ?? 'Hours'} onChange={(e) => handlePropChange('hoursLabel', e.target.value)} className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Minutes label</Label>
                <Input value={str(props.minutesLabel) ?? 'Minutes'} onChange={(e) => handlePropChange('minutesLabel', e.target.value)} className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Seconds label</Label>
                <Input value={str(props.secondsLabel) ?? 'Seconds'} onChange={(e) => handlePropChange('secondsLabel', e.target.value)} className="h-7 text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Colors</div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Number color</Label>
                <ColorPicker
                  color={str(props.numberColor) ?? ''}
                  onChange={(c) => handlePropChange('numberColor', c || undefined)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Label color</Label>
                <ColorPicker
                  color={str(props.labelColor) ?? ''}
                  onChange={(c) => handlePropChange('labelColor', c || undefined)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Timer background</Label>
                <ColorPicker
                  color={str(props.timerBgColor) ?? ''}
                  onChange={(c) => handlePropChange('timerBgColor', c || undefined)}
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Label position</Label>
              <Select
                value={str(props.labelPosition) ?? 'bottom'}
                onValueChange={(v) => handlePropChange('labelPosition', v)}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="inside">Inside</SelectItem>
                </SelectContent>
              </Select>
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

        {/* ─── Form block ─── */}
        {block.type === 'form' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Form ID (optional)</Label>
              <Input
                value={(props.formId as string) ?? ''}
                onChange={(e) => handlePropChange('formId', e.target.value)}
                placeholder="form-id"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Submit button text</Label>
              <Input
                value={str(props.submitText) ?? 'Submit'}
                onChange={(e) => handlePropChange('submitText', e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">After submit</Label>
              <Select
                value={str(props.successAction) ?? 'message'}
                onValueChange={(v) => handlePropChange('successAction', v)}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Show message</SelectItem>
                  <SelectItem value="redirect">Redirect to URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(str(props.successAction) ?? 'message') === 'message' && (
              <div className="space-y-2">
                <Label className="text-xs">Success message</Label>
                <Input
                  value={str(props.successMessage) ?? 'Thank you!'}
                  onChange={(e) => handlePropChange('successMessage', e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            )}
            {str(props.successAction) === 'redirect' && (
              <div className="space-y-2">
                <Label className="text-xs">Redirect URL</Label>
                <Input
                  value={str(props.redirectUrl) ?? ''}
                  onChange={(e) => handlePropChange('redirectUrl', e.target.value)}
                  placeholder="https://..."
                  className="h-7 text-xs"
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Fields</div>
              <p className="text-[10px] text-muted-foreground">
                Edit fields as JSON array. Each field: id, type (text/email/phone/textarea/dropdown/checkbox/radio/hidden), label, placeholder, required, options.
              </p>
              <textarea
                value={JSON.stringify(
                  (props.fields as unknown[]) ?? [
                    { id: 'name', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
                    { id: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
                  ],
                  null, 2
                )}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value || '[]');
                    if (Array.isArray(parsed)) handlePropChange('fields', parsed);
                  } catch { /* invalid json */ }
                }}
                className="w-full min-h-[120px] p-2 text-xs font-mono border rounded bg-background"
              />
            </div>
          </div>
        )}

        {/* ─── Accordion block ─── */}
        {block.type === 'accordion' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.expandOneOnly as boolean) ?? false}
                onCheckedChange={(v) => handlePropChange('expandOneOnly', v)}
              />
              <Label className="text-xs">Expand one at a time</Label>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Title styling</div>
              <TypographySection props={props} onChange={(k, v) => handlePropChange(k, v)} prefix="title" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Arrow color</Label>
              <ColorPicker
                color={str(props.arrowColor) ?? ''}
                onChange={(c) => handlePropChange('arrowColor', c || undefined)}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Divider color</Label>
              <ColorPicker
                color={str(props.dividerColor) ?? '#e5e7eb'}
                onChange={(c) => handlePropChange('dividerColor', c)}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Content text color</Label>
              <ColorPicker
                color={str(props.contentColor) ?? ''}
                onChange={(c) => handlePropChange('contentColor', c || undefined)}
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Section spacing (px)</Label>
              <Input
                type="number"
                value={num(props.sectionSpacing) ?? 0}
                onChange={(e) => handlePropChange('sectionSpacing', parseInt(e.target.value, 10) || 0)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Sections</div>
              <p className="text-[10px] text-muted-foreground">
                Edit sections as JSON. Each: id, title, content, defaultExpanded.
              </p>
              <textarea
                value={JSON.stringify(
                  (props.sections as unknown[]) ?? [
                    { id: '1', title: 'Section 1', content: 'Content 1', defaultExpanded: true },
                    { id: '2', title: 'Section 2', content: 'Content 2' },
                    { id: '3', title: 'Section 3', content: 'Content 3' },
                  ],
                  null, 2
                )}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value || '[]');
                    if (Array.isArray(parsed)) handlePropChange('sections', parsed);
                  } catch { /* invalid json */ }
                }}
                className="w-full min-h-[120px] p-2 text-xs font-mono border rounded bg-background"
              />
            </div>
          </div>
        )}

        {/* ─── Carousel block ─── */}
        {block.type === 'carousel' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.autoPlay as boolean) ?? false}
                onCheckedChange={(v) => handlePropChange('autoPlay', v)}
              />
              <Label className="text-xs">Auto play</Label>
            </div>
            {(props.autoPlay as boolean) && (
              <div>
                <Label className="text-[10px] text-muted-foreground">Interval (ms)</Label>
                <Input
                  type="number"
                  value={num(props.autoPlayInterval) ?? 3000}
                  onChange={(e) => handlePropChange('autoPlayInterval', parseInt(e.target.value, 10) || 3000)}
                  className="h-7 text-xs"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.showArrows as boolean) ?? true}
                onCheckedChange={(v) => handlePropChange('showArrows', v)}
              />
              <Label className="text-xs">Show arrows</Label>
            </div>
            {(props.showArrows as boolean) !== false && (
              <div>
                <Label className="text-[10px] text-muted-foreground">Arrow color</Label>
                <ColorPicker
                  color={str(props.arrowsColor) ?? '#333'}
                  onChange={(c) => handlePropChange('arrowsColor', c)}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.showDots as boolean) ?? true}
                onCheckedChange={(v) => handlePropChange('showDots', v)}
              />
              <Label className="text-xs">Show dots</Label>
            </div>
            {(props.showDots as boolean) !== false && (
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Dot selected color</Label>
                  <ColorPicker
                    color={str(props.dotSelectedColor) ?? '#333'}
                    onChange={(c) => handlePropChange('dotSelectedColor', c)}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Dot unselected color</Label>
                  <ColorPicker
                    color={str(props.dotUnselectedColor) ?? '#ccc'}
                    onChange={(c) => handlePropChange('dotUnselectedColor', c)}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={(props.loop as boolean) ?? true}
                onCheckedChange={(v) => handlePropChange('loop', v)}
              />
              <Label className="text-xs">Loop</Label>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Slides</div>
              <p className="text-[10px] text-muted-foreground">
                Edit slides as JSON. Each: id, name, contentHtml, imageUrl.
              </p>
              <textarea
                value={JSON.stringify(
                  (props.slides as unknown[]) ?? [
                    { id: '1', name: 'Slide 1', contentHtml: '<p>Slide 1</p>' },
                    { id: '2', name: 'Slide 2', contentHtml: '<p>Slide 2</p>' },
                  ],
                  null, 2
                )}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value || '[]');
                    if (Array.isArray(parsed)) handlePropChange('slides', parsed);
                  } catch { /* invalid json */ }
                }}
                className="w-full min-h-[120px] p-2 text-xs font-mono border rounded bg-background"
              />
            </div>
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
              placeholder="<div>...</div> — Avoid inline scripts for security"
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
