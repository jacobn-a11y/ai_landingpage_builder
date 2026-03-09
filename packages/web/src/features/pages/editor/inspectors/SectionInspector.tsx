/**
 * Inspector for section blocks.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function SectionInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

  return (
    <div className="space-y-4">
      <InspectorSection title="Section">
        <div className="space-y-2">
          <Label className="text-xs">Max width</Label>
          <Input
            value={str(props.maxWidth) || ''}
            onChange={(e) => set('maxWidth', e.target.value || undefined)}
            className="h-8 text-sm"
            placeholder="1200px or 100%"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Padding (px)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Vertical</Label>
              <Input
                type="number"
                min={0}
                value={num(props.paddingVertical) ?? ''}
                onChange={(e) => set('paddingVertical', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="h-7 text-xs"
                placeholder="40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Horizontal</Label>
              <Input
                type="number"
                min={0}
                value={num(props.paddingHorizontal) ?? ''}
                onChange={(e) => set('paddingHorizontal', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="h-7 text-xs"
                placeholder="24"
              />
            </div>
          </div>
        </div>
      </InspectorSection>
    </div>
  );
}
