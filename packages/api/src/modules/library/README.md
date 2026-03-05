# Library Module

Block library: folders and items for reusable blocks extracted from pages.

## Purpose

Stores elements and composite blocks that editors can insert into pages. When a page is imported from HTML/MHTML, blocks are automatically imported into a folder named after the page.

## Exports

- `libraryRouter` – Express router for library CRUD and import

## Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/library/import | Import blocks from page content (pageName, contentJson) |
| GET | /api/v1/library/folders | List folders with items |
| POST | /api/v1/library/folders | Create folder (name) |
| DELETE | /api/v1/library/folders/:id | Delete folder |
| POST | /api/v1/library/folders/:folderId/items | Add item (name, type, blockJson) |
| DELETE | /api/v1/library/items/:id | Delete item |

## Models

- `BlockLibraryFolder` – workspaceId, name (e.g. page name)
- `BlockLibraryItem` – folderId, name, type (element | block), blockJson

## Access

- Editor or Admin role
- Tenant-scoped by workspaceId from session
