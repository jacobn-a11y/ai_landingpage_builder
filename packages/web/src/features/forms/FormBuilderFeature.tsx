import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type FormFieldSchema, type FormSchemaConfig } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { FormBuilder } from './FormBuilder';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

function parseSchema(schema: FormFieldSchema[] | { fields?: FormFieldSchema[] } | object): FormFieldSchema[] {
  if (Array.isArray(schema)) return schema;
  if (schema && typeof schema === 'object' && 'fields' in schema) return (schema as { fields: FormFieldSchema[] }).fields ?? [];
  return [];
}

function parseConfig(schema: FormFieldSchema[] | { fields?: FormFieldSchema[]; config?: FormSchemaConfig } | object): FormSchemaConfig {
  if (schema && typeof schema === 'object' && !Array.isArray(schema) && 'config' in schema) {
    return (schema as { config?: FormSchemaConfig }).config ?? {};
  }
  return {};
}

export function FormBuilderFeature() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();
  const isEdit = !!id && id !== 'new';

  const [name, setName] = useState('');
  const [fields, setFields] = useState<FormFieldSchema[]>([]);
  const [config, setConfig] = useState<FormSchemaConfig>({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    api.forms
      .get(id!)
      .then(({ form }) => {
        setName(form.name);
        setFields(parseSchema(form.schemaJson));
        setConfig(parseConfig(form.schemaJson));
      })
      .catch((e) => {
        showError(e instanceof Error ? e.message : 'Failed to load form');
        navigate('/forms');
      })
      .finally(() => setFetchLoading(false));
  }, [id, isEdit, navigate]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const schemaPayload =
        Object.keys(config).length > 0 ? { fields, config } : fields;
      if (isEdit) {
        await api.forms.update(id!, { name: name.trim(), schemaJson: schemaPayload });
        navigate('/forms');
      } else {
        await api.forms.create({ name: name.trim(), schemaJson: schemaPayload });
        navigate('/forms');
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to save form');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/forms');
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/forms')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {isEdit ? 'Edit form' : 'Create form'}
          </h1>
          <p className="text-muted-foreground">
            Add fields and configure your form. Save to add it to the forms library.
          </p>
        </div>
      </div>

      <FormBuilder
        name={name}
        onNameChange={setName}
        fields={fields}
        onFieldsChange={setFields}
        config={config}
        onConfigChange={setConfig}
        onSave={handleSave}
        onCancel={handleCancel}
        saveLabel={isEdit ? 'Save changes' : 'Create form'}
        loading={loading}
      />
    </div>
  );
}
