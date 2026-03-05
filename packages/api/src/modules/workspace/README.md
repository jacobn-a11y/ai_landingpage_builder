# Workspace Module

Workspace context and user management.

## Purpose

Provides workspace retrieval and user listing. Exports `requireWorkspace` middleware for tenant-scoped routes.

## Exports

- `workspaceRouter` – Express router for workspace and users
- `requireWorkspace` – Middleware that validates `workspaceId` in session

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/workspaces | Get current workspace |
| GET | /api/v1/workspaces/:id/users | List users (Admin only) |

## Middleware

`requireWorkspace` – Use after `requireAuth` on tenant-scoped routes. Returns 401 if `workspaceId` is missing from session.
