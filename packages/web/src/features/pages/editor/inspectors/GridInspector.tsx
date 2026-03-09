/**
 * Inspector for grid blocks.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function GridInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

  return (
    <div className="space-y-4">
      <InspectorSection title="Grid layout">
        <div className="space-y-2">
          <Label className="text-xs">Columns (1-12)</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={num(props.columns) ?? 2}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              set('columns', v >= 1 && v <= 12 ? v : 2);
            }}
            className="h-8 text-sm"
          />
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${num(props.columns) ?? 2}, 1fr)` }}>
            {Array.from({ length: num(props.columns) ?? 2 }).map((_, i) => (
              <div key={i} className="h-6 rounded bg-muted border border-border" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Gap (px)</Label>
          <Input
            type="number"
            min={0}
            value={num(props.gap) ?? 16}
            onChange={(e) => set('gap', e.target.value ? parseInt(e.target.value, 10) : 16)}
            className="h-8 text-sm"
          />
        </div>
      </InspectorSection>
    </div>
  );
}
