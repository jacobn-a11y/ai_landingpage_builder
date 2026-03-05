# Forms Module

Reusable form library with schema-based field definitions.

## Purpose

Manages form definitions that can be reused across pages. Supports native form blocks and hooked form mappings.

## Exports

- `formsRouter` – Express router for form CRUD
- `FormFieldType` – Field types: text, email, phone, textarea, dropdown, checkbox, radio, hidden

## Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/forms | Create form (name, schemaJson) |
| GET | /api/v1/forms | List forms |
| GET | /api/v1/forms/:id | Get form by id |
| PATCH | /api/v1/forms/:id | Update name or schemaJson |
| DELETE | /api/v1/forms/:id | Delete form |

## Schema

`schemaJson` is an array of field objects:

```json
[
  { "id": "email", "type": "email", "label": "Email", "required": true },
  { "id": "message", "type": "textarea", "label": "Message" },
  { "id": "source", "type": "dropdown", "label": "Source", "options": ["Web", "Referral"] }
]
```

- `id` – Unique field identifier
- `type` – text | email | phone | textarea | dropdown | checkbox | radio | hidden
- `label` – Optional display label
- `required` – Optional boolean
- `options` – Optional array (for dropdown, radio)

## Versioning

`version` increments when `schemaJson` is updated via PATCH.

## Access

- Read: Authenticated users with workspace context
- Write: Editor or Admin role
- Tenant-scoped by `workspaceId` from session
