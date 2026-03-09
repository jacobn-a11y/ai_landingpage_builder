import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';
import type { PageFormBinding } from '@/lib/api';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'dropdown' | 'checkbox' | 'radio' | 'hidden' | 'number' | 'date' | 'file';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface BlockFormProps {
  id: string;
  formId?: string;
  formBindings?: PageFormBinding[];
  fields?: Record<string, unknown>[];
  submitText?: string;
  successMessage?: string;
  redirectUrl?: string;
  editMode: boolean;
  className?: string;
}

const DEFAULT_FIELDS: FormField[] = [
  { id: 'name', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
  { id: 'email', type: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
];

export function BlockForm({
  id,
  formId,
  formBindings = [],
  fields,
  submitText = 'Submit',
  successMessage,
  redirectUrl,
  editMode,
  className,
}: BlockFormProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const binding = formBindings.find((b) => b.blockId === id && b.type === 'native');
  const resolvedFormId = formId ?? binding?.formId;
  const formFields = (fields as FormField[] | undefined) ?? DEFAULT_FIELDS;

  const renderField = (field: FormField) => {
    const labelEl = field.type !== 'hidden' && (
      <label className="block text-sm font-medium mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    );

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.id} className="mb-3">
            {labelEl}
            <textarea
              className="w-full p-2 border rounded text-sm min-h-[80px] bg-background"
              placeholder={field.placeholder}
              disabled={editMode}
              required={!editMode && !!field.required}
            />
          </div>
        );
      case 'dropdown':
        return (
          <div key={field.id} className="mb-3">
            {labelEl}
            <select
              className="w-full p-2 border rounded text-sm bg-background"
              disabled={editMode}
              required={!editMode && !!field.required}
              defaultValue=""
            >
              <option value="" disabled={!editMode && !!field.required}>
                {field.placeholder ?? 'Select...'}
              </option>
              {(field.options ?? []).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      case 'checkbox':
        return (
          <div key={field.id} className="mb-3 flex items-center gap-2">
            <input type="checkbox" disabled={editMode} className="rounded" required={!editMode && !!field.required} />
            <label className="text-sm">{field.label}</label>
          </div>
        );
      case 'radio':
        return (
          <div key={field.id} className="mb-3">
            {labelEl}
            {(field.options ?? ['Option 1', 'Option 2']).map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-sm mb-1">
                <input type="radio" name={field.id} disabled={editMode} required={!editMode && !!field.required} />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'hidden':
        return null;
      case 'file':
        return (
          <div key={field.id} className="mb-3">
            {labelEl}
            <input
              type="file"
              className="w-full p-2 border rounded text-sm bg-background"
              disabled={editMode}
              required={!editMode && !!field.required}
            />
          </div>
        );
      default:
        return (
          <div key={field.id} className="mb-3">
            {labelEl}
            <input
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              className="w-full p-2 border rounded text-sm bg-background"
              placeholder={field.placeholder}
              disabled={editMode}
              required={!editMode && !!field.required}
            />
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        'form-block rounded border bg-background p-4',
        selected && editMode && 'ring-2 ring-primary',
        className
      )}
      onClick={editMode ? (e) => { e.stopPropagation(); handleBlockClick(id, e); } : undefined}
      data-form-block={id}
      data-form-id={resolvedFormId || undefined}
    >
      {formFields.map(renderField)}
      <button
        type={editMode ? 'button' : 'submit'}
        className="w-full py-2 px-4 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90"
        disabled={editMode}
      >
        {submitText}
      </button>
      {editMode && (
        <div className="text-[10px] text-muted-foreground mt-2 text-center space-y-1">
          <p>Configure fields in the properties panel</p>
          {successMessage ? <p>Success: {successMessage}</p> : null}
          {redirectUrl ? <p>Redirect: {redirectUrl}</p> : null}
        </div>
      )}
    </div>
  );
}
