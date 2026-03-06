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
    const webhookUrl = getWebhookUrl(integration);
    if (!webhookUrl || !isSafeWebhookUrl(webhookUrl)) continue;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission.payloadJson),
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

function getWebhookUrl(integration: { configEncrypted: string | null }): string | null {
  if (!integration.configEncrypted) return null;
  try {
    const config = JSON.parse(decryptOrFallback(integration.configEncrypted)) as { webhookUrl?: string };
    return config.webhookUrl || null;
  } catch {
    return null;
  }
}
