/**
 * Inspector for video blocks.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function VideoInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');

  return (
    <div className="space-y-4">
      <InspectorSection title="Video source">
        <div className="space-y-2">
          <Label className="text-xs">Provider</Label>
          <select
            value={str(props.provider) || 'youtube'}
            onChange={(e) => set('provider', e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="wistia">Wistia</option>
            <option value="custom">Custom URL</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Video URL</Label>
          <Input
            value={str(props.url)}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="h-8 text-sm"
          />
        </div>
      </InspectorSection>

      <InspectorSection title="Playback">
        <div className="flex items-center gap-2">
          <Switch
            checked={!!props.autoplay}
            onCheckedChange={(v) => set('autoplay', v)}
          />
          <Label className="text-xs">Autoplay</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={!!props.loop}
            onCheckedChange={(v) => set('loop', v)}
          />
          <Label className="text-xs">Loop</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={!!props.mute}
            onCheckedChange={(v) => set('mute', v)}
          />
          <Label className="text-xs">Mute</Label>
        </div>
      </InspectorSection>

      <InspectorSection title="Display">
        <div className="space-y-2">
          <Label className="text-xs">Aspect ratio</Label>
          <select
            value={str(props.aspectRatio) || '16:9'}
            onChange={(e) => set('aspectRatio', e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="1:1">1:1</option>
            <option value="21:9">21:9</option>
          </select>
        </div>
      </InspectorSection>
    </div>
  );
}
