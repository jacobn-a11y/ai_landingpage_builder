# Pages Module

Page management with content, scripts, publish config, and form bindings.

## Purpose

Manages landing pages: content (block tree), scripts (header/footer), publish and schedule config, and form bindings (native or hooked).

## Exports

- `pagesRouter` – Express router for page CRUD and clone

## Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/pages | Create page |
| GET | /api/v1/pages | List pages (optional ?folderId=) |
| GET | /api/v1/pages/:id | Get page by id |
| PATCH | /api/v1/pages/:id | Update page |
| DELETE | /api/v1/pages/:id | Delete page |
| POST | /api/v1/pages/:id/clone | Clone page (name?, slug?) |

## Fields

- `name` – Page display name
- `slug` – Unique per workspace, used in URLs
- `folderId` – Parent folder (null = root)
- `contentJson` – Block tree (draft)
- `lastPublishedContentJson` – Last published snapshot for rollback
- `scripts` – { header?: string, footer?: string }
- `publishConfig` – { domainId, path, etc }
- `scheduleConfig` – { publishAt, unpublishAt }
- `version` – Increments on publish/rollback

## PageFormBinding

Stored per page. When cloning, bindings are copied.

- `pageId`, `formId`
- `type` – native | hooked
- `selector` – CSS selector for hooked forms
- `fieldMappings` – JSON array mapping form fields to source elements

## Access

- Read: Authenticated users with workspace context
- Write: Editor or Admin role
- Tenant-scoped by `workspaceId` from session
