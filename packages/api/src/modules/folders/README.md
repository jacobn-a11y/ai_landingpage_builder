# Folders Module

Folder hierarchy for organizing pages in the library.

## Purpose

Provides a tree structure for organizing pages. Folders can be nested via `parentId`.

## Exports

- `foldersRouter` – Express router for folder CRUD

## Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/folders | Create folder (name, parentId?) |
| GET | /api/v1/folders | List folders as tree |
| PATCH | /api/v1/folders/:id | Update name or parentId |
| DELETE | /api/v1/folders/:id | Delete folder (must be empty) |

## Fields

- `name` – Folder display name
- `parentId` – Parent folder id for hierarchy (null = root)

## Access

- Read: Authenticated users with workspace context
- Write: Editor or Admin role
- Tenant-scoped by `workspaceId` from session
