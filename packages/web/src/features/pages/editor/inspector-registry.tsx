import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EditorBlock } from './types';

export interface InspectorRenderContext {
  props: Record<string, unknown>;
  onPropChange: (keyOrUpdates: string | Record<string, unknown>, value?: unknown) => void;
}

type InspectorRenderer = (ctx: InspectorRenderContext) => ReactNode;

function numberValue(value: string, fallback?: number): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return n;
}

function floatValue(value: string, fallback?: number): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return n;
}

const FORM_FIELD_TYPES = [
  'text',
  'email',
  'phone',
  'number',
  'date',
  'textarea',
  'dropdown',
  'checkbox',
  'radio',
  'hidden',
  'file',
] as const;

function detectVideoProvider(url: string): 'youtube' | 'vimeo' | 'wistia' | 'custom' {
  const normalized = url.toLowerCase();
  if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) return 'youtube';
  if (normalized.includes('vimeo.com')) return 'vimeo';
  if (normalized.includes('wistia.com')) return 'wistia';
  return 'custom';
}

const textInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <>
    <div className="space-y-2">
      <Label htmlFor="prop-content" className="text-xs">Content (plain)</Label>
      <Input
        id="prop-content"
        value={(props.content as string) ?? ''}
        onChange={(e) => onPropChange('content', e.target.value)}
        className="text-sm"
        placeholder="Use toolbar when selected for rich text"
      />
      <p className="text-[10px] text-muted-foreground">Use {`{{param}}`} for URL params, e.g. {`{{name}}`}</p>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-xs">Font family</Label>
        <Input
          value={(props.fontFamily as string) ?? ''}
          onChange={(e) => onPropChange('fontFamily', e.target.value || undefined)}
          placeholder="Inter, Georgia..."
          className="text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Font weight</Label>
        <Input
          value={(props.fontWeight as string) ?? ''}
          onChange={(e) => onPropChange('fontWeight', e.target.value || undefined)}
          placeholder="400, 600, 700"
          className="text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Font size</Label>
        <Input
          type="number"
          value={(props.fontSize as number) ?? ''}
          onChange={(e) => onPropChange('fontSize', numberValue(e.target.value))}
          className="text-sm"
          placeholder="16"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Line height</Label>
        <Input
          type="number"
          value={(props.lineHeight as number) ?? ''}
          onChange={(e) => onPropChange('lineHeight', floatValue(e.target.value))}
          className="text-sm"
          placeholder="1.4"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Letter spacing</Label>
        <Input
          type="number"
          value={(props.letterSpacing as number) ?? ''}
          onChange={(e) => onPropChange('letterSpacing', floatValue(e.target.value))}
          className="text-sm"
          placeholder="0"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Text color</Label>
        <Input
          value={(props.textColor as string) ?? ''}
          onChange={(e) => onPropChange('textColor', e.target.value || undefined)}
          className="text-sm"
          placeholder="#0f172a"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Link color</Label>
        <Input
          value={(props.linkColor as string) ?? ''}
          onChange={(e) => onPropChange('linkColor', e.target.value || undefined)}
          className="text-sm"
          placeholder="#2563eb"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Align</Label>
        <Select
          value={(props.textAlign as string) ?? 'left'}
          onValueChange={(v) => onPropChange('textAlign', v)}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="justify">Justify</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="space-y-1">
      <Label className="text-xs">Transform</Label>
      <Select
        value={(props.textTransform as string) ?? 'none'}
        onValueChange={(v) => onPropChange('textTransform', v)}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="uppercase">Uppercase</SelectItem>
          <SelectItem value="lowercase">Lowercase</SelectItem>
          <SelectItem value="capitalize">Capitalize</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </>
);

const headlineInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <div className="space-y-2">
    {textInspector({ props, onPropChange })}
    <div className="space-y-2">
      <Label className="text-xs">Heading level</Label>
      <Select
        value={(props.headingLevel as string) ?? 'h2'}
        onValueChange={(v) => onPropChange('headingLevel', v)}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="h1">H1</SelectItem>
          <SelectItem value="h2">H2</SelectItem>
          <SelectItem value="h3">H3</SelectItem>
          <SelectItem value="h4">H4</SelectItem>
          <SelectItem value="h5">H5</SelectItem>
          <SelectItem value="h6">H6</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

const imageInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <>
    <div className="space-y-2">
      <Label htmlFor="prop-src" className="text-xs">Image URL</Label>
      <Input
        id="prop-src"
        value={(props.src as string) ?? ''}
        onChange={(e) => onPropChange('src', e.target.value)}
        placeholder="https://..."
        className="text-sm"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="prop-alt" className="text-xs">Alt text</Label>
      <Input
        id="prop-alt"
        value={(props.alt as string) ?? ''}
        onChange={(e) => onPropChange('alt', e.target.value)}
        className="text-sm"
      />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Fit mode</Label>
      <Select
        value={(props.objectFit as string) ?? 'contain'}
        onValueChange={(v) => onPropChange('objectFit', v)}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="contain">Contain</SelectItem>
          <SelectItem value="cover">Cover</SelectItem>
          <SelectItem value="fill">Fill</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label htmlFor="prop-link-href" className="text-xs">Image link URL</Label>
      <Input
        id="prop-link-href"
        value={(props.linkHref as string) ?? ''}
        onChange={(e) => onPropChange('linkHref', e.target.value)}
        className="text-sm"
        placeholder="https://..."
      />
    </div>
    <div className="flex items-center gap-2">
      <Switch checked={(props.linkNewTab as boolean) ?? false} onCheckedChange={(v) => onPropChange('linkNewTab', v)} />
      <Label className="text-xs">Open image link in new tab</Label>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-2">
        <Label className="text-xs">Radius</Label>
        <Input
          type="number"
          value={(props.borderRadius as number) ?? 0}
          onChange={(e) => onPropChange('borderRadius', numberValue(e.target.value, 0) ?? 0)}
          className="text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Opacity (%)</Label>
        <Input
          type="number"
          value={(props.opacity as number) ?? 100}
          onChange={(e) => onPropChange('opacity', numberValue(e.target.value, 100) ?? 100)}
          className="text-sm"
        />
      </div>
    </div>
  </>
);

const buttonInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <>
    <div className="space-y-2">
      <Label htmlFor="prop-text" className="text-xs">Button text</Label>
      <Input
        id="prop-text"
        value={(props.text as string) ?? 'Button'}
        onChange={(e) => onPropChange('text', e.target.value)}
        className="text-sm"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="prop-href" className="text-xs">Link URL</Label>
      <Input
        id="prop-href"
        value={(props.href as string) ?? '#'}
        onChange={(e) => onPropChange('href', e.target.value)}
        className="text-sm"
      />
    </div>
    <div className="flex items-center gap-2">
      <Switch checked={(props.openNewTab as boolean) ?? false} onCheckedChange={(v) => onPropChange('openNewTab', v)} />
      <Label className="text-xs">Open in new tab</Label>
    </div>
    <div className="space-y-2">
      <Label htmlFor="prop-aria-label" className="text-xs">ARIA label</Label>
      <Input
        id="prop-aria-label"
        value={(props.ariaLabel as string) ?? ''}
        onChange={(e) => onPropChange('ariaLabel', e.target.value)}
        className="text-sm"
      />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Button background color</Label>
      <Input value={(props.buttonBgColor as string) ?? ''} onChange={(e) => onPropChange('buttonBgColor', e.target.value)} className="text-sm" placeholder="#0f172a" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Button hover background</Label>
      <Input value={(props.buttonHoverBgColor as string) ?? ''} onChange={(e) => onPropChange('buttonHoverBgColor', e.target.value)} className="text-sm" placeholder="#1e293b" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Button text color</Label>
      <Input value={(props.buttonTextColor as string) ?? ''} onChange={(e) => onPropChange('buttonTextColor', e.target.value)} className="text-sm" placeholder="#ffffff" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Button hover text color</Label>
      <Input value={(props.buttonHoverTextColor as string) ?? ''} onChange={(e) => onPropChange('buttonHoverTextColor', e.target.value)} className="text-sm" placeholder="#ffffff" />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-2">
        <Label className="text-xs">Border width</Label>
        <Input
          type="number"
          value={(props.buttonBorderWidth as number) ?? 0}
          onChange={(e) => onPropChange('buttonBorderWidth', numberValue(e.target.value, 0) ?? 0)}
          className="text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Border radius</Label>
        <Input
          type="number"
          value={(props.buttonRadius as number) ?? 6}
          onChange={(e) => onPropChange('buttonRadius', numberValue(e.target.value, 6) ?? 6)}
          className="text-sm"
        />
      </div>
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Border style</Label>
      <Select
        value={(props.buttonBorderStyle as string) ?? 'solid'}
        onValueChange={(v) => onPropChange('buttonBorderStyle', v)}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="solid">Solid</SelectItem>
          <SelectItem value="dashed">Dashed</SelectItem>
          <SelectItem value="dotted">Dotted</SelectItem>
          <SelectItem value="none">None</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Border color</Label>
      <Input value={(props.buttonBorderColor as string) ?? ''} onChange={(e) => onPropChange('buttonBorderColor', e.target.value)} className="text-sm" placeholder="#334155" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Shadow</Label>
      <Input value={(props.buttonShadow as string) ?? ''} onChange={(e) => onPropChange('buttonShadow', e.target.value)} className="text-sm" placeholder="0 6px 18px rgba(0,0,0,0.2)" />
    </div>
  </>
);

const dividerInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <div className="space-y-2">
    <Label className="text-xs">Orientation</Label>
    <Select
      value={(props.orientation as string) ?? 'horizontal'}
      onValueChange={(v) => onPropChange('orientation', v)}
    >
      <SelectTrigger className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="horizontal">Horizontal</SelectItem>
        <SelectItem value="vertical">Vertical</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

const spacerInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <div className="space-y-2">
    <Label htmlFor="prop-height" className="text-xs">Height (px)</Label>
    <Input
      id="prop-height"
      type="number"
      value={(props.height as number) ?? 24}
      onChange={(e) => onPropChange('height', numberValue(e.target.value, 24) ?? 24)}
      className="text-sm"
    />
  </div>
);

const videoInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <>
    <div className="space-y-2">
      <Label className="text-xs">Provider</Label>
      <Select
        value={(props.provider as string) ?? 'youtube'}
        onValueChange={(v) => onPropChange('provider', v)}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="youtube">YouTube</SelectItem>
          <SelectItem value="vimeo">Vimeo</SelectItem>
          <SelectItem value="wistia">Wistia</SelectItem>
          <SelectItem value="custom">Custom URL</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label htmlFor="prop-url" className="text-xs">Video URL</Label>
      <div className="flex gap-2">
        <Input
          id="prop-url"
          value={(props.url as string) ?? ''}
          onChange={(e) => onPropChange('url', e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="text-sm"
        />
        <button
          type="button"
          className="rounded border px-2 text-[10px] hover:bg-muted"
          onClick={() => onPropChange('provider', detectVideoProvider((props.url as string) ?? ''))}
        >
          Detect
        </button>
      </div>
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Video title (a11y)</Label>
      <Input
        value={(props.title as string) ?? ''}
        onChange={(e) => onPropChange('title', e.target.value)}
        placeholder="Customer story video"
        className="text-sm"
      />
    </div>
    <div className="flex items-center gap-2">
      <Switch checked={(props.autoplay as boolean) ?? false} onCheckedChange={(v) => onPropChange('autoplay', v)} />
      <Label className="text-xs">Autoplay</Label>
    </div>
    <div className="flex items-center gap-2">
      <Switch checked={(props.mute as boolean) ?? false} onCheckedChange={(v) => onPropChange('mute', v)} />
      <Label className="text-xs">Mute</Label>
    </div>
    <div className="flex items-center gap-2">
      <Switch checked={(props.loop as boolean) ?? false} onCheckedChange={(v) => onPropChange('loop', v)} />
      <Label className="text-xs">Loop</Label>
    </div>
    <div className="flex items-center gap-2">
      <Switch checked={(props.showControls as boolean) ?? true} onCheckedChange={(v) => onPropChange('showControls', v)} />
      <Label className="text-xs">Show controls</Label>
    </div>
  </>
);

const shapeRectangleInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <>
    <div className="space-y-2">
      <Label className="text-xs">Width</Label>
      <Input type="number" value={(props.width as number) ?? 200} onChange={(e) => onPropChange('width', numberValue(e.target.value, 200) ?? 200)} className="text-sm" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Height</Label>
      <Input type="number" value={(props.height as number) ?? 100} onChange={(e) => onPropChange('height', numberValue(e.target.value, 100) ?? 100)} className="text-sm" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Fill color</Label>
      <Input type="text" value={(props.fillColor as string) ?? '#e5e7eb'} onChange={(e) => onPropChange('fillColor', e.target.value)} placeholder="#e5e7eb" className="text-sm" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Border radius</Label>
      <Input type="number" value={(props.borderRadius as number) ?? 0} onChange={(e) => onPropChange('borderRadius', numberValue(e.target.value, 0) ?? 0)} className="text-sm" />
    </div>
  </>
);

const shapeCircleInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <>
    <div className="space-y-2">
      <Label className="text-xs">Size (px)</Label>
      <Input type="number" value={(props.size as number) ?? 100} onChange={(e) => onPropChange('size', numberValue(e.target.value, 100) ?? 100)} className="text-sm" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Fill color</Label>
      <Input type="text" value={(props.fillColor as string) ?? '#e5e7eb'} onChange={(e) => onPropChange('fillColor', e.target.value)} placeholder="#e5e7eb" className="text-sm" />
    </div>
  </>
);

const countdownInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <>
    <div className="space-y-2">
      <Label className="text-xs">Target date/time</Label>
      <Input
        type="datetime-local"
        value={(props.targetDate as string)?.slice(0, 16) ?? ''}
        onChange={(e) => onPropChange('targetDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
        className="text-sm"
      />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Days label</Label>
      <Input value={(props.daysLabel as string) ?? 'Days'} onChange={(e) => onPropChange('daysLabel', e.target.value)} className="text-sm" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Hours label</Label>
      <Input value={(props.hoursLabel as string) ?? 'Hours'} onChange={(e) => onPropChange('hoursLabel', e.target.value)} className="text-sm" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Minutes label</Label>
      <Input value={(props.minutesLabel as string) ?? 'Mins'} onChange={(e) => onPropChange('minutesLabel', e.target.value)} className="text-sm" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Seconds label</Label>
      <Input value={(props.secondsLabel as string) ?? 'Secs'} onChange={(e) => onPropChange('secondsLabel', e.target.value)} className="text-sm" />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Numbers color</Label>
      <Input
        value={(props.numberColor as string) ?? ''}
        onChange={(e) => onPropChange('numberColor', e.target.value || undefined)}
        className="text-sm"
        placeholder="#111827"
      />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Labels color</Label>
      <Input
        value={(props.labelColor as string) ?? ''}
        onChange={(e) => onPropChange('labelColor', e.target.value || undefined)}
        className="text-sm"
        placeholder="#6b7280"
      />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Background color</Label>
      <Input
        value={(props.backgroundColor as string) ?? ''}
        onChange={(e) => onPropChange('backgroundColor', e.target.value || undefined)}
        className="text-sm"
        placeholder="#f8fafc"
      />
    </div>
    <div className="space-y-2">
      <Label className="text-xs">Label position</Label>
      <Select
        value={(props.labelPosition as string) ?? 'below'}
        onValueChange={(v) => onPropChange('labelPosition', v)}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="below">Below numbers</SelectItem>
          <SelectItem value="above">Above numbers</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </>
);

const tableInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Switch checked={(props.hasHeader as boolean) ?? true} onCheckedChange={(v) => onPropChange('hasHeader', v)} />
      <Label className="text-xs">Header row</Label>
    </div>
    <Label className="text-xs">Table data (JSON)</Label>
    <Textarea
      value={JSON.stringify((props.rows as string[][]) ?? [['H1', 'H2'], ['C1', 'C2']], null, 2)}
      onChange={(e) => {
        try {
          const parsed = JSON.parse(e.target.value || '[]');
          if (Array.isArray(parsed)) onPropChange('rows', parsed as string[][]);
        } catch {
          // Keep editor resilient while user types invalid JSON.
        }
      }}
      className="min-h-[80px] font-mono text-sm"
    />
  </div>
);

const formInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <div className="space-y-2">
    <Label htmlFor="prop-formId" className="text-xs">Form ID</Label>
    <Input
      id="prop-formId"
      value={(props.formId as string) ?? ''}
      onChange={(e) => onPropChange('formId', e.target.value)}
      placeholder="form-id"
      className="text-sm"
    />
    <Label htmlFor="prop-submit-text" className="text-xs">Submit text</Label>
    <Input
      id="prop-submit-text"
      value={(props.submitText as string) ?? 'Submit'}
      onChange={(e) => onPropChange('submitText', e.target.value)}
      className="text-sm"
    />
    <Label htmlFor="prop-success-msg" className="text-xs">Success message</Label>
    <Input
      id="prop-success-msg"
      value={(props.successMessage as string) ?? ''}
      onChange={(e) => onPropChange('successMessage', e.target.value)}
      className="text-sm"
    />
    <Label htmlFor="prop-redirect-url" className="text-xs">Redirect URL</Label>
    <Input
      id="prop-redirect-url"
      value={(props.redirectUrl as string) ?? ''}
      onChange={(e) => onPropChange('redirectUrl', e.target.value)}
      className="text-sm"
      placeholder="https://..."
    />
    <Label className="text-xs">Quick add fields</Label>
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        className="rounded border px-2 py-1 text-[10px] hover:bg-muted"
        onClick={() => {
          const current = Array.isArray(props.fields) ? [...(props.fields as Record<string, unknown>[])] : [];
          onPropChange('fields', [...current, { id: 'name', type: 'text', label: 'Name', placeholder: 'Your name', required: true }]);
        }}
      >
        + Name
      </button>
      <button
        type="button"
        className="rounded border px-2 py-1 text-[10px] hover:bg-muted"
        onClick={() => {
          const current = Array.isArray(props.fields) ? [...(props.fields as Record<string, unknown>[])] : [];
          onPropChange('fields', [...current, { id: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true }]);
        }}
      >
        + Email
      </button>
      <button
        type="button"
        className="rounded border px-2 py-1 text-[10px] hover:bg-muted"
        onClick={() => {
          const current = Array.isArray(props.fields) ? [...(props.fields as Record<string, unknown>[])] : [];
          onPropChange('fields', [...current, { id: 'phone', type: 'phone', label: 'Phone', placeholder: '(555) 555-5555' }]);
        }}
      >
        + Phone
      </button>
      <button
        type="button"
        className="rounded border px-2 py-1 text-[10px] hover:bg-muted"
        onClick={() => {
          const current = Array.isArray(props.fields) ? [...(props.fields as Record<string, unknown>[])] : [];
          onPropChange('fields', [...current, { id: 'consent', type: 'checkbox', label: 'I agree to receive updates', required: true }]);
        }}
      >
        + Consent
      </button>
    </div>
    <Label className="text-xs">Field builder</Label>
    <div className="space-y-2 rounded border p-2">
      {(Array.isArray(props.fields) ? (props.fields as Record<string, unknown>[]) : []).map((field, index, arr) => {
        const f = (field ?? {}) as Record<string, unknown>;
        const updateAt = (updates: Record<string, unknown>) => {
          const next = [...arr];
          next[index] = { ...f, ...updates };
          onPropChange('fields', next);
        };
        const move = (to: number) => {
          if (to < 0 || to >= arr.length) return;
          const next = [...arr];
          const [item] = next.splice(index, 1);
          next.splice(to, 0, item);
          onPropChange('fields', next);
        };
        const remove = () => {
          const next = arr.filter((_, i) => i !== index);
          onPropChange('fields', next);
        };
        return (
          <div key={String(f.id ?? index)} className="rounded border p-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={String(f.id ?? '')}
                onChange={(e) => updateAt({ id: e.target.value })}
                placeholder="field_id"
                className="h-8 text-xs"
              />
              <Input
                value={String(f.label ?? '')}
                onChange={(e) => updateAt({ label: e.target.value })}
                placeholder="Field label"
                className="h-8 text-xs"
              />
              <Select
                value={String(f.type ?? 'text')}
                onValueChange={(v) => updateAt({ type: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORM_FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={String(f.placeholder ?? '')}
                onChange={(e) => updateAt({ placeholder: e.target.value })}
                placeholder="Placeholder"
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={Boolean(f.required)} onCheckedChange={(v) => updateAt({ required: v })} />
                Required
              </label>
              <div className="flex gap-1">
                <button type="button" className="rounded border px-2 py-1 text-[10px] hover:bg-muted" onClick={() => move(index - 1)}>Up</button>
                <button type="button" className="rounded border px-2 py-1 text-[10px] hover:bg-muted" onClick={() => move(index + 1)}>Down</button>
                <button type="button" className="rounded border px-2 py-1 text-[10px] text-destructive hover:bg-destructive/10" onClick={remove}>Remove</button>
              </div>
            </div>
          </div>
        );
      })}
      {(Array.isArray(props.fields) ? (props.fields as Record<string, unknown>[]).length : 0) === 0 && (
        <p className="text-[11px] text-muted-foreground">No custom fields yet. Use quick add or JSON.</p>
      )}
    </div>
    <Label htmlFor="prop-form-fields" className="text-xs">Fields (JSON)</Label>
    <Textarea
      id="prop-form-fields"
      className="min-h-[110px] text-xs font-mono"
      value={JSON.stringify((props.fields as Record<string, unknown>[]) ?? [], null, 2)}
      onChange={(e) => {
        try {
          const parsed = JSON.parse(e.target.value || '[]');
          if (Array.isArray(parsed)) onPropChange('fields', parsed);
        } catch {
          // Keep editor resilient while typing JSON.
        }
      }}
      placeholder='[{"id":"email","type":"email","label":"Email","required":true}]'
    />
  </div>
);

const customHtmlInspector: InspectorRenderer = ({ props, onPropChange }) => (
  <div className="space-y-2">
    <Label htmlFor="prop-html" className="text-xs">HTML</Label>
    <Textarea
      id="prop-html"
      value={(props.html as string) ?? ''}
      onChange={(e) => onPropChange('html', e.target.value)}
      className="min-h-[80px] font-mono text-sm"
      placeholder="<div>...</div>"
    />
  </div>
);

const INSPECTOR_REGISTRY: Partial<Record<EditorBlock['type'], InspectorRenderer>> = {
  text: textInspector,
  headline: headlineInspector,
  paragraph: textInspector,
  image: imageInspector,
  button: buttonInspector,
  divider: dividerInspector,
  spacer: spacerInspector,
  video: videoInspector,
  shapeRectangle: shapeRectangleInspector,
  shapeCircle: shapeCircleInspector,
  countdown: countdownInspector,
  table: tableInspector,
  form: formInspector,
  customHtml: customHtmlInspector,
};

export function renderBlockInspectorFields(
  blockType: EditorBlock['type'],
  ctx: InspectorRenderContext
): ReactNode {
  const renderer = INSPECTOR_REGISTRY[blockType];
  return renderer ? renderer(ctx) : null;
}
