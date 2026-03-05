import { useEffect, useState } from 'react';
import { api, type IntegrationListItem } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export function IntegrationsFeature() {
  const [integrations, setIntegrations] = useState<IntegrationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.integrations
      .list()
      .then(({ integrations: i }) => setIntegrations(i))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!webhookUrl.trim()) return;
    setSaving(true);
    try {
      await api.integrations.create({
        type: 'zapier',
        config: { webhookUrl: webhookUrl.trim() },
      });
      setAddOpen(false);
      setWebhookUrl('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async (id: string) => {
    setTestingId(id);
    try {
      await api.integrations.testWebhook(id);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this integration?')) return;
    try {
      await api.integrations.delete(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const zapierIntegrations = integrations.filter((i) => i.type === 'zapier');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="mt-2 text-muted-foreground">
          Connect Zapier to receive form submissions. Admin only.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Zapier</CardTitle>
          <Button onClick={() => setAddOpen(true)}>Add Zapier webhook</Button>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : zapierIntegrations.length === 0 ? (
            <p className="py-8 text-muted-foreground">
              No Zapier integrations. Add a webhook to receive submissions.
            </p>
          ) : (
            <ul className="space-y-2">
              {zapierIntegrations.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Zapier</span>
                    <Badge variant={i.hasConfig ? 'default' : 'secondary'}>
                      {i.hasConfig ? 'Connected' : 'Not configured'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.hasConfig && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestWebhook(i.id)}
                        disabled={testingId === i.id}
                      >
                        {testingId === i.id ? 'Testing...' : 'Test webhook'}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(i.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Zapier webhook</DialogTitle>
            <DialogDescription>
              Paste your Zapier webhook URL. New submissions will be POSTed to this URL.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="https://hooks.zapier.com/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving || !webhookUrl.trim()}>
              {saving ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
