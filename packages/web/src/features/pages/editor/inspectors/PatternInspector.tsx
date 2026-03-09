/**
 * Inspector for pattern blocks (hero, features, testimonials, faq, logos).
 * These are composite blocks that primarily use universal properties.
 */

import { Label } from '@/components/ui/label';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function PatternInspector({ block }: InspectorProps) {
  return (
    <div className="space-y-4">
      <InspectorSection title="Pattern block">
        <div className="space-y-2">
          <Label className="text-xs">Type</Label>
          <div className="text-sm text-muted-foreground capitalize">{block.type}</div>
          <p className="text-[10px] text-muted-foreground">
            This is a composite pattern block. Edit child blocks individually by selecting them, or use the universal style controls below.
          </p>
        </div>
      </InspectorSection>
    </div>
  );
}
