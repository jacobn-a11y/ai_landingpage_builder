/**
 * Inspector for image blocks.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function ImageInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');

  return (
    <div className="space-y-4">
      <InspectorSection title="Image">
        <div className="space-y-2">
          <Label className="text-xs">Image URL</Label>
          <Input
            value={str(props.src)}
            onChange={(e) => set('src', e.target.value)}
            placeholder="https://..."
            className="h-8 text-sm"
          />
        </div>
        {str(props.src) && (
          <div className="rounded border overflow-hidden">
            <img
              src={str(props.src)}
              alt={str(props.alt) || 'Preview'}
              className="w-full h-24 object-contain bg-muted"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs">Alt text</Label>
          <Input
            value={str(props.alt)}
            onChange={(e) => set('alt', e.target.value)}
            className="h-8 text-sm"
            placeholder="Descriptive alt text"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Object fit</Label>
          <select
            value={str(props.objectFit) || 'cover'}
            onChange={(e) => set('objectFit', e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
            <option value="none">None</option>
          </select>
        </div>
      </InspectorSection>

      <InspectorSection title="Link" defaultOpen={false}>
        <div className="space-y-2">
          <Label className="text-xs">Link URL</Label>
          <Input
            value={str(props.href)}
            onChange={(e) => set('href', e.target.value || undefined)}
            placeholder="https://..."
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={!!props.linkNewTab}
            onCheckedChange={(v) => set('linkNewTab', v)}
          />
          <Label className="text-xs">Open in new tab</Label>
        </div>
      </InspectorSection>
    </div>
  );
}
