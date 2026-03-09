/**
 * Layout controls for editing responsive layout properties per breakpoint.
 * Provides columns, gap, direction, wrap, alignment, and justify controls
 * with per-breakpoint tabs and "reset to inherit" capability.
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RotateCcw, Monitor, Tablet, Smartphone } from 'lucide-react';
import { resolveLayout, getExplicitProps } from './responsive-resolver';
import type { BlockLayout, LayoutProps } from './responsive-resolver';

type Breakpoint = 'desktop' | 'tablet' | 'mobile';

interface LayoutControlsProps {
  layout: BlockLayout | undefined;
  onChange: (layout: BlockLayout) => void;
}

const BREAKPOINTS: { key: Breakpoint; label: string; icon: typeof Monitor }[] = [
  { key: 'desktop', label: 'Desktop', icon: Monitor },
  { key: 'tablet', label: 'Tablet', icon: Tablet },
  { key: 'mobile', label: 'Mobile', icon: Smartphone },
];

const ALIGN_OPTIONS: { value: NonNullable<LayoutProps['align']>; label: string }[] = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
  { value: 'stretch', label: 'Stretch' },
];

const JUSTIFY_OPTIONS: { value: NonNullable<LayoutProps['justify']>; label: string }[] = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
  { value: 'between', label: 'Between' },
  { value: 'around', label: 'Around' },
  { value: 'evenly', label: 'Evenly' },
];

export function LayoutControls({ layout, onChange }: LayoutControlsProps) {
  const [activeBreakpoint, setActiveBreakpoint] = useState<Breakpoint>('desktop');

  const resolved = resolveLayout(layout, activeBreakpoint);
  const explicit = getExplicitProps(layout, activeBreakpoint);

  const setBpProp = (key: keyof LayoutProps, value: unknown) => {
    const current = layout ?? {};
    const bpLayout = current[activeBreakpoint] ?? {};
    onChange({
      ...current,
      [activeBreakpoint]: { ...bpLayout, [key]: value },
    });
  };

  const resetBpProp = (key: keyof LayoutProps) => {
    const current = layout ?? {};
    const bpLayout = { ...(current[activeBreakpoint] ?? {}) };
    delete bpLayout[key];
    const hasKeys = Object.keys(bpLayout).length > 0;
    onChange({
      ...current,
      [activeBreakpoint]: hasKeys ? bpLayout : undefined,
    });
  };

  const isInherited = (key: keyof LayoutProps) =>
    activeBreakpoint !== 'desktop' && !explicit.has(key);

  return (
    <div className="space-y-3">
      {/* Breakpoint tabs */}
      <div className="flex rounded-md border border-border overflow-hidden">
        {BREAKPOINTS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs transition-colors ${
              activeBreakpoint === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted text-muted-foreground'
            }`}
            onClick={() => setActiveBreakpoint(key)}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Columns */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Columns</Label>
          {isInherited('columns') ? (
            <span className="text-[10px] text-muted-foreground">inherited</span>
          ) : activeBreakpoint !== 'desktop' && explicit.has('columns') ? (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              onClick={() => resetBpProp('columns')}
            >
              <RotateCcw className="h-2.5 w-2.5" /> reset
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={12}
            value={resolved.columns}
            onChange={(e) => setBpProp('columns', parseInt(e.target.value, 10))}
            className="flex-1"
          />
          <span className="text-xs w-6 text-right">{resolved.columns}</span>
        </div>
        {/* Visual grid preview */}
        <div
          className="grid gap-1 mt-1"
          style={{ gridTemplateColumns: `repeat(${resolved.columns}, 1fr)` }}
        >
          {Array.from({ length: resolved.columns }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-primary/20 border border-primary/30" />
          ))}
        </div>
      </div>

      {/* Gap */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Gap (px)</Label>
          {isInherited('gap') ? (
            <span className="text-[10px] text-muted-foreground">inherited</span>
          ) : activeBreakpoint !== 'desktop' && explicit.has('gap') ? (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              onClick={() => resetBpProp('gap')}
            >
              <RotateCcw className="h-2.5 w-2.5" /> reset
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={64}
            value={resolved.gap}
            onChange={(e) => setBpProp('gap', parseInt(e.target.value, 10))}
            className="flex-1"
          />
          <Input
            type="number"
            min={0}
            value={resolved.gap}
            onChange={(e) => setBpProp('gap', e.target.value ? parseInt(e.target.value, 10) : 0)}
            className="h-7 w-14 text-xs"
          />
        </div>
      </div>

      {/* Direction toggle */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Direction</Label>
          {isInherited('direction') ? (
            <span className="text-[10px] text-muted-foreground">inherited</span>
          ) : activeBreakpoint !== 'desktop' && explicit.has('direction') ? (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              onClick={() => resetBpProp('direction')}
            >
              <RotateCcw className="h-2.5 w-2.5" /> reset
            </button>
          ) : null}
        </div>
        <div className="flex gap-1">
          {(['row', 'column'] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              className={`flex-1 h-7 rounded-md border text-xs capitalize ${
                resolved.direction === dir
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input bg-background hover:bg-muted'
              }`}
              onClick={() => setBpProp('direction', dir)}
            >
              {dir}
            </button>
          ))}
        </div>
      </div>

      {/* Wrap toggle */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Wrap</Label>
          {isInherited('wrap') ? (
            <span className="text-[10px] text-muted-foreground">inherited</span>
          ) : activeBreakpoint !== 'desktop' && explicit.has('wrap') ? (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              onClick={() => resetBpProp('wrap')}
            >
              <RotateCcw className="h-2.5 w-2.5" /> reset
            </button>
          ) : null}
        </div>
        <div className="flex gap-1">
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              type="button"
              className={`flex-1 h-7 rounded-md border text-xs ${
                resolved.wrap === val
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input bg-background hover:bg-muted'
              }`}
              onClick={() => setBpProp('wrap', val)}
            >
              {val ? 'Wrap' : 'No wrap'}
            </button>
          ))}
        </div>
      </div>

      {/* Align items */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Align items</Label>
          {isInherited('align') ? (
            <span className="text-[10px] text-muted-foreground">inherited</span>
          ) : activeBreakpoint !== 'desktop' && explicit.has('align') ? (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              onClick={() => resetBpProp('align')}
            >
              <RotateCcw className="h-2.5 w-2.5" /> reset
            </button>
          ) : null}
        </div>
        <div className="flex gap-1">
          {ALIGN_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`flex-1 h-7 rounded-md border text-[10px] ${
                resolved.align === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input bg-background hover:bg-muted'
              }`}
              onClick={() => setBpProp('align', value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Justify content */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Justify content</Label>
          {isInherited('justify') ? (
            <span className="text-[10px] text-muted-foreground">inherited</span>
          ) : activeBreakpoint !== 'desktop' && explicit.has('justify') ? (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              onClick={() => resetBpProp('justify')}
            >
              <RotateCcw className="h-2.5 w-2.5" /> reset
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {JUSTIFY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`h-7 rounded-md border text-[10px] ${
                resolved.justify === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input bg-background hover:bg-muted'
              }`}
              onClick={() => setBpProp('justify', value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
