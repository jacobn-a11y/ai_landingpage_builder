import { Router, Request, Response } from 'express';
import passport from 'passport';
import { prisma } from '../../shared/db.js';
import { requireAuth } from './auth.middleware.js';
import './passport.config.js';

export const authRouter = Router();

authRouter.get('/google', (req, res, next) => {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

authRouter.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', (err: Error | null, user: unknown) => {
      if (err) {
        const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';
        return res.redirect(`${webUrl}/login?error=${encodeURIComponent(err.message)}`);
      }
      if (!user) {
        const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';
        return res.redirect(`${webUrl}/login?error=Authentication failed`);
      }
      req.login(user as Express.User, (loginErr) => {
        if (loginErr) {
          const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';
          return res.redirect(`${webUrl}/login?error=${encodeURIComponent(loginErr.message)}`);
        }
        const u = user as { id: string; email: string; role: string; workspaceId: string };
        req.session.userId = u.id;
        req.session.workspaceId = u.workspaceId;
        req.session.role = u.role as 'Admin' | 'Editor' | 'Viewer';
        req.session.inviteToken = undefined;
        req.session.inviteWorkspaceId = undefined;
        req.session.inviteRole = undefined;
        req.session.inviteEmail = undefined;
        const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';
        res.redirect(webUrl);
      });
    })(req, res, next);
  }
);

authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user as { id: string; email: string; role: string; workspaceId: string };
  prisma.user
    .findUnique({
      where: { id: user.id },
      include: { workspace: true },
    })
    .then((dbUser) => {
      if (!dbUser || !('workspace' in dbUser)) {
        res.json({ user: null });
        return;
      }
      const { workspace } = dbUser;
      res.json({
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          workspaceId: dbUser.workspaceId,
          workspace: {
            id: workspace.id,
            name: workspace.name,
          },
        },
      });
    })
    .catch(() => res.json({ user: null }));
});

authRouter.post('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        res.status(500).json({ error: 'Session destroy failed' });
        return;
      }
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });
});
