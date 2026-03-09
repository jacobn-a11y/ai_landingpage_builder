import { createHmac } from 'node:crypto';
import { prisma } from '../../shared/db.js';
import { isSafeWebhookUrl } from '../../shared/validate-url.js';
import { decryptOrFallback } from '../../shared/crypto.js';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

interface DeliveryAttempt {
  attempt: number;
  status: 'success' | 'failed';
  error?: string;
  at: string;
}

interface WebhookConfig {
  webhookUrl?: string;
  secret?: string;
}

/**
 * Queue Zapier delivery for a submission.
 * Phase 1: sync delivery with retries.
 */
export async function queueZapierDelivery(submissionId: string): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { page: true },
  });

  if (!submission || submission.deliveryStatus === 'delivered') return;

  const integrations = await prisma.integration.findMany({
    where: { workspaceId: submission.workspaceId, type: 'zapier' },
  });

  if (integrations.length === 0) {
    await prisma.submission.update({
      where: { id: submissionId },
      data: { deliveryStatus: 'delivered' },
    });
    return;
  }

  const attempts = (submission.deliveryAttempts as unknown as DeliveryAttempt[]) || [];
  let lastError: string | undefined;

  for (const integration of integrations) {
    const config = getWebhookConfig(integration);
    if (!config?.webhookUrl || !isSafeWebhookUrl(config.webhookUrl)) continue;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const bodyStr = JSON.stringify(submission.payloadJson);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        // HMAC signing when secret is configured
        if (config.secret) {
          const signature = createHmac('sha256', config.secret)
            .update(bodyStr)
            .digest('hex');
          headers['X-Replica-Signature'] = `sha256=${signature}`;
        }

        const res = await fetch(config.webhookUrl, {
          method: 'POST',
          headers,
          body: bodyStr,
        });

        if (res.ok) {
          attempts.push({
            attempt,
            status: 'success',
            at: new Date().toISOString(),
          });
          await prisma.submission.update({
            where: { id: submissionId },
            data: {
              deliveryStatus: 'delivered',
              deliveredAt: new Date(),
              deliveryAttempts: attempts as object,
            },
          });
          return;
        }

        lastError = `HTTP ${res.status}: ${await res.text()}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      attempts.push({
        attempt,
        status: 'failed',
        error: lastError,
        at: new Date().toISOString(),
      });

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      deliveryStatus: 'failed',
      deliveryAttempts: attempts as object,
    },
  });
}

function getWebhookConfig(integration: { configEncrypted: string | null }): WebhookConfig | null {
  if (!integration.configEncrypted) return null;
  try {
    return JSON.parse(decryptOrFallback(integration.configEncrypted)) as WebhookConfig;
  } catch {
    return null;
  }
}
