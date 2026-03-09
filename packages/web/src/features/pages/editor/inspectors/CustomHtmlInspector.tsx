/**
 * Inspector for custom HTML blocks.
 */

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function CustomHtmlInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');

  return (
    <div className="space-y-4">
      <InspectorSection title="HTML">
        <div className="space-y-2">
          <Label className="text-xs">HTML code</Label>
          <Textarea
            value={str(props.html)}
            onChange={(e) => set('html', e.target.value)}
            className="min-h-[200px] font-mono text-xs"
            placeholder="<div>...</div>"
            spellCheck={false}
          />
          <p className="text-[10px] text-muted-foreground">
            Raw HTML will be rendered as-is. Use with caution.
          </p>
        </div>
      </InspectorSection>
    </div>
  );
}
