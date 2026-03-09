/**
 * Inspector for carousel / slider blocks.
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

interface CarouselSlide {
  imageUrl?: string;
  heading?: string;
  description?: string;
}

export function CarouselInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

  const slides = (Array.isArray(props.slides) ? props.slides : []) as CarouselSlide[];

  const updateSlide = (idx: number, field: keyof CarouselSlide, value: string) => {
    const updated = slides.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
    set('slides', updated);
  };

  const addSlide = () => {
    set('slides', [...slides, { imageUrl: '', heading: 'Slide ' + (slides.length + 1), description: '' }]);
    setExpandedIdx(slides.length);
  };

  const removeSlide = (idx: number) => {
    set('slides', slides.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  return (
    <div className="space-y-4">
      <InspectorSection title="Slides">
        <div className="space-y-2">
          {slides.map((slide, idx) => (
            <div key={idx} className="rounded border border-border">
              <div
                className="flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-muted/50"
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs flex-1 truncate">{slide.heading || `Slide ${idx + 1}`}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); removeSlide(idx); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {expandedIdx === idx && (
                <div className="px-2 pb-2 space-y-2 border-t">
                  <div className="space-y-1 pt-2">
                    <Label className="text-xs">Image URL</Label>
                    <Input
                      value={slide.imageUrl ?? ''}
                      onChange={(e) => updateSlide(idx, 'imageUrl', e.target.value)}
                      className="h-7 text-xs"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Heading</Label>
                    <Input
                      value={slide.heading ?? ''}
                      onChange={(e) => updateSlide(idx, 'heading', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={slide.description ?? ''}
                      onChange={(e) => updateSlide(idx, 'description', e.target.value)}
                      className="min-h-[50px] text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={addSlide}>
            <Plus className="h-3 w-3 mr-1" /> Add slide
          </Button>
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
        {!!props.autoplay && (
          <div className="space-y-2">
            <Label className="text-xs">Interval (ms)</Label>
            <Input
              type="number"
              min={500}
              step={500}
              value={num(props.autoplayInterval) ?? 3000}
              onChange={(e) => set('autoplayInterval', e.target.value ? parseInt(e.target.value, 10) : 3000)}
              className="h-8 text-sm"
            />
          </div>
        )}
      </InspectorSection>

      <InspectorSection title="Navigation">
        <div className="flex items-center gap-2">
          <Switch
            checked={props.showArrows !== false}
            onCheckedChange={(v) => set('showArrows', v)}
          />
          <Label className="text-xs">Show arrows</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={props.showDots !== false}
            onCheckedChange={(v) => set('showDots', v)}
          />
          <Label className="text-xs">Show dots</Label>
        </div>
      </InspectorSection>

      <InspectorSection title="Colors" defaultOpen={false}>
        <div className="space-y-2">
          <Label className="text-xs">Arrow color</Label>
          <ColorPicker
            value={str(props.arrowColor)}
            onChange={(c) => set('arrowColor', c || undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Dot color</Label>
          <ColorPicker
            value={str(props.dotColor)}
            onChange={(c) => set('dotColor', c || undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Active dot color</Label>
          <ColorPicker
            value={str(props.activeDotColor)}
            onChange={(c) => set('activeDotColor', c || undefined)}
          />
        </div>
      </InspectorSection>
    </div>
  );
}
