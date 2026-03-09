/**
 * Inspector for spacer blocks.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function SpacerInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

  return (
    <div className="space-y-4">
      <InspectorSection title="Spacer">
        <div className="space-y-2">
          <Label className="text-xs">Height (px)</Label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={200}
              value={num(props.height) ?? 24}
              onChange={(e) => set('height', parseInt(e.target.value, 10))}
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              max={500}
              value={num(props.height) ?? 24}
              onChange={(e) => set('height', e.target.value ? parseInt(e.target.value, 10) : 24)}
              className="h-8 w-16 text-sm"
            />
          </div>
        </div>
      </InspectorSection>
    </div>
  );
}
