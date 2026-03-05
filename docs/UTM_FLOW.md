# UTM Tracking Flow

Replica Pages captures UTM parameters from landing page URLs and attaches them to form submissions.

## Overview

1. **Capture**: Client-side script reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` from the URL query string.
2. **Persist**: Values are stored in a cookie (`replica_utm`) and `localStorage` with a 30-day TTL.
3. **Submit**: On form submit, UTM values from storage are included in the POST payload to `/api/v1/submissions`.
4. **Backend**: The API derives `utm_page` from the page slug/name if not provided, and stores all UTM fields in the submission payload.

## Client-Side Flow

### 1. UTM Capture Script (injected before `</body>`, first script in footer)

- Runs on page load.
- Parses `?utm_source=...&utm_medium=...` etc. from `window.location.search`.
- Writes to:
  - **Cookie**: `replica_utm` with `path=/`, `max-age=2592000` (30 days), `SameSite=Lax`.
  - **localStorage**: key `replica_utm` (fallback if cookie is unavailable).

### 2. Form Submit Handler (injected after form hydration)

- Listens for `submit` on `form[data-replica-form]`.
- Prevents default; uses `fetch` with `URLSearchParams` (application/x-www-form-urlencoded).
- Reads UTM from `localStorage` or cookie.
- Appends `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` to the payload.
- Also appends `landing_url`, `referrer`, `user_agent`.
- Handles 302 redirect (e.g. success redirect) by setting `window.location.href` to the `Location` header.

### 3. Injection Points

The serve module (`packages/api/src/modules/serve/`) injects scripts in `<body>` (in order):

1. **UTM capture script** — runs on page load, reads `?utm_source=...` from URL, stores in cookie/localStorage.
2. **Form hydration script** — sets `form.action` from `__REPLICA_PAGE__.formActionUrl`, hydrates `[data-form-block]` placeholders.
3. **Form submit handler script** — intercepts submit on `form[data-replica-form]`, adds UTM from storage, sends via fetch.
4. **Countdown script** — finds `.rp-countdown` elements, updates `data-target` (ISO date) every second; used by the countdown block.

All scripts are inline; no external JS files are required.

## Backend Flow

### POST /api/v1/submissions

- Accepts `application/x-www-form-urlencoded` and `application/json`.
- Merges UTM from `req.body` and `req.query` (query takes precedence for UTM).
- `validateAndNormalizePayload()`:
  - Requires `page_id` (published page) and `email`.
  - **utm_page**: Required. Derived from `page.slug` or `page.name` if not provided; defaults to `'unknown'`.
- Stores canonical payload in `Submission.payloadJson`.
- Queues Zapier delivery with full payload (including UTM).

## Data Flow Diagram

```
URL: /landing?utm_source=google&utm_campaign=spring
         │
         ▼
┌─────────────────────┐
│ UTM Capture Script  │  → cookie + localStorage (30 days)
└─────────────────────┘
         │
         │  (user fills form, clicks submit)
         ▼
┌─────────────────────┐
│ Form Submit Handler │  → reads UTM from storage
│ (intercepts submit) │  → appends to FormData/URLSearchParams
└─────────────────────┘
         │
         ▼
POST /api/v1/submissions
  body: page_id, email, utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_url, referrer, user_agent
         │
         ▼
┌─────────────────────┐
│ validateAndNormalize│  → utm_page = page.slug || page.name || 'unknown'
│ Payload             │  → stores in Submission.payloadJson
└─────────────────────┘
         │
         ▼
Zapier webhook receives full payload (including all UTM fields)
```

## Files

| File | Purpose |
|------|---------|
| `packages/api/src/modules/serve/utm-scripts.ts` | Generates UTM capture, form submit handler, and countdown scripts |
| `packages/api/src/modules/serve/renderer.ts` | Injects scripts into `renderFullPageHtml()` |
| `packages/api/src/modules/submissions/submissions.service.ts` | Validates payload, derives `utm_page` |
| `packages/api/src/modules/submissions/submissions.routes.ts` | Merges body + query, accepts urlencoded |

## Cookie / Storage Details

- **Cookie name**: `replica_utm`
- **localStorage key**: `replica_utm`
- **TTL**: 30 days
- **Format**: JSON object, e.g. `{"utm_source":"google","utm_medium":"cpc"}`
