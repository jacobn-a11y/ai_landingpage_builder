/**
 * Page-level settings: title, slug, background, fonts, custom CSS, SEO, layout mode.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useEditor } from './EditorContext';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FONT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Open Sans', sans-serif", label: 'Open Sans' },
  { value: "'Lato', sans-serif", label: 'Lato' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Playfair Display', serif", label: 'Playfair Display' },
  { value: "'Merriweather', serif", label: 'Merriweather' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
  { value: 'monospace', label: 'Monospace' },
];

const WEIGHT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
];

function FontSelect({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-7 px-2 text-xs border rounded bg-background">
      {FONT_OPTIONS.map((o) => <option key={o.value || 'default'} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function WeightSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-7 px-2 text-xs border rounded bg-background">
      {WEIGHT_OPTIONS.map((o) => <option key={o.value || 'default'} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ── Debounced field that saves page name/slug via API ── */

function PageMetaField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = useCallback(
    (v: string) => {
      setLocal(v);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSave(v), 800);
    },
    [onSave]
  );

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => { if (local !== value) onSave(local); }}
        placeholder={placeholder}
        className="text-sm h-8"
      />
    </div>
  );
}

export function PageSettingsPanel() {
  const {
    pageId,
    page,
    pageSettings,
    updatePageSettings,
    layoutMode,
    setLayoutMode,
  } = useEditor();
  const { showError } = useToast();
  const [showCss, setShowCss] = useState(false);

  const savePageMeta = useCallback(
    async (data: { name?: string; slug?: string }) => {
      try {
        await api.pages.update(pageId, data);
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Failed to update');
      }
    },
    [pageId, showError]
  );

  return (
    <div className="space-y-4 p-3">
      {/* ── Page identity ── */}
      <div className="text-xs font-medium text-muted-foreground">Page info</div>
      <PageMetaField
        label="Page title"
        value={page?.name ?? ''}
        placeholder="My Landing Page"
        onSave={(v) => savePageMeta({ name: v })}
      />
      <PageMetaField
        label="URL slug"
        value={page?.slug ?? ''}
        placeholder="my-landing-page"
        onSave={(v) => savePageMeta({ slug: v })}
      />

      {/* ── Layout mode ── */}
      <div className="text-xs font-medium text-muted-foreground pt-2 border-t">Layout mode</div>
      <div className="flex gap-1">
        <button
          type="button"
          className={`flex-1 text-xs py-1.5 rounded border transition-colors ${layoutMode === 'fluid' ? 'bg-primary/10 border-primary text-primary font-medium' : 'border-border hover:bg-muted'}`}
          onClick={() => setLayoutMode('fluid')}
        >
          Fluid grid
        </button>
        <button
          type="button"
          className={`flex-1 text-xs py-1.5 rounded border transition-colors ${layoutMode === 'canvas' ? 'bg-primary/10 border-primary text-primary font-medium' : 'border-border hover:bg-muted'}`}
          onClick={() => setLayoutMode('canvas')}
        >
          Freeform
        </button>
      </div>

      {/* ── Background ── */}
      <div className="text-xs font-medium text-muted-foreground pt-2 border-t">Page background</div>
      <ColorPicker
        label="Background color"
        value={pageSettings?.backgroundColor ?? '#ffffff'}
        onChange={(c) => updatePageSettings({ backgroundColor: c })}
      />
      <div className="space-y-1">
        <Label className="text-xs">Background image URL</Label>
        <Input value={pageSettings?.backgroundImage ?? ''} onChange={(e) => updatePageSettings({ backgroundImage: e.target.value || undefined })} placeholder="https://..." className="text-sm h-8" />
      </div>
      {pageSettings?.backgroundImage && (
        <div className="space-y-1">
          <Label className="text-xs">Background size</Label>
          <Select value={pageSettings?.backgroundSize ?? 'cover'} onValueChange={(v) => updatePageSettings({ backgroundSize: v })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="contain">Contain</SelectItem>
              <SelectItem value="auto">Auto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Default fonts ── */}
      <div className="text-xs font-medium text-muted-foreground pt-2 border-t">Default fonts</div>
      <div className="space-y-2">
        <Label className="text-xs">Page font</Label>
        <FontSelect id="page-font" value={pageSettings?.fontFamily ?? ''} onChange={(v) => updatePageSettings({ fontFamily: v || undefined })} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Headline font</Label>
        <div className="grid grid-cols-2 gap-1">
          <FontSelect id="headline-font" value={pageSettings?.headlineFontFamily ?? ''} onChange={(v) => updatePageSettings({ headlineFontFamily: v || undefined })} />
          <WeightSelect value={pageSettings?.headlineFontWeight ?? ''} onChange={(v) => updatePageSettings({ headlineFontWeight: v || undefined })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Paragraph font</Label>
        <div className="grid grid-cols-2 gap-1">
          <FontSelect id="paragraph-font" value={pageSettings?.paragraphFontFamily ?? ''} onChange={(v) => updatePageSettings({ paragraphFontFamily: v || undefined })} />
          <WeightSelect value={pageSettings?.paragraphFontWeight ?? ''} onChange={(v) => updatePageSettings({ paragraphFontWeight: v || undefined })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Button font</Label>
        <div className="grid grid-cols-2 gap-1">
          <FontSelect id="button-font" value={pageSettings?.buttonFontFamily ?? ''} onChange={(v) => updatePageSettings({ buttonFontFamily: v || undefined })} />
          <WeightSelect value={pageSettings?.buttonFontWeight ?? ''} onChange={(v) => updatePageSettings({ buttonFontWeight: v || undefined })} />
        </div>
      </div>

      {/* ── Body CSS class ── */}
      <div className="text-xs font-medium text-muted-foreground pt-2 border-t">Advanced</div>
      <div className="space-y-1">
        <Label className="text-xs">Body CSS class</Label>
        <Input
          value={pageSettings?.bodyClassName ?? ''}
          onChange={(e) => updatePageSettings({ bodyClassName: e.target.value || undefined })}
          placeholder="e.g. dark-theme landing-v2"
          className="text-sm h-8 font-mono"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Favicon URL</Label>
        <Input
          value={pageSettings?.faviconUrl ?? ''}
          onChange={(e) => updatePageSettings({ faviconUrl: e.target.value || undefined })}
          placeholder="https://example.com/favicon.ico"
          className="text-sm h-8"
        />
      </div>

      {/* ── Custom CSS ── */}
      <div className="text-xs font-medium text-muted-foreground pt-2 border-t">Custom CSS</div>
      <button type="button" className="text-xs text-primary underline" onClick={() => setShowCss(!showCss)}>
        {showCss ? 'Hide CSS editor' : 'Show CSS editor'}
      </button>
      {showCss && (
        <textarea
          value={pageSettings?.customCss ?? ''}
          onChange={(e) => updatePageSettings({ customCss: e.target.value || undefined })}
          className="w-full min-h-[100px] p-2 text-xs font-mono border rounded bg-background"
          placeholder="/* Custom CSS for this page */&#10;.my-class { color: red; }"
        />
      )}

      {/* ── SEO ── */}
      <div className="text-xs font-medium text-muted-foreground pt-2 border-t">SEO</div>
      <div className="space-y-1">
        <Label className="text-xs">Meta description</Label>
        <Input value={pageSettings?.seoMetaDescription ?? ''} onChange={(e) => updatePageSettings({ seoMetaDescription: e.target.value || undefined })} placeholder="SEO description" className="text-sm h-8" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Open Graph title</Label>
        <Input value={pageSettings?.seoOgTitle ?? ''} onChange={(e) => updatePageSettings({ seoOgTitle: e.target.value || undefined })} placeholder="og:title" className="text-sm h-8" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Open Graph image URL</Label>
        <Input value={pageSettings?.seoOgImage ?? ''} onChange={(e) => updatePageSettings({ seoOgImage: e.target.value || undefined })} placeholder="https://..." className="text-sm h-8" />
      </div>
    </div>
  );
}
