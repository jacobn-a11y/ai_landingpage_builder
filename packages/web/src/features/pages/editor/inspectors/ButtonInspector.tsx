/**
 * Inspector for button blocks.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from '@/components/ui/color-picker';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function ButtonInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

  return (
    <div className="space-y-4">
      <InspectorSection title="Button">
        <div className="space-y-2">
          <Label className="text-xs">Text</Label>
          <Input
            value={str(props.text) || 'Button'}
            onChange={(e) => set('text', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Link URL</Label>
          <Input
            value={str(props.href) || '#'}
            onChange={(e) => set('href', e.target.value)}
            className="h-8 text-sm"
            placeholder="https://..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={!!props.openNewTab}
            onCheckedChange={(v) => set('openNewTab', v)}
          />
          <Label className="text-xs">Open in new tab</Label>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Aria label</Label>
          <Input
            value={str(props.ariaLabel)}
            onChange={(e) => set('ariaLabel', e.target.value || undefined)}
            className="h-8 text-sm"
            placeholder="Accessible label"
          />
        </div>
      </InspectorSection>

      <InspectorSection title="Typography">
        <div className="space-y-2">
          <Label className="text-xs">Font family</Label>
          <Input
            value={str(props.fontFamily)}
            onChange={(e) => set('fontFamily', e.target.value || undefined)}
            className="h-8 text-sm"
            placeholder="Inter, sans-serif"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Font size</Label>
            <Input
              type="number"
              value={num(props.fontSize) ?? ''}
              onChange={(e) => set('fontSize', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="h-8 text-sm"
              placeholder="16"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Font weight</Label>
            <select
              value={str(props.fontWeight) || '600'}
              onChange={(e) => set('fontWeight', e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="400">400 - Normal</option>
              <option value="500">500 - Medium</option>
              <option value="600">600 - Semibold</option>
              <option value="700">700 - Bold</option>
            </select>
          </div>
        </div>
      </InspectorSection>

      <InspectorSection title="Colors">
        <div className="space-y-2">
          <Label className="text-xs">Background color</Label>
          <ColorPicker
            value={str(props.buttonBgColor)}
            onChange={(c) => set('buttonBgColor', c || undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Hover background</Label>
          <ColorPicker
            value={str(props.buttonHoverBgColor)}
            onChange={(c) => set('buttonHoverBgColor', c || undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Text color</Label>
          <ColorPicker
            value={str(props.buttonTextColor)}
            onChange={(c) => set('buttonTextColor', c || undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Hover text color</Label>
          <ColorPicker
            value={str(props.buttonHoverTextColor)}
            onChange={(c) => set('buttonHoverTextColor', c || undefined)}
          />
        </div>
      </InspectorSection>
    </div>
  );
}
