/**
 * CSRF protection middleware — two layers:
 *
 * 1. Origin/Referer verification for state-changing requests (POST/PUT/PATCH/DELETE).
 *    Rejects requests whose Origin (or Referer) does not match the allowed WEB_URL.
 *
 * 2. Double-submit cookie pattern: a random CSRF token is set as a non-HttpOnly
 *    cookie; state-changing requests must echo it back via the X-CSRF-Token header.
 *
 * Exemptions:
 *   - Public submission endpoint (POST /api/v1/submissions) — uses its own page_id validation
 *   - Health check routes (/api/health)
 *   - Serve routes (/api/v1/serve) — public page rendering (GET-only anyway)
 *   - OAuth callback (GET /api/v1/auth/google/callback)
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'node:crypto';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

function getAllowedOrigins(): string[] {
  const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  const origins = new Set<string>();
  for (const raw of [webUrl, apiUrl]) {
    try {
      const u = new URL(raw);
      origins.add(u.origin);
    } catch {
      // skip malformed URLs
    }
  }
  return [...origins];
}

function isExemptPath(path: string, method: string): boolean {
  // Health check
  if (path.startsWith('/api/health')) return true;
  // Public page serving (GET-only routes, but exempt anyway)
  if (path.startsWith('/api/v1/serve')) return true;
  // Public form submission endpoint — has its own page_id + rate-limit validation
  if (path === '/api/v1/submissions' && method === 'POST') return true;
  // OAuth callback (handled by passport, browser-initiated redirect)
  if (path.startsWith('/api/v1/auth/google')) return true;
  return false;
}

/**
 * Layer 2: Origin / Referer check.
 * For state-changing requests, verify Origin or Referer matches allowed origins.
 */
export function csrfOriginCheck(req: Request, res: Response, next: NextFunction): void {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    next();
    return;
  }

  if (isExemptPath(req.path, req.method)) {
    next();
    return;
  }

  const allowed = getAllowedOrigins();
  const origin = req.get('origin');

  if (origin) {
    try {
      const o = new URL(origin).origin;
      if (allowed.includes(o)) {
        next();
        return;
      }
    } catch {
      // malformed origin — fall through to reject
    }
    res.status(403).json({ error: 'Forbidden: origin mismatch' });
    return;
  }

  // No Origin header — check Referer
  const referer = req.get('referer');
  if (referer) {
    try {
      const o = new URL(referer).origin;
      if (allowed.includes(o)) {
        next();
        return;
      }
    } catch {
      // malformed referer
    }
    res.status(403).json({ error: 'Forbidden: referer mismatch' });
    return;
  }

  // Neither Origin nor Referer present — reject state-changing request
  res.status(403).json({ error: 'Forbidden: missing origin' });
}

/**
 * Layer 3: Double-submit CSRF token check.
 * For state-changing requests, the X-CSRF-Token header must match the csrf-token cookie.
 */
export function csrfDoubleSubmit(req: Request, res: Response, next: NextFunction): void {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    next();
    return;
  }

  if (isExemptPath(req.path, req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: 'Forbidden: CSRF token mismatch' });
    return;
  }

  next();
}

/**
 * Generate a new CSRF token, set it as a cookie, and return it in the response body.
 * Called from GET /api/v1/auth/csrf-token.
 */
export function handleCsrfTokenRequest(req: Request, res: Response): void {
  const token = randomBytes(32).toString('hex');
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // Must be readable by JS to send in header
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, same as session
  });

  res.json({ csrfToken: token });
}
