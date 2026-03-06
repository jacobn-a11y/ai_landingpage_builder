import { Router, Request, Response } from 'express';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { requireWorkspace } from '../workspace/workspace.middleware.js';
import { INTEGRATION_TYPES } from './integrations.types.js';
import { isSafeWebhookUrl } from '../../shared/validate-url.js';
import { encrypt, decryptOrFallback } from '../../shared/crypto.js';

export const integrationsRouter = Router();

const adminMiddleware = [requireAuth, requireWorkspace, requireRole(['Admin'])];

integrationsRouter.get('/', ...adminMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;

  const integrations = await prisma.integration.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });

  // Mask sensitive config in list
  const safe = integrations.map((i) => ({
    id: i.id,
    type: i.type,
    hasConfig: !!i.configEncrypted,
    createdAt: i.createdAt,
  }));

  res.json({ integrations: safe });
});

integrationsRouter.get('/:id', ...adminMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const integration = await prisma.integration.findFirst({
    where: { id, workspaceId },
  });

  if (!integration) {
    res.status(404).json({ error: 'Integration not found' });
    return;
  }

  // Return config with webhook URL partially masked for display
  let configDisplay: unknown = null;
  if (integration.configEncrypted) {
    try {
      const config = JSON.parse(decryptOrFallback(integration.configEncrypted)) as Record<string, unknown>;
      if (config.webhookUrl) {
        const url = config.webhookUrl as string;
        configDisplay = {
          webhookUrl: url.length > 20 ? `${url.slice(0, 15)}...${url.slice(-8)}` : '***',
        };
      }
    } catch {
      configDisplay = { webhookUrl: '***' };
    }
  }

  res.json({
    integration: {
      id: integration.id,
      type: integration.type,
      config: configDisplay,
      createdAt: integration.createdAt,
    },
  });
});

integrationsRouter.post('/', ...adminMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { type, config } = req.body;

  if (!type || !INTEGRATION_TYPES.includes(type)) {
    res.status(400).json({ error: 'type must be one of: zapier, salesforce, webflow' });
    return;
  }

  let configEncrypted: string | null = null;

  if (type === 'zapier') {
    const webhookUrl = config?.webhookUrl;
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      res.status(400).json({ error: 'config.webhookUrl is required for Zapier' });
      return;
    }
    const trimmedUrl = webhookUrl.trim();
    if (!isSafeWebhookUrl(trimmedUrl)) {
      res.status(400).json({ error: 'Webhook URL must be a public HTTP(S) URL' });
      return;
    }
    configEncrypted = encrypt(JSON.stringify({ webhookUrl: trimmedUrl }));
  }

  const integration = await prisma.integration.create({
    data: {
      workspaceId,
      type,
      configEncrypted,
    },
  });

  res.status(201).json({
    integration: {
      id: integration.id,
      type: integration.type,
      hasConfig: !!integration.configEncrypted,
      createdAt: integration.createdAt,
    },
  });
});

integrationsRouter.patch('/:id', ...adminMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const { config } = req.body;

  const integration = await prisma.integration.findFirst({
    where: { id, workspaceId },
  });

  if (!integration) {
    res.status(404).json({ error: 'Integration not found' });
    return;
  }

  let configEncrypted = integration.configEncrypted;

  if (config && integration.type === 'zapier') {
    const webhookUrl = config.webhookUrl;
    if (webhookUrl !== undefined) {
      if (typeof webhookUrl !== 'string') {
        res.status(400).json({ error: 'config.webhookUrl must be a string' });
        return;
      }
      const trimmedUrl = webhookUrl.trim();
      if (!isSafeWebhookUrl(trimmedUrl)) {
        res.status(400).json({ error: 'Webhook URL must be a public HTTP(S) URL' });
        return;
      }
      configEncrypted = encrypt(JSON.stringify({ webhookUrl: trimmedUrl }));
    }
  }

  const updated = await prisma.integration.update({
    where: { id },
    data: { configEncrypted },
  });

  res.json({
    integration: {
      id: updated.id,
      type: updated.type,
      hasConfig: !!updated.configEncrypted,
      createdAt: updated.createdAt,
    },
  });
});

// POST /api/v1/integrations/:id/test - send test submission to webhook
integrationsRouter.post('/:id/test', ...adminMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const integration = await prisma.integration.findFirst({
    where: { id, workspaceId },
  });

  if (!integration) {
    res.status(404).json({ error: 'Integration not found' });
    return;
  }

  if (integration.type !== 'zapier') {
    res.status(400).json({ error: 'Test webhook is only supported for Zapier' });
    return;
  }

  let webhookUrl: string | null = null;
  if (integration.configEncrypted) {
    try {
      const config = JSON.parse(decryptOrFallback(integration.configEncrypted)) as { webhookUrl?: string };
      webhookUrl = config.webhookUrl || null;
    } catch {
      // ignore
    }
  }

  if (!webhookUrl) {
    res.status(400).json({ error: 'Webhook URL not configured' });
    return;
  }

  if (!isSafeWebhookUrl(webhookUrl)) {
    res.status(400).json({ error: 'Webhook URL targets a private network' });
    return;
  }

  const testPayload = {
    _test: true,
    email: 'test@replica-pages.example',
    first_name: 'Test',
    last_name: 'User',
    page_id: 'test',
    utm_source: 'replica-test',
    utm_medium: 'test',
    utm_campaign: 'webhook-test',
    utm_page: 'test-page',
    timestamp: new Date().toISOString(),
  };

  try {
    const res2 = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });
    if (res2.ok) {
      res.json({ ok: true, message: 'Test payload sent successfully' });
    } else {
      res.status(502).json({
        error: `Webhook returned ${res2.status}`,
        status: res2.status,
      });
    }
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Webhook request failed',
    });
  }
});

integrationsRouter.delete('/:id', ...adminMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const integration = await prisma.integration.findFirst({
    where: { id, workspaceId },
  });

  if (!integration) {
    res.status(404).json({ error: 'Integration not found' });
    return;
  }

  await prisma.integration.delete({ where: { id } });
  res.json({ ok: true });
});
