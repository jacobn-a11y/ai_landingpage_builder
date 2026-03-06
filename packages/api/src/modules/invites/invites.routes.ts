import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';

export const invitesRouter = Router();

invitesRouter.post(
  '/',
  requireAuth,
  requireRole(['Admin']),
  async (req: Request, res: Response) => {
    const workspaceId = req.session.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'No workspace context' });
      return;
    }
    const { email, role } = req.body as { email?: string; role?: string };
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    const validRoles = ['Admin', 'Editor', 'Viewer'];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ error: 'Role must be Admin, Editor, or Viewer' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { workspaceId, email: normalizedEmail },
    });
    if (existing) {
      res.status(409).json({ error: 'User already in workspace' });
      return;
    }
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const invite = await prisma.invite.create({
      data: {
        workspaceId,
        email: normalizedEmail,
        role,
        token,
        expiresAt,
      },
    });
    const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';
    res.status(201).json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      acceptUrl: `${webUrl}/accept-invite?token=${token}`,
      expiresAt: invite.expiresAt,
    });
  }
);

invitesRouter.post('/accept', async (req: Request, res: Response) => {
  const token = req.body?.token as string | undefined;
  if (!token) {
    res.status(400).json({ error: 'Missing invite token' });
    return;
  }
  const invite = await prisma.invite.findFirst({
    where: { token },
    include: { workspace: true },
  });
  if (!invite) {
    res.status(400).json({ error: 'Invalid invite' });
    return;
  }
  if (invite.expiresAt < new Date()) {
    res.status(400).json({ error: 'Invite expired' });
    return;
  }
  req.session.inviteToken = token;
  req.session.inviteWorkspaceId = invite.workspaceId;
  req.session.inviteRole = invite.role;
  req.session.inviteEmail = invite.email;
  const redirectUrl = `${process.env.API_URL ?? 'http://localhost:3001'}/api/v1/auth/google`;
  res.status(200).json({ redirectUrl });
});
