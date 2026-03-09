/**
 * Page-level settings: background, fonts, SEO.
 */

import { useEditor } from './EditorContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'system-ui, sans-serif', label: 'System' },
  { value: 'monospace', label: 'Monospace' },
];

export function PageSettingsPanel() {
  const { pageSettings, updatePageSettings } = useEditor();

  return (
    <div className="space-y-4 p-3">
      <div className="text-xs font-medium text-muted-foreground">Page settings</div>
      <div className="space-y-2">
        <Label htmlFor="page-bg" className="text-xs">Background color</Label>
        <Input
          id="page-bg"
          value={pageSettings?.backgroundColor ?? ''}
          onChange={(e) => updatePageSettings({ backgroundColor: e.target.value || undefined })}
          placeholder="#ffffff"
          className="text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="page-font" className="text-xs">Default font</Label>
        <Select
          value={pageSettings?.fontFamily ?? '__default__'}
          onValueChange={(v) => updatePageSettings({ fontFamily: v === '__default__' ? undefined : v })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((o) => (
              <SelectItem key={o.value || 'default'} value={o.value || '__default__'}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="page-seo-desc" className="text-xs">Meta description</Label>
        <Input
          id="page-seo-desc"
          value={pageSettings?.seoMetaDescription ?? ''}
          onChange={(e) => updatePageSettings({ seoMetaDescription: e.target.value || undefined })}
          placeholder="SEO description"
          className="text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="page-og-title" className="text-xs">Open Graph title</Label>
        <Input
          id="page-og-title"
          value={pageSettings?.seoOgTitle ?? ''}
          onChange={(e) => updatePageSettings({ seoOgTitle: e.target.value || undefined })}
          placeholder="og:title"
          className="text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="page-og-image" className="text-xs">Open Graph image URL</Label>
        <Input
          id="page-og-image"
          value={pageSettings?.seoOgImage ?? ''}
          onChange={(e) => updatePageSettings({ seoOgImage: e.target.value || undefined })}
          placeholder="https://..."
          className="text-sm"
        />
      </div>
    </div>
  );
}
