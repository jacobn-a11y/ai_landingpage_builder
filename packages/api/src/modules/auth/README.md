# Auth Module

Phase 1 authentication for Replica Pages. Google OAuth only.

## Flow Overview

### 1. First-Time Sign-In (New Domain)

1. User visits app, clicks "Sign in with Google"
2. `GET /api/v1/auth/google` → redirects to Google OAuth
3. User authenticates with Google
4. `GET /api/v1/auth/google/callback` receives profile
5. If email domain has no existing workspace:
   - Create `Workspace` with `allowedEmailDomains: [domain]`
   - Create `User` with `role: Admin`
6. Session stores `userId`, `workspaceId`, `role`
7. Redirect to app

### 2. Sign-In (Existing Domain)

1. User signs in with Google
2. If `googleId` exists → return existing user
3. If email domain matches `Workspace.allowedEmailDomains` → create User with `role: Viewer`
4. Session populated, redirect to app

### 3. Invite Flow

1. Admin: `POST /api/v1/invites` with `{ email, role }` (Admin only)
2. API creates `Invite` with token, returns `acceptUrl`
3. Invitee visits `GET /api/v1/invites/accept?token=...` (public)
4. API validates token, sets `session.inviteToken`, `inviteWorkspaceId`, `inviteRole`, `inviteEmail`
5. Redirect to `GET /api/v1/auth/google`
6. User completes Google OAuth
7. In passport callback: if invite in session and email matches → create User in workspace with invited role, delete invite
8. Clear invite from session, redirect to app

### 4. Session & RBAC

- Session: `userId`, `workspaceId`, `role`
- `requireAuth`: ensures `req.isAuthenticated()` and populates session from `req.user`
- `requireRole(['Admin'])`: 403 if role not in list
- `requireMinRole('Editor')`: 403 if role hierarchy below minimum

## Routes

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | /api/v1/auth/google | No | - | Start Google OAuth |
| GET | /api/v1/auth/google/callback | No | - | Google OAuth callback |
| GET | /api/v1/auth/me | No | - | Current user or null |
| POST | /api/v1/auth/logout | No | - | Logout, destroy session |

## Environment

- `GOOGLE_CLIENT_ID` – Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` – Google OAuth client secret
- `API_URL` – Backend base URL (for OAuth callback URL)
- `WEB_URL` – Frontend base URL (redirect after auth)
- `SESSION_SECRET` – Session signing secret
