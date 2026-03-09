/**
 * Inspector for divider blocks.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/ui/color-picker';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function DividerInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

  return (
    <div className="space-y-4">
      <InspectorSection title="Divider">
        <div className="space-y-2">
          <Label className="text-xs">Orientation</Label>
          <select
            value={str(props.orientation) || 'horizontal'}
            onChange={(e) => set('orientation', e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Line color</Label>
          <ColorPicker
            value={str(props.lineColor) || '#e5e7eb'}
            onChange={(c) => set('lineColor', c || undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Thickness (px)</Label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={20}
              value={num(props.thickness) ?? 1}
              onChange={(e) => set('thickness', parseInt(e.target.value, 10))}
              className="flex-1"
            />
            <Input
              type="number"
              min={1}
              max={20}
              value={num(props.thickness) ?? 1}
              onChange={(e) => set('thickness', e.target.value ? parseInt(e.target.value, 10) : 1)}
              className="h-8 w-16 text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Style</Label>
          <select
            value={str(props.lineStyle) || 'solid'}
            onChange={(e) => set('lineStyle', e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Width (%)</Label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={100}
              value={num(props.widthPercent) ?? 100}
              onChange={(e) => set('widthPercent', parseInt(e.target.value, 10))}
              className="flex-1"
            />
            <Input
              type="number"
              min={10}
              max={100}
              value={num(props.widthPercent) ?? 100}
              onChange={(e) => set('widthPercent', e.target.value ? parseInt(e.target.value, 10) : 100)}
              className="h-8 w-16 text-sm"
            />
          </div>
        </div>
      </InspectorSection>
    </div>
  );
}
