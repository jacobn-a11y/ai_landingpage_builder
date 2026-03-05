# Block Library

Replica Pages includes a block library that stores reusable elements and composite blocks extracted from imported or created pages. Editors can insert library items into new pages via the editor's Library dropdown.

## Overview

- **Purpose**: Reuse blocks across pages without re-creating them
- **Storage**: `BlockLibraryFolder` and `BlockLibraryItem` in Prisma
- **Import**: When a page is created from HTML/MHTML import, blocks are automatically imported into a new folder named after the page

## Data Model

| Entity | Description |
|--------|-------------|
| `BlockLibraryFolder` | Container; typically one per source page. `name` = page name. |
| `BlockLibraryItem` | Single block. `type` = `element` (leaf) or `block` (has children). `blockJson` = block data. |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/library/import` | Import blocks from page content; creates folder + items |
| GET | `/api/v1/library/folders` | List folders with items |
| POST | `/api/v1/library/folders` | Create empty folder |
| DELETE | `/api/v1/library/folders/:id` | Delete folder (items cascade) |
| POST | `/api/v1/library/folders/:folderId/items` | Add item to folder |
| DELETE | `/api/v1/library/items/:id` | Delete item |

## Import Flow

1. User imports HTML via `UploadPageModal` → `htmlToBlocks()` produces `pageContentJson`
2. User creates page with `api.pages.create()`
3. `api.library.importFromPage(pageName, contentJson)` is called
4. Backend creates `BlockLibraryFolder` with `name = pageName`
5. For each block in `contentJson.blocks`:
   - If block has children → `type: 'block'`, stores `{ root, blocks }` subtree
   - Else → `type: 'element'`, stores single block
6. Items are stored with display names from `blockToItemName()` (e.g. text preview, "Image", "Button")

## Editor Integration

- **LibraryDropdown**: In the editor toolbar, allows inserting blocks from the library into the canvas
- **Library folders**: Listed by source page; items can be dragged or inserted into the current page

## Files

| File | Purpose |
|------|---------|
| `packages/api/src/modules/library/library.routes.ts` | API routes |
| `packages/web/src/features/pages/editor/LibraryDropdown.tsx` | UI for inserting library blocks |
| `packages/web/src/lib/api.ts` | `api.library.*` methods |
