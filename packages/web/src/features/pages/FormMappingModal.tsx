import { useEffect, useState } from 'react';
import {
  api,
  type Page,
  type DetectedForm,
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

const CANONICAL_FIELDS = [
  { value: '__skip__', label: '— Skip —' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'title', label: 'Title' },
];

type FormMappingModalProps = {
  page: Page;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function FormMappingModal({
  page,
  open,
  onOpenChange,
  onSaved,
}: FormMappingModalProps) {
  const [forms, setForms] = useState<DetectedForm[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [successBehavior, setSuccessBehavior] = useState<string>('inline');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !page.id) return;
    setLoading(true);
    setError(null);
    api.pages
      .getDetectedForms(page.id)
      .then(({ forms: f }) => {
        setForms(f);
        setSelectedIndex(0);
        const initial: Record<string, string> = {};
        if (f[0]) {
          for (const field of f[0].fields) {
            const suggested = field.suggestedCanonical;
            if (suggested) initial[field.name] = suggested;
          }
        }
        setFieldMappings(initial);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, page.id]);

  useEffect(() => {
    const form = forms[selectedIndex];
    if (!form) return;
    const next: Record<string, string> = {};
    for (const field of form.fields) {
      next[field.name] = field.suggestedCanonical ?? '__skip__';
    }
    setFieldMappings(next);
  }, [selectedIndex, forms]);

  const form = forms[selectedIndex];
  const publishConfig = (page.publishConfig || {}) as {
    form?: { successBehavior?: string; redirectUrl?: string };
  };
  const existingForm = publishConfig.form;

  useEffect(() => {
    if (existingForm) {
      setSuccessBehavior(existingForm.successBehavior ?? 'inline');
      setRedirectUrl(existingForm.redirectUrl ?? '');
    }
  }, [existingForm]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const bindings: PageFormBinding[] = [
        {
          type: 'hooked',
          selector: form.selector,
          fieldMappings: Object.fromEntries(
            Object.entries(fieldMappings).filter(([, v]) => v && v !== '__skip__')
          ),
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
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Map form</DialogTitle>
          <DialogDescription>
            Select a detected form and map its fields to the canonical schema.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : forms.length === 0 ? (
          <p className="py-6 text-muted-foreground">
            No forms detected in this page. Add a Custom HTML block with a form, or use a native form block.
          </p>
        ) : (
          <div className="space-y-6 py-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

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

            {form && (
              <div className="space-y-3">
                <Label>Field mapping</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {form.fields.map((field) => (
                    <div
                      key={field.name}
                      className="flex items-center gap-2"
                    >
                      <span className="w-32 truncate text-sm text-muted-foreground">
                        {field.name}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <Select
                        value={fieldMappings[field.name] ?? '__skip__'}
                        onValueChange={(v) =>
                          setFieldMappings((prev) => ({
                            ...prev,
                            [field.name]: v,
                          }))
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Skip" />
                        </SelectTrigger>
                        <SelectContent>
                          {CANONICAL_FIELDS.map((opt) => (
                            <SelectItem key={opt.value || 'skip'} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label>Success behavior</Label>
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
                  placeholder="Redirect URL"
                  value={redirectUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRedirectUrl(e.target.value)}
                />
              )}
            </div>
          </div>
        )}

        {forms.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
