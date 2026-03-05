import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface UniversalPropertiesSectionProps {
  props: Record<string, unknown>;
  onPropChange: (updates: Record<string, unknown>) => void;
  layoutMode?: 'fluid' | 'canvas';
  breakpoint?: 'desktop' | 'tablet' | 'mobile';
}

export function UniversalPropertiesSection({ props, onPropChange, layoutMode = 'fluid', breakpoint = 'desktop' }: UniversalPropertiesSectionProps) {
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
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Padding</Label>
          <Input
            type="number"
            value={num(props.paddingTop) ?? num(props.padding) ?? ''}
            onChange={(e) => {
              const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
              setAll({ paddingTop: v, paddingRight: v, paddingBottom: v, paddingLeft: v });
            }}
            className="h-7 text-xs"
            placeholder="—"
          />
        </div>
        <div>
          <Label className="text-xs">Border radius</Label>
          <Input
            type="number"
            value={num(props.borderRadius) ?? ''}
            onChange={(e) => set('borderRadius', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            className="h-7 text-xs"
            placeholder="—"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Background</Label>
        <Input
          type="text"
          value={str(props.backgroundColor) ?? ''}
          onChange={(e) => set('backgroundColor', e.target.value || undefined)}
          className="h-7 text-xs"
          placeholder="#fff or transparent"
        />
      </div>
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
