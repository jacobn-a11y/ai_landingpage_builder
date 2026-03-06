/**
 * Audit event logger for import operations.
 * Writes events to the AuditEvent table via Prisma.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type ImportAuditEventType =
  | 'import.requested'
  | 'import.started'
  | 'import.retried'
  | 'import.failed'
  | 'import.complete'
  | 'import.tier_change'
  | 'import.debug_bundle.created'
  | 'import.debug_bundle.accessed';

export interface AuditEventInput {
  workspaceId: string;
  actorId: string;
  eventType: ImportAuditEventType;
  jobId?: string;
  pageId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event.
 */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        eventType: input.eventType,
        jobId: input.jobId ?? null,
        pageId: input.pageId ?? null,
        metadata: input.metadata ?? null,
      },
    });
  } catch (err) {
    // Audit logging should never crash the import pipeline
    console.error('[audit] Failed to log event:', input.eventType, err);
  }
}
