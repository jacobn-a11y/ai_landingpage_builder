import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type Page,
  type DetectedForm,
  type DetectedFormField,
  type PageFormBinding,
} from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/* ── Canonical fields ── */

const CANONICAL_FIELDS = [
  { value: '__skip__', label: '— Skip —' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'title', label: 'Title' },
  { value: 'custom', label: 'Custom field' },
];

/* ── Heuristic auto-mapping ── */

const HEURISTIC_MAP: Record<string, string> = {
  email: 'email',
  'e-mail': 'email',
  mail: 'email',
  phone: 'phone',
  tel: 'phone',
  telephone: 'phone',
  mobile: 'phone',
  first_name: 'first_name',
  firstname: 'first_name',
  fname: 'first_name',
  first: 'first_name',
  last_name: 'last_name',
  lastname: 'last_name',
  lname: 'last_name',
  last: 'last_name',
  company: 'company',
  organization: 'company',
  org: 'company',
  title: 'title',
  jobtitle: 'title',
  job_title: 'title',
  role: 'title',
};

function guessCanonical(field: DetectedFormField): string {
  if (field.suggestedCanonical) return field.suggestedCanonical;
  const key = (field.name || field.id || '').toLowerCase().replace(/[-\s]/g, '_');
  if (HEURISTIC_MAP[key]) return HEURISTIC_MAP[key];
  const label = (field.label || '').toLowerCase().replace(/[-\s]/g, '_');
  if (HEURISTIC_MAP[label]) return HEURISTIC_MAP[label];
  if (field.type === 'email') return 'email';
  if (field.type === 'tel') return 'phone';
  return '__skip__';
}

/* ── Props ── */

type FormMappingModalProps = {
  page: Page;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

/* ── Component ── */

export function FormMappingModal({
  page,
  open,
  onOpenChange,
  onSaved,
}: FormMappingModalProps) {
  const [forms, setForms] = useState<DetectedForm[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [successBehavior, setSuccessBehavior] = useState<string>('inline');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Fetch detected forms */
  useEffect(() => {
    if (!open || !page.id) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    api.pages
      .getDetectedForms(page.id)
      .then(({ forms: f }) => {
        setForms(f);
        setSelectedIndex(0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, page.id]);

  /* Sync mappings when selected form changes */
  useEffect(() => {
    const form = forms[selectedIndex];
    if (!form) return;
    const next: Record<string, string> = {};
    for (const field of form.fields) {
      next[field.name] = field.suggestedCanonical ?? '__skip__';
    }
    setFieldMappings(next);
    setCustomLabels({});
  }, [selectedIndex, forms]);

  /* Read existing publish config */
  const publishConfig = (page.publishConfig || {}) as {
    form?: { successBehavior?: string; redirectUrl?: string };
  };

  useEffect(() => {
    const existing = publishConfig.form;
    if (existing) {
      setSuccessBehavior(existing.successBehavior ?? 'inline');
      setRedirectUrl(existing.redirectUrl ?? '');
    }
  }, [publishConfig.form]);

  /* Map All handler */
  const handleMapAll = useCallback(() => {
    const form = forms[selectedIndex];
    if (!form) return;
    const next: Record<string, string> = {};
    for (const field of form.fields) {
      next[field.name] = guessCanonical(field);
    }
    setFieldMappings(next);
  }, [forms, selectedIndex]);

  /* Count mapped fields */
  const mappedCount = Object.values(fieldMappings).filter(
    (v) => v && v !== '__skip__'
  ).length;

  const form = forms[selectedIndex];

  /* Save handler */
  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      // Build field mappings, replacing 'custom' with custom:<label>
      const resolvedMappings: Record<string, string> = {};
      for (const [key, value] of Object.entries(fieldMappings)) {
        if (!value || value === '__skip__') continue;
        if (value === 'custom') {
          const label = customLabels[key]?.trim();
          resolvedMappings[key] = label ? `custom:${label}` : `custom:${key}`;
        } else {
          resolvedMappings[key] = value;
        }
      }
      const bindings: PageFormBinding[] = [
        {
          type: 'hooked',
          selector: form.selector,
          fieldMappings: resolvedMappings,
        },
      ];
      await api.pages.update(page.id, {
        formBindings: bindings,
        publishConfig: {
          ...publishConfig,
          form: {
            successBehavior,
            redirectUrl: successBehavior === 'redirect' ? redirectUrl : undefined,
          },
        },
      });
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ── */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Map form fields</DialogTitle>
          <DialogDescription>
            Map detected form fields to the canonical submission schema.
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium">Form mapping saved</p>
            <p className="text-xs text-muted-foreground">
              {mappedCount} field{mappedCount !== 1 ? 's' : ''} mapped. Publish
              the page to activate interception.
            </p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : forms.length === 0 ? (
          <p className="py-6 text-muted-foreground">
            No forms detected in this page. Add a Custom HTML block with a form,
            or use a native form block.
          </p>
        ) : (
          <div className="space-y-5 py-2">
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Form selector */}
            <div>
              <Label>Form</Label>
              <Select
                value={String(selectedIndex)}
                onValueChange={(v) => setSelectedIndex(Number(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((f, i) => (
                    <SelectItem key={i} value={String(i)}>
                      Form {i + 1} ({f.fields.length} fields)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Field mapping table */}
            {form && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Field mapping{' '}
                    <Badge variant="secondary" className="ml-1">
                      {mappedCount}/{form.fields.length}
                    </Badge>
                  </Label>
                  <Button variant="ghost" size="sm" onClick={handleMapAll}>
                    Map All
                  </Button>
                </div>
                <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-3">
                  {form.fields.map((field) => (
                    <FieldRow
                      key={field.name}
                      field={field}
                      mapping={fieldMappings[field.name] ?? '__skip__'}
                      customLabel={customLabels[field.name] ?? ''}
                      onMappingChange={(v) =>
                        setFieldMappings((prev) => ({ ...prev, [field.name]: v }))
                      }
                      onCustomLabelChange={(v) =>
                        setCustomLabels((prev) => ({ ...prev, [field.name]: v }))
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Success behavior */}
            <div className="space-y-2">
              <Label>After submission</Label>
              <Select value={successBehavior} onValueChange={setSuccessBehavior}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">Inline message</SelectItem>
                  <SelectItem value="redirect">Redirect</SelectItem>
                  <SelectItem value="modal">Modal</SelectItem>
                </SelectContent>
              </Select>
              {successBehavior === 'redirect' && (
                <Input
                  placeholder="https://example.com/thank-you"
                  value={redirectUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRedirectUrl(e.target.value)
                  }
                />
              )}
            </div>
          </div>
        )}

        {forms.length > 0 && !saved && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || mappedCount === 0}>
              {saving ? 'Saving...' : 'Save mapping'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Field row sub-component ── */

function FieldRow({
  field,
  mapping,
  customLabel,
  onMappingChange,
  onCustomLabelChange,
}: {
  field: DetectedFormField;
  mapping: string;
  customLabel: string;
  onMappingChange: (v: string) => void;
  onCustomLabelChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-32 truncate text-sm text-muted-foreground" title={field.name}>
          {field.label || field.name}
        </span>
        <span className="text-xs text-muted-foreground">&#8594;</span>
        <Select value={mapping} onValueChange={onMappingChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Skip" />
          </SelectTrigger>
          <SelectContent>
            {CANONICAL_FIELDS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {mapping === 'custom' && (
        <Input
          className="ml-[calc(8rem+1.5rem)]"
          placeholder="Custom field name"
          value={customLabel}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onCustomLabelChange(e.target.value)
          }
        />
      )}
    </div>
  );
}
