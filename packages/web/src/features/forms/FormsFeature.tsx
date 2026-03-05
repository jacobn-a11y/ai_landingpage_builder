import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Form } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

function parseSchema(schema: Form['schemaJson']): { id: string }[] {
  if (Array.isArray(schema)) return schema;
  if (schema && typeof schema === 'object' && 'fields' in schema) return (schema as { fields: { id: string }[] }).fields ?? [];
  return [];
}

export function FormsFeature() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteForm, setDeleteForm] = useState<Form | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchForms = async () => {
    try {
      const { forms: f } = await api.forms.list();
      setForms(f);
    } catch {
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleDelete = async () => {
    if (!deleteForm) return;
    setActionLoading(true);
    try {
      await api.forms.delete(deleteForm.id);
      await fetchForms();
      setDeleteForm(null);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Forms</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage forms for your landing pages. Add fields and save to the library.
          </p>
        </div>
        <Button onClick={() => navigate('/forms/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create form
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No forms yet. Create your first form to get started.
                  </TableCell>
                </TableRow>
              ) : (
                forms.map((form) => {
                  const schema = parseSchema(form.schemaJson);
                  return (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">{form.name}</TableCell>
                      <TableCell>{schema.length}</TableCell>
                      <TableCell className="text-muted-foreground">v{form.version}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/forms/${form.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteForm(form)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteForm}
        onOpenChange={(open) => !open && setDeleteForm(null)}
        title="Delete form"
        description={
          deleteForm
            ? `Are you sure you want to delete "${deleteForm.name}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={actionLoading}
      />
    </div>
  );
}
