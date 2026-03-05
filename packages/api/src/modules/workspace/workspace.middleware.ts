import { Request, Response, NextFunction } from 'express';

/**
 * Ensures workspaceId is present in session (set by requireAuth from user's workspace).
 * Use after requireAuth on tenant-scoped routes.
 */
export function requireWorkspace(req: Request, res: Response, next: NextFunction): void {
  const workspaceId = req.session?.workspaceId;
  if (!workspaceId) {
    res.status(401).json({ error: 'No workspace context. Authentication required.' });
    return;
  }
  next();
}
