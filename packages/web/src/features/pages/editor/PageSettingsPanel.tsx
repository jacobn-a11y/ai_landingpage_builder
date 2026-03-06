/**
 * Page-level settings: background, default fonts, custom CSS, SEO.
 */

import { useState } from 'react';
import { useEditor } from './EditorContext';
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

export function PageSettingsPanel() {
  const { pageSettings, updatePageSettings } = useEditor();
  const [showCss, setShowCss] = useState(false);

  return (
    <div className="space-y-4 p-3">
      <div className="text-xs font-medium text-muted-foreground">Page background</div>
      <ColorPicker
        label="Background color"
        value={pageSettings?.backgroundColor ?? '#ffffff'}
        onChange={(c) => updatePageSettings({ backgroundColor: c })}
      />
      <div className="space-y-2">
        <Label className="text-xs">Background image URL</Label>
        <Input value={pageSettings?.backgroundImage ?? ''} onChange={(e) => updatePageSettings({ backgroundImage: e.target.value || undefined })} placeholder="https://..." className="text-sm" />
      </div>
      {pageSettings?.backgroundImage && (
        <div className="space-y-2">
          <Label className="text-xs">Background size</Label>
          <Select value={pageSettings?.backgroundSize ?? 'cover'} onValueChange={(v) => updatePageSettings({ backgroundSize: v })}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="cover">Cover</SelectItem><SelectItem value="contain">Contain</SelectItem><SelectItem value="auto">Auto</SelectItem></SelectContent>
          </Select>
        </div>
      )}

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

      <div className="text-xs font-medium text-muted-foreground pt-2 border-t">Custom CSS</div>
      <button type="button" className="text-xs text-primary underline" onClick={() => setShowCss(!showCss)}>{showCss ? 'Hide CSS editor' : 'Show CSS editor'}</button>
      {showCss && (
        <textarea
          value={pageSettings?.customCss ?? ''}
          onChange={(e) => updatePageSettings({ customCss: e.target.value || undefined })}
          className="w-full min-h-[100px] p-2 text-xs font-mono border rounded bg-background"
          placeholder="/* Custom CSS for this page */&#10;.my-class { color: red; }"
        />
      )}

      <div className="text-xs font-medium text-muted-foreground pt-2 border-t">SEO</div>
      <div className="space-y-2">
        <Label className="text-xs">Meta description</Label>
        <Input value={pageSettings?.seoMetaDescription ?? ''} onChange={(e) => updatePageSettings({ seoMetaDescription: e.target.value || undefined })} placeholder="SEO description" className="text-sm" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Open Graph title</Label>
        <Input value={pageSettings?.seoOgTitle ?? ''} onChange={(e) => updatePageSettings({ seoOgTitle: e.target.value || undefined })} placeholder="og:title" className="text-sm" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Open Graph image URL</Label>
        <Input value={pageSettings?.seoOgImage ?? ''} onChange={(e) => updatePageSettings({ seoOgImage: e.target.value || undefined })} placeholder="https://..." className="text-sm" />
      </div>
    </div>
  );
}
