import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import type { FormFieldSchema, FormSchemaConfig } from '@/lib/api';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File upload' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'hidden', label: 'Hidden' },
] as const;

interface FormBuilderProps {
  name: string;
  onNameChange: (name: string) => void;
  fields: FormFieldSchema[];
  onFieldsChange: (fields: FormFieldSchema[]) => void;
  config?: FormSchemaConfig;
  onConfigChange?: (config: FormSchemaConfig) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saveLabel?: string;
  loading?: boolean;
}

function generateId() {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function FormBuilder({
  name,
  onNameChange,
  fields,
  onFieldsChange,
  config = {},
  onConfigChange,
  onSave,
  onCancel,
  saveLabel = 'Save',
  loading = false,
}: FormBuilderProps) {
  const [editingOptions, setEditingOptions] = useState<string | null>(null);
  const [optionsText, setOptionsText] = useState('');

  const addField = (type: string) => {
    const maxStep = Math.max(0, ...fields.map((f) => f.stepIndex ?? 0));
    const newField: FormFieldSchema = {
      id: generateId(),
      type,
      label: type === 'hidden' ? '' : type.charAt(0).toUpperCase() + type.slice(1),
      required: type !== 'hidden' && type !== 'file',
      options: ['dropdown', 'radio'].includes(type) ? ['Option 1', 'Option 2'] : undefined,
      stepIndex: config?.stepNames?.length ? maxStep : undefined,
    };
    onFieldsChange([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormFieldSchema>) => {
    onFieldsChange(
      fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeField = (id: string) => {
    onFieldsChange(fields.filter((f) => f.id !== id));
  };

  const openOptionsEditor = (field: FormFieldSchema) => {
    setEditingOptions(field.id);
    setOptionsText((field.options ?? []).join('\n'));
  };

  const saveOptions = (fieldId: string) => {
    const opts = optionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    updateField(fieldId, { options: opts.length > 0 ? opts : undefined });
    setEditingOptions(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-2 block">Form name</label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Contact Form"
        />
      </div>

      {(config || onConfigChange) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Form settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {onConfigChange && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Submit button text</label>
                  <Input
                    value={config?.buttonText ?? 'Submit'}
                    onChange={(e) => onConfigChange({ ...config, buttonText: e.target.value })}
                    placeholder="Submit"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Button style</label>
                  <Select
                    value={config?.buttonStyle ?? 'primary'}
                    onValueChange={(v: 'primary' | 'outline' | 'secondary') =>
                      onConfigChange({ ...config, buttonStyle: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Multi-step (step names, one per line)</label>
                  <textarea
                    className="w-full min-h-[60px] rounded-md border px-3 py-2 text-sm"
                    value={(config?.stepNames ?? []).join('\n')}
                    onChange={(e) =>
                      onConfigChange({
                        ...config,
                        stepNames: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Step 1\nStep 2\nStep 3"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Fields</CardTitle>
          <div className="flex flex-wrap gap-1">
            {FIELD_TYPES.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addField(value)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No fields yet. Add fields using the buttons above.
            </p>
          ) : (
            fields.map((field) => (
              <div
                key={field.id}
                className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30"
              >
                <GripVertical className="h-4 w-4 mt-2 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  {field.type !== 'hidden' && (
                    <Input
                      placeholder="Label"
                      value={field.label ?? ''}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      className="font-medium"
                    />
                  )}
                  <div className="flex flex-wrap gap-2 items-center">
                    {config?.stepNames?.length && (
                      <Select
                        value={String(field.stepIndex ?? 0)}
                        onValueChange={(v) => updateField(field.id, { stepIndex: parseInt(v, 10) })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {config.stepNames.map((name, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {name || `Step ${i + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Select
                      value={field.type}
                      onValueChange={(v) =>
                        updateField(field.id, {
                          type: v,
                          options: ['dropdown', 'radio'].includes(v)
                            ? field.options ?? ['Option 1', 'Option 2']
                            : undefined,
                          accept: v === 'file' ? (field as { accept?: string }).accept : undefined,
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.type !== 'hidden' && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required ?? false}
                          onChange={(e) =>
                            updateField(field.id, { required: e.target.checked })
                          }
                        />
                        Required
                      </label>
                    )}
                    {field.type === 'file' && (
                      <div className="flex-1 min-w-0">
                        <Input
                          placeholder="Accept (e.g. image/*,.pdf)"
                          value={(field as { accept?: string }).accept ?? ''}
                          onChange={(e) => updateField(field.id, { accept: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    )}
                    {['dropdown', 'radio'].includes(field.type) && (
                      <>
                        {editingOptions === field.id ? (
                          <div className="flex-1 min-w-0">
                            <textarea
                              className="w-full min-h-[60px] rounded-md border px-3 py-2 text-sm"
                              value={optionsText}
                              onChange={(e) => setOptionsText(e.target.value)}
                              placeholder="One option per line"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-1"
                              onClick={() => saveOptions(field.id)}
                            >
                              Done
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openOptionsEditor(field)}
                          >
                            Edit options ({field.options?.length ?? 0})
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive shrink-0"
                  onClick={() => removeField(field.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={loading || !name.trim()}>
          {loading ? 'Saving...' : saveLabel}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
