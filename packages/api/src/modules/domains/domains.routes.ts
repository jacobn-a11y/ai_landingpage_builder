import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { requireWorkspace } from '../workspace/workspace.middleware.js';
import { DomainStatus } from './domains.types.js';
import {
  getCnameTarget,
  verifyDomain,
} from './domains.verification.js';
import type { SecurityHeaders } from './domains.types.js';
import { VALID_X_FRAME_OPTIONS } from './domains.types.js';

export const domainsRouter = Router();

const domainMiddleware = [requireAuth, requireWorkspace, requireRole(['Admin'])];

domainsRouter.post('/', ...domainMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { hostname } = req.body;

  if (!hostname || typeof hostname !== 'string') {
    res.status(400).json({ error: 'hostname is required' });
    return;
  }

  const normalized = hostname.toLowerCase().trim();
  if (!normalized) {
    res.status(400).json({ error: 'hostname cannot be empty' });
    return;
  }

  const token = crypto.randomBytes(16).toString('hex');
  const verificationTxt = `rp-${token}`;
  const cnameTarget = getCnameTarget();

  try {
    const domain = await prisma.domain.create({
      data: {
        workspaceId,
        hostname: normalized,
        status: DomainStatus.Draft,
        verificationTxt,
        cnameTarget,
      },
    });
    res.status(201).json({ domain });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Domain already exists in this workspace' });
      return;
    }
    throw e;
  }
});

domainsRouter.get('/', ...domainMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const domains = await prisma.domain.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ domains });
});

domainsRouter.get('/:id', ...domainMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const domain = await prisma.domain.findFirst({
    where: { id, workspaceId },
  });

  if (!domain) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }

  res.json({ domain });
});

domainsRouter.post('/:id/verify', ...domainMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const domain = await prisma.domain.findFirst({
    where: { id, workspaceId },
  });

  if (!domain) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }

  if (!domain.verificationTxt) {
    res.status(400).json({ error: 'Domain has no verification token' });
    return;
  }

  await prisma.domain.update({
    where: { id },
    data: { status: DomainStatus.Verifying },
  });

  const result = await verifyDomain(domain.hostname, domain.verificationTxt);
  const now = new Date();

  const updated = await prisma.domain.update({
    where: { id },
    data: {
      status: result.success ? DomainStatus.Active : DomainStatus.Error,
      verificationCheckedAt: now,
      verificationError: result.error ?? null,
    },
  });

  res.json({
    domain: updated,
    verification: {
      success: result.success,
      txtOk: result.txtOk,
      cnameOk: result.cnameOk,
      hasConflictingA: result.hasConflictingA,
    },
  });
});

domainsRouter.patch('/:id', ...domainMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const { status, verificationTxt, verificationCheckedAt, verificationError, cnameTarget, sslStatus, embedPolicy, custom404PageId, securityHeaders, redirects } =
    req.body;

  const domain = await prisma.domain.findFirst({
    where: { id, workspaceId },
  });

  if (!domain) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    if (!Object.values(DomainStatus).includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    updates.status = status;
  }
  if (verificationTxt !== undefined) updates.verificationTxt = verificationTxt;
  if (verificationCheckedAt !== undefined) updates.verificationCheckedAt = new Date(verificationCheckedAt);
  if (verificationError !== undefined) updates.verificationError = verificationError;
  if (cnameTarget !== undefined) updates.cnameTarget = cnameTarget;
  if (sslStatus !== undefined) updates.sslStatus = sslStatus;
  if (embedPolicy !== undefined) {
    if (embedPolicy !== 'allow' && embedPolicy !== 'deny' && embedPolicy !== null) {
      res.status(400).json({ error: 'embedPolicy must be allow, deny, or null' });
      return;
    }
    updates.embedPolicy = embedPolicy;
  }
  if (custom404PageId !== undefined) {
    if (custom404PageId !== null && typeof custom404PageId !== 'string') {
      res.status(400).json({ error: 'custom404PageId must be string or null' });
      return;
    }
    updates.custom404PageId = custom404PageId;
  }
  if (securityHeaders !== undefined) {
    if (securityHeaders !== null && typeof securityHeaders !== 'object') {
      res.status(400).json({ error: 'securityHeaders must be object or null' });
      return;
    }
    if (securityHeaders) {
      const sh = securityHeaders as SecurityHeaders;
      if (sh.xFrameOptions !== undefined && !(VALID_X_FRAME_OPTIONS as readonly (string | null)[]).includes(sh.xFrameOptions ?? null)) {
        res.status(400).json({ error: 'xFrameOptions must be DENY, SAMEORIGIN, or null' });
        return;
      }
    }
    updates.securityHeaders = securityHeaders;
  }
  if (redirects !== undefined) {
    if (!Array.isArray(redirects)) {
      res.status(400).json({ error: 'redirects must be array of { from, to, status }' });
      return;
    }
    updates.redirects = redirects;
  }

  const updated = await prisma.domain.update({
    where: { id },
    data: updates,
  });
  res.json({ domain: updated });
});

domainsRouter.put('/:id', ...domainMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const { embedPolicy, custom404PageId, securityHeaders } = req.body;

  const domain = await prisma.domain.findFirst({ where: { id, workspaceId } });
  if (!domain) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }

  const updates: Record<string, unknown> = {};

  if (embedPolicy !== undefined) {
    if (embedPolicy !== 'allow' && embedPolicy !== 'deny' && embedPolicy !== null) {
      res.status(400).json({ error: 'embedPolicy must be allow, deny, or null' });
      return;
    }
    updates.embedPolicy = embedPolicy;
  }
  if (custom404PageId !== undefined) {
    if (custom404PageId !== null && typeof custom404PageId !== 'string') {
      res.status(400).json({ error: 'custom404PageId must be string or null' });
      return;
    }
    updates.custom404PageId = custom404PageId;
  }
  if (securityHeaders !== undefined) {
    if (securityHeaders !== null && typeof securityHeaders !== 'object') {
      res.status(400).json({ error: 'securityHeaders must be object or null' });
      return;
    }
    if (securityHeaders) {
      const sh = securityHeaders as SecurityHeaders;
      if (sh.xFrameOptions !== undefined && !(VALID_X_FRAME_OPTIONS as readonly (string | null)[]).includes(sh.xFrameOptions ?? null)) {
        res.status(400).json({ error: 'xFrameOptions must be DENY, SAMEORIGIN, or null' });
        return;
      }
    }
    updates.securityHeaders = securityHeaders;
  }

  const updated = await prisma.domain.update({ where: { id }, data: updates });
  res.json({ domain: updated });
});

domainsRouter.delete('/:id', ...domainMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const domain = await prisma.domain.findFirst({
    where: { id, workspaceId },
  });

  if (!domain) {
    res.status(404).json({ error: 'Domain not found' });
    return;
  }

  await prisma.domain.delete({ where: { id } });
  res.json({ ok: true });
});
