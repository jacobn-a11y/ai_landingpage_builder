/**
 * Inspector for countdown timer blocks.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function CountdownInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');

  return (
    <div className="space-y-4">
      <InspectorSection title="Target">
        <div className="space-y-2">
          <Label className="text-xs">Target date/time</Label>
          <Input
            type="datetime-local"
            value={str(props.targetDate).slice(0, 16)}
            onChange={(e) => set('targetDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
            className="h-8 text-sm"
          />
        </div>
      </InspectorSection>

      <InspectorSection title="Labels">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Days</Label>
            <Input
              value={str(props.daysLabel) || 'Days'}
              onChange={(e) => set('daysLabel', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hours</Label>
            <Input
              value={str(props.hoursLabel) || 'Hours'}
              onChange={(e) => set('hoursLabel', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Minutes</Label>
            <Input
              value={str(props.minutesLabel) || 'Minutes'}
              onChange={(e) => set('minutesLabel', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Seconds</Label>
            <Input
              value={str(props.secondsLabel) || 'Seconds'}
              onChange={(e) => set('secondsLabel', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </InspectorSection>
    </div>
  );
}
