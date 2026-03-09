/**
 * Inspector for accordion blocks.
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from '@/components/ui/color-picker';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

interface AccordionItem {
  title: string;
  content: string;
}

export function AccordionInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

  const sections = (Array.isArray(props.sections) ? props.sections : []) as AccordionItem[];

  const updateSection = (idx: number, field: keyof AccordionItem, value: string) => {
    const updated = sections.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
    set('sections', updated);
  };

  const addSection = () => {
    set('sections', [...sections, { title: 'New item', content: 'Content here...' }]);
    setExpandedIdx(sections.length);
  };

  const removeSection = (idx: number) => {
    set('sections', sections.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  return (
    <div className="space-y-4">
      <InspectorSection title="Sections">
        <div className="space-y-2">
          {sections.map((section, idx) => (
            <div key={idx} className="rounded border border-border">
              <div
                className="flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-muted/50"
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs flex-1 truncate">{section.title || `Item ${idx + 1}`}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); removeSection(idx); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {expandedIdx === idx && (
                <div className="px-2 pb-2 space-y-2 border-t">
                  <div className="space-y-1 pt-2">
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(idx, 'title', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Content</Label>
                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(idx, 'content', e.target.value)}
                      className="min-h-[60px] text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={addSection}>
            <Plus className="h-3 w-3 mr-1" /> Add item
          </Button>
        </div>
      </InspectorSection>

      <InspectorSection title="Behavior">
        <div className="flex items-center gap-2">
          <Switch
            checked={!!props.allowMultiple}
            onCheckedChange={(v) => set('allowMultiple', v)}
          />
          <Label className="text-xs">Allow multiple open</Label>
        </div>
      </InspectorSection>

      <InspectorSection title="Styling" defaultOpen={false}>
        <div className="space-y-2">
          <Label className="text-xs">Title font size</Label>
          <Input
            type="number"
            value={num(props.titleFontSize) ?? ''}
            onChange={(e) => set('titleFontSize', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            className="h-8 text-sm"
            placeholder="16"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Title color</Label>
          <ColorPicker
            value={str(props.titleColor)}
            onChange={(c) => set('titleColor', c || undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Content font size</Label>
          <Input
            type="number"
            value={num(props.contentFontSize) ?? ''}
            onChange={(e) => set('contentFontSize', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            className="h-8 text-sm"
            placeholder="14"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Content color</Label>
          <ColorPicker
            value={str(props.contentColor)}
            onChange={(c) => set('contentColor', c || undefined)}
          />
        </div>
      </InspectorSection>
    </div>
  );
}
