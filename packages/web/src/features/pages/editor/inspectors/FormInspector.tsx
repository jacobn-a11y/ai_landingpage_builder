/**
 * Inspector for form blocks.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function FormInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');

  return (
    <div className="space-y-4">
      <InspectorSection title="Form settings">
        <div className="space-y-2">
          <Label className="text-xs">Form ID</Label>
          <Input
            value={str(props.formId)}
            onChange={(e) => set('formId', e.target.value)}
            placeholder="form-id"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Submit button text</Label>
          <Input
            value={str(props.submitText) || 'Submit'}
            onChange={(e) => set('submitText', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Success message</Label>
          <Input
            value={str(props.successMessage)}
            onChange={(e) => set('successMessage', e.target.value || undefined)}
            placeholder="Thank you for submitting!"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Redirect URL</Label>
          <Input
            value={str(props.redirectUrl)}
            onChange={(e) => set('redirectUrl', e.target.value || undefined)}
            placeholder="https://example.com/thank-you"
            className="h-8 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            If set, redirects after successful submission instead of showing message.
          </p>
        </div>
      </InspectorSection>
    </div>
  );
}
