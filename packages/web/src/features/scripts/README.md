# Scripts Feature

Admin-only scripts management for Replica Pages.

## Overview

- **ScriptsFeature**: Admin page for global header/footer scripts and script allowlist.
- **PageScriptsPanel**: Page-level header/footer scripts in the page editor (when no block selected).
- **Domain warning**: When adding scripts with external URLs, warns if domain is not in allowlist.

## Access

Scripts nav item is admin-only. Non-admins do not see the Scripts link.

## Components

- `ScriptsFeature.tsx` – Main scripts admin page with global scripts and allowlist table.
- `PageScriptsPanel.tsx` – Lives in editor; shown in Properties panel when no block selected.

## API

- `GET /api/v1/workspaces` – Returns workspace with `globalHeaderScript`, `globalFooterScript`, `scriptAllowlist`.
- `PATCH /api/v1/workspaces/:id/settings` – Admin only. Update global scripts and allowlist.
