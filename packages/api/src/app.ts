import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { workspaceRouter } from './modules/workspace/workspace.routes.js';
import { invitesRouter } from './modules/invites/invites.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { domainsRouter } from './modules/domains/domains.routes.js';
import { foldersRouter } from './modules/folders/folders.routes.js';
import { pagesRouter } from './modules/pages/pages.routes.js';
import { formsRouter } from './modules/forms/forms.routes.js';
import { submissionsRouter } from './modules/submissions/submissions.routes.js';
import { integrationsRouter } from './modules/integrations/integrations.routes.js';
import { publishingRouter } from './modules/publishing/publishing.routes.js';
import { serveRouter } from './modules/serve/serve.routes.js';
import { libraryRouter } from './modules/library/library.routes.js';
import { devBypassAuth } from './modules/auth/dev-bypass.js';
import './modules/auth/passport.config.js';

const sessionSecret = process.env.SESSION_SECRET ?? 'dev-secret-change-in-production';
if (process.env.NODE_ENV === 'production' && sessionSecret === 'dev-secret-change-in-production') {
  console.error('FATAL: SESSION_SECRET must be set to a secure value in production');
  process.exit(1);
}

const corsOptions = {
  origin: process.env.WEB_URL ?? 'http://localhost:5173',
  credentials: true,
};

export const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Dev-only: bypass auth on localhost when BYPASS_AUTH_LOCALHOST=1
if (!process.env.VITEST && process.env.BYPASS_AUTH_LOCALHOST === '1') {
  app.use(devBypassAuth);
  console.log('[dev] Auth bypass enabled for localhost');
}

// Reject X-Test-Auth in production (security)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.get('X-Test-Auth') === '1') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  });
}

// Test-only: inject fake auth when X-Test-Auth header is present (for supertest)
if (process.env.VITEST) {
  app.use((req, _res, next) => {
    if (req.get('X-Test-Auth') === '1') {
      const role = (req.get('X-Test-Role') as 'Admin' | 'Editor' | 'Viewer') ?? 'Admin';
      (req as { user?: object; isAuthenticated?: () => boolean }).user = {
        id: 'test-user-id',
        email: 'test@example.com',
        role,
        workspaceId: 'test-workspace-id',
      };
      (req as { isAuthenticated?: () => boolean }).isAuthenticated = () => true;
      if (req.session) {
        req.session.userId = 'test-user-id';
        req.session.workspaceId = 'test-workspace-id';
        req.session.role = role;
      }
    }
    next();
  });
}

app.use('/api/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/invites', invitesRouter);
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/domains', domainsRouter);
app.use('/api/v1/folders', foldersRouter);
app.use('/api/v1/pages', pagesRouter);
app.use('/api/v1/pages', publishingRouter);
app.use('/api/v1/forms', formsRouter);
app.use('/api/v1/submissions', submissionsRouter);
app.use('/api/v1/serve', serveRouter);
app.use('/api/v1/integrations', integrationsRouter);
app.use('/api/v1/library', libraryRouter);
