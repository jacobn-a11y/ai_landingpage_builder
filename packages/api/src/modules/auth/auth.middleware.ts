import { Request, Response, NextFunction } from 'express';

export type Role = 'Admin' | 'Editor' | 'Viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  Admin: 3,
  Editor: 2,
  Viewer: 1,
};

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated?.() || !req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const user = req.user as { id: string; email: string; role: string; workspaceId: string };
  req.session.userId = user.id;
  req.session.workspaceId = user.workspaceId;
  req.session.role = user.role as Role;
  next();
}

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.session?.role as Role | undefined;
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireMinRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.session?.role as Role | undefined;
    if (!role) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const minLevel = ROLE_HIERARCHY[minRole];
    const userLevel = ROLE_HIERARCHY[role as Role] ?? 0;
    if (userLevel < minLevel) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
