import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ColorPicker } from '@/components/ui/color-picker';
import { Link2, Unlink2 } from 'lucide-react';

interface UniversalPropertiesSectionProps {
  props: Record<string, unknown>;
  onPropChange: (updates: Record<string, unknown>) => void;
  layoutMode?: 'fluid' | 'canvas';
  breakpoint?: 'desktop' | 'tablet' | 'mobile';
}

export function UniversalPropertiesSection({ props, onPropChange, layoutMode = 'fluid', breakpoint = 'desktop' }: UniversalPropertiesSectionProps) {
  const [paddingLinked, setPaddingLinked] = useState(true);
  const [radiusLinked, setRadiusLinked] = useState(true);

  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const set = (key: string, value: string | number | undefined) =>
    onPropChange({ [key]: value });
  const setAll = (updates: Record<string, unknown>) => onPropChange(updates);
  const setOverride = (bp: 'desktop' | 'tablet' | 'mobile', key: string, value: string | number | boolean | undefined) => {
    const overrides = (props.overrides as Record<string, Record<string, unknown>>) ?? {};
    const bpOverrides = overrides[bp] ?? {};
    if (value === undefined) {
      const { [key]: _, ...rest } = bpOverrides;
      onPropChange({ overrides: { ...overrides, [bp]: Object.keys(rest).length ? rest : undefined } });
    } else {
      onPropChange({ overrides: { ...overrides, [bp]: { ...bpOverrides, [key]: value } } });
    }
  };

  const overrides = (props.overrides as Record<string, Record<string, unknown>>) ?? {};
  const bpOverride = overrides[breakpoint] ?? {};

  return (
    <div className="space-y-3 pt-3 border-t">
      <div className="space-y-2">
        <Label className="text-xs">Show when (URL param)</Label>
        <Input
          value={str(props.showWhen) ?? ''}
          onChange={(e) => set('showWhen', e.target.value || undefined)}
          className="h-7 text-xs"
          placeholder="param=value or param"
        />
        <p className="text-[10px] text-muted-foreground">
          e.g. &quot;variant&quot; or &quot;variant=premium&quot;
        </p>
      </div>
      <div className="text-xs font-medium text-muted-foreground">Layout & style</div>
      {breakpoint !== 'desktop' && (
        <div className="flex items-center gap-2">
          <Switch
            checked={!!bpOverride.hidden}
            onCheckedChange={(v) => setOverride(breakpoint, 'hidden', v ? true : undefined)}
          />
          <Label className="text-xs">Hide on {breakpoint}</Label>
        </div>
      )}
      {layoutMode === 'canvas' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">X</Label>
            <Input
              type="number"
              value={num(props.x) ?? ''}
              onChange={(e) => set('x', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="h-7 text-xs"
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-xs">Y</Label>
            <Input
              type="number"
              value={num(props.y) ?? ''}
              onChange={(e) => set('y', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="h-7 text-xs"
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              value={num(props.width) ?? ''}
              onChange={(e) => set('width', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="h-7 text-xs"
              placeholder="200"
            />
          </div>
          <div>
            <Label className="text-xs">Height</Label>
            <Input
              type="number"
              value={num(props.height) ?? ''}
              onChange={(e) => set('height', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="h-7 text-xs"
              placeholder="80"
            />
          </div>
        </div>
      )}

      {/* Margin */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Margin T</Label>
          <Input
            type="number"
            value={num(props.marginTop) ?? ''}
            onChange={(e) => set('marginTop', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            className="h-7 text-xs"
            placeholder="—"
          />
        </div>
        <div>
          <Label className="text-xs">Margin R</Label>
          <Input
            type="number"
            value={num(props.marginRight) ?? ''}
            onChange={(e) => set('marginRight', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            className="h-7 text-xs"
            placeholder="—"
          />
        </div>
        <div>
          <Label className="text-xs">Margin B</Label>
          <Input
            type="number"
            value={num(props.marginBottom) ?? ''}
            onChange={(e) => set('marginBottom', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            className="h-7 text-xs"
            placeholder="—"
          />
        </div>
        <div>
          <Label className="text-xs">Margin L</Label>
          <Input
            type="number"
            value={num(props.marginLeft) ?? ''}
            onChange={(e) => set('marginLeft', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            className="h-7 text-xs"
            placeholder="—"
          />
        </div>
      </div>

      {/* Padding with linked toggle */}
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <Label className="text-xs">Padding</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => setPaddingLinked(!paddingLinked)}
            title={paddingLinked ? 'Unlink sides' : 'Link all sides'}
          >
            {paddingLinked ? <Link2 className="h-3 w-3" /> : <Unlink2 className="h-3 w-3" />}
          </Button>
        </div>
        {paddingLinked ? (
          <Input
            type="number"
            value={num(props.paddingTop) ?? ''}
            onChange={(e) => {
              const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
              setAll({ paddingTop: v, paddingRight: v, paddingBottom: v, paddingLeft: v });
            }}
            className="h-7 text-xs"
            placeholder="—"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Top</Label>
              <Input type="number" value={num(props.paddingTop) ?? ''} onChange={(e) => set('paddingTop', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-7 text-xs" placeholder="—" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Right</Label>
              <Input type="number" value={num(props.paddingRight) ?? ''} onChange={(e) => set('paddingRight', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-7 text-xs" placeholder="—" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Bottom</Label>
              <Input type="number" value={num(props.paddingBottom) ?? ''} onChange={(e) => set('paddingBottom', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-7 text-xs" placeholder="—" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Left</Label>
              <Input type="number" value={num(props.paddingLeft) ?? ''} onChange={(e) => set('paddingLeft', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-7 text-xs" placeholder="—" />
            </div>
          </div>
        )}
      </div>

      {/* Background color */}
      <div className="space-y-1">
        <Label className="text-xs">Background</Label>
        <ColorPicker
          color={str(props.backgroundColor) ?? ''}
          onChange={(c) => set('backgroundColor', c || undefined)}
        />
      </div>

      {/* Border */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Border</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Width</Label>
            <Input
              type="number"
              value={num(props.borderWidth) ?? ''}
              onChange={(e) => set('borderWidth', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="h-7 text-xs"
              placeholder="0"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Style</Label>
            <Select
              value={str(props.borderStyle) ?? 'solid'}
              onValueChange={(v) => set('borderStyle', v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Color</Label>
          <ColorPicker
            color={str(props.borderColor) ?? ''}
            onChange={(c) => set('borderColor', c || undefined)}
          />
        </div>
      </div>

      {/* Border radius with linked toggle */}
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <Label className="text-xs">Border radius</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={() => setRadiusLinked(!radiusLinked)}
            title={radiusLinked ? 'Unlink corners' : 'Link all corners'}
          >
            {radiusLinked ? <Link2 className="h-3 w-3" /> : <Unlink2 className="h-3 w-3" />}
          </Button>
        </div>
        {radiusLinked ? (
          <Input
            type="number"
            value={num(props.borderRadius) ?? ''}
            onChange={(e) => {
              const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
              setAll({
                borderRadius: v,
                borderTopLeftRadius: undefined,
                borderTopRightRadius: undefined,
                borderBottomRightRadius: undefined,
                borderBottomLeftRadius: undefined,
              });
            }}
            className="h-7 text-xs"
            placeholder="—"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">TL</Label>
              <Input type="number" value={num(props.borderTopLeftRadius) ?? ''} onChange={(e) => set('borderTopLeftRadius', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-7 text-xs" placeholder="—" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">TR</Label>
              <Input type="number" value={num(props.borderTopRightRadius) ?? ''} onChange={(e) => set('borderTopRightRadius', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-7 text-xs" placeholder="—" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">BL</Label>
              <Input type="number" value={num(props.borderBottomLeftRadius) ?? ''} onChange={(e) => set('borderBottomLeftRadius', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-7 text-xs" placeholder="—" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">BR</Label>
              <Input type="number" value={num(props.borderBottomRightRadius) ?? ''} onChange={(e) => set('borderBottomRightRadius', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="h-7 text-xs" placeholder="—" />
            </div>
          </div>
        )}
      </div>

      {/* Opacity */}
      <div className="space-y-1">
        <Label className="text-xs">Opacity</Label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={num(props.opacity) ?? 100}
            onChange={(e) => set('opacity', parseInt(e.target.value, 10))}
            className="flex-1"
          />
          <span className="text-xs w-8 text-right">{num(props.opacity) ?? 100}%</span>
        </div>
      </div>

      {/* Drop shadow */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={num(props.boxShadowBlur) != null}
            onCheckedChange={(v) => {
              if (v) {
                setAll({ boxShadowOffsetX: 0, boxShadowOffsetY: 2, boxShadowBlur: 8, boxShadowSpread: 0, boxShadowColor: 'rgba(0,0,0,0.2)' });
              } else {
                setAll({ boxShadowOffsetX: undefined, boxShadowOffsetY: undefined, boxShadowBlur: undefined, boxShadowSpread: undefined, boxShadowColor: undefined });
              }
            }}
          />
          <Label className="text-xs">Drop shadow</Label>
        </div>
        {num(props.boxShadowBlur) != null && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">X</Label>
              <Input type="number" value={num(props.boxShadowOffsetX) ?? 0} onChange={(e) => set('boxShadowOffsetX', parseInt(e.target.value, 10) || 0)} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Y</Label>
              <Input type="number" value={num(props.boxShadowOffsetY) ?? 0} onChange={(e) => set('boxShadowOffsetY', parseInt(e.target.value, 10) || 0)} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Blur</Label>
              <Input type="number" value={num(props.boxShadowBlur) ?? 0} onChange={(e) => set('boxShadowBlur', parseInt(e.target.value, 10) || 0)} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Spread</Label>
              <Input type="number" value={num(props.boxShadowSpread) ?? 0} onChange={(e) => set('boxShadowSpread', parseInt(e.target.value, 10) || 0)} className="h-7 text-xs" />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] text-muted-foreground">Shadow color</Label>
              <ColorPicker
                color={str(props.boxShadowColor) ?? 'rgba(0,0,0,0.2)'}
                onChange={(c) => set('boxShadowColor', c)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Device visibility */}
      <div className="space-y-1">
        <Label className="text-xs">Visible on</Label>
        <Select
          value={str(props.visibleOn) ?? 'all'}
          onValueChange={(v) => set('visibleOn', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All devices</SelectItem>
            <SelectItem value="desktop">Desktop only</SelectItem>
            <SelectItem value="tablet">Tablet only</SelectItem>
            <SelectItem value="mobile">Mobile only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Z-index */}
      <div>
        <Label className="text-xs">Z-index</Label>
        <Input
          type="number"
          value={num(props.zIndex) ?? ''}
          onChange={(e) => set('zIndex', e.target.value ? parseInt(e.target.value, 10) : undefined)}
          className="h-7 text-xs"
          placeholder="0"
        />
      </div>

      {layoutMode !== 'canvas' && (
        <div>
          <Label className="text-xs">Width</Label>
          <Input
            type="text"
            value={props.width != null ? String(props.width) : ''}
            onChange={(e) => set('width', e.target.value || undefined)}
            className="h-7 text-xs"
            placeholder="100% or 200"
          />
        </div>
      )}
    </div>
  );
}
