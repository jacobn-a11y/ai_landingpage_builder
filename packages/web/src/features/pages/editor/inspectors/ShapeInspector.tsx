/**
 * Inspector for shape blocks (rectangle + circle).
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/ui/color-picker';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function ShapeInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;
  const isCircle = block.type === 'shapeCircle';

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

  return (
    <div className="space-y-4">
      <InspectorSection title="Dimensions">
        {isCircle ? (
          <div className="space-y-2">
            <Label className="text-xs">Size (px)</Label>
            <Input
              type="number"
              value={num(props.size) ?? 100}
              onChange={(e) => set('size', parseInt(e.target.value, 10) || 100)}
              className="h-8 text-sm"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                value={num(props.width) ?? 200}
                onChange={(e) => set('width', parseInt(e.target.value, 10) || 200)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Height</Label>
              <Input
                type="number"
                value={num(props.height) ?? 100}
                onChange={(e) => set('height', parseInt(e.target.value, 10) || 100)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </InspectorSection>

      <InspectorSection title="Fill">
        <div className="space-y-2">
          <Label className="text-xs">Fill color</Label>
          <ColorPicker
            value={str(props.fillColor) || '#e5e7eb'}
            onChange={(c) => set('fillColor', c)}
          />
        </div>
        {!isCircle && (
          <div className="space-y-2">
            <Label className="text-xs">Border radius</Label>
            <Input
              type="number"
              min={0}
              value={num(props.borderRadius) ?? 0}
              onChange={(e) => set('borderRadius', parseInt(e.target.value, 10) || 0)}
              className="h-8 text-sm"
            />
          </div>
        )}
      </InspectorSection>
    </div>
  );
}
