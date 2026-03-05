# Publishing Module (Phase 1)

Publishing for Replica Pages: demo domain, custom domain via CNAME, scheduling, custom 404, and redirects.

## API Endpoints

### POST /api/v1/pages/:id/publish

Publish a page to a target.

**Body:**
```json
{
  "targetType": "demo" | "custom",
  "domainId": "string (required when targetType=custom)",
  "path": "string (optional, defaults to page slug)"
}
```

**Response:** `{ ok: true, publishStatus: PublishStatus }`

### POST /api/v1/pages/:id/unpublish

Unpublish a page. Clears `lastPublishedContentJson` and sets status to draft.

### GET /api/v1/pages/:id/publish-status

Get current publish target, status, and URL. Processes scheduled publish/unpublish before returning.

### PATCH /api/v1/pages/:id/publish-schedule

Update schedule (publishAt, unpublishAt).

**Body:**
```json
{
  "publishAt": "ISO date string or null",
  "unpublishAt": "ISO date string or null"
}
```

## Publish Targets

### Demo domain

- Each workspace gets a demo URL: `{API_BASE}/api/v1/serve/demo/{workspaceId}/{pageSlug}`
- For testing and QA; no DNS setup required.

### Custom domain

- Requires domain with `status=Active` (verified via CNAME).
- Path: subdirectory under domain (e.g. `domain.com/landing/page-slug`).
- Custom domain must CNAME to our platform; we serve based on Host header + path.

## Page Model

`publishConfig` (JSON):
```ts
{
  domainId?: string;
  targetType: 'demo' | 'custom';
  path?: string;
  status: 'draft' | 'published' | 'scheduled';
  publishAt?: string;  // ISO date
  unpublishAt?: string; // ISO date
  isPublished?: boolean;
  publishedAt?: string;
}
```

## Domain Model

- `custom404PageId`: page to show for 404s
- `redirects`: `[{ from, to, status: 301|302 }]`

## Scheduling

MVP: in-memory check on each `GET /publish-status` request. Processes `publishAt` and `unpublishAt` when due.

## Serve Endpoints

- `GET /api/v1/serve/demo/:workspaceId/:path*` – serve page for demo
- `GET /api/v1/serve/domain/:domainId/:path*` – serve page for custom domain

Redirects and custom 404 are applied when serving.

## Security Headers

When serving pages:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options`: from domain `embedPolicy` (allow → SAMEORIGIN, deny → DENY)
- `Strict-Transport-Security`: HSTS enabled
