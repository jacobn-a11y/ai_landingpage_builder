/**
 * Inspector for paragraph blocks.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from '@/components/ui/color-picker';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function ParagraphInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

  return (
    <div className="space-y-4">
      <InspectorSection title="Content">
        <div className="space-y-2">
          <Label className="text-xs">Text</Label>
          <Textarea
            value={str(props.content)}
            onChange={(e) => set('content', e.target.value)}
            className="min-h-[80px] text-sm"
            placeholder="Paragraph text..."
          />
          <p className="text-[10px] text-muted-foreground">
            Use {`{{param}}`} for URL params, e.g. {`{{name}}`}
          </p>
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
              value={str(props.fontWeight) || '400'}
              onChange={(e) => set('fontWeight', e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="100">100 - Thin</option>
              <option value="200">200 - Extra Light</option>
              <option value="300">300 - Light</option>
              <option value="400">400 - Normal</option>
              <option value="500">500 - Medium</option>
              <option value="600">600 - Semibold</option>
              <option value="700">700 - Bold</option>
              <option value="800">800 - Extra Bold</option>
              <option value="900">900 - Black</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Line height</Label>
            <Input
              type="number"
              step="0.1"
              value={num(props.lineHeight) ?? ''}
              onChange={(e) => set('lineHeight', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-8 text-sm"
              placeholder="1.5"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Letter spacing</Label>
            <Input
              type="number"
              step="0.1"
              value={num(props.letterSpacing) ?? ''}
              onChange={(e) => set('letterSpacing', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="h-8 text-sm"
              placeholder="0"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Text transform</Label>
          <select
            value={str(props.textTransform) || 'none'}
            onChange={(e) => set('textTransform', e.target.value === 'none' ? undefined : e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="none">None</option>
            <option value="uppercase">UPPERCASE</option>
            <option value="lowercase">lowercase</option>
            <option value="capitalize">Capitalize</option>
          </select>
        </div>
      </InspectorSection>

      <InspectorSection title="Color & alignment">
        <div className="space-y-2">
          <Label className="text-xs">Text color</Label>
          <ColorPicker
            value={str(props.textColor)}
            onChange={(c) => set('textColor', c || undefined)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Text align</Label>
          <div className="flex gap-1">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={`flex-1 h-8 rounded-md border text-xs capitalize ${
                  (str(props.textAlign) || 'left') === a
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input bg-background hover:bg-muted'
                }`}
                onClick={() => set('textAlign', a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Link color</Label>
          <ColorPicker
            value={str(props.linkColor)}
            onChange={(c) => set('linkColor', c || undefined)}
          />
        </div>
      </InspectorSection>
    </div>
  );
}
