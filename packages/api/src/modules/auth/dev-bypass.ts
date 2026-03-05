/**
 * Dev-only: bypass auth when BYPASS_AUTH_LOCALHOST=1 and request is from localhost.
 * Creates a dev workspace + user if needed. Never runs in production.
 */
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../shared/db.js';

const DEV_EMAIL = 'dev@localhost';

function isLocalhost(req: Request): boolean {
  const host = req.get('host') ?? '';
  const origin = req.get('origin') ?? '';
  const forwarded = req.get('x-forwarded-host') ?? '';
  return (
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    forwarded.includes('localhost')
  );
}

export async function devBypassAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    next();
    return;
  }
  if (process.env.BYPASS_AUTH_LOCALHOST !== '1') {
    next();
    return;
  }
  if (!isLocalhost(req)) {
    next();
    return;
  }
  if ((req as { isAuthenticated?: () => boolean }).isAuthenticated?.()) {
    next();
    return;
  }

  try {
    let user = await prisma.user.findFirst({
      where: { email: DEV_EMAIL },
      include: { workspace: true },
    });

    if (!user) {
      const workspace = await prisma.workspace.create({
        data: {
          name: 'Dev Workspace',
          allowedEmailDomains: ['localhost'],
        },
      });
      user = await prisma.user.create({
        data: {
          workspaceId: workspace.id,
          email: DEV_EMAIL,
          role: 'Admin',
        },
        include: { workspace: true },
      });
    }

    const userShape = {
      id: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    };

    (req as { user?: object }).user = userShape;
    (req as { isAuthenticated?: () => boolean }).isAuthenticated = () => true;

    if (req.session) {
      req.session.userId = user.id;
      req.session.workspaceId = user.workspaceId;
      req.session.role = user.role as 'Admin' | 'Editor' | 'Viewer';
    }
  } catch (err) {
    console.error('[dev-bypass] Failed to get/create dev user:', err);
  }

  next();
}
