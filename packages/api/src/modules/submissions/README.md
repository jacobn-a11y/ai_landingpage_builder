# Submissions Module

Handles form submissions from published Replica Pages. Accepts the canonical payload, validates, stores, and queues delivery to integrations (Zapier Phase 1).

## Endpoints

### POST /api/v1/submissions (PUBLIC)

Accepts form submissions from published pages. **Rate limited: 10 req/min per IP.**

**Request body** (canonical payload from PRD 7.5):

- `page_id` (required) – Page ID
- `email` (required)
- `first_name`, `last_name`, `phone`, `company`, `title`
- `custom_fields` – key-value object
- `consent_fields` – key-value object (booleans)
- `page_name`, `page_slug`, `page_url`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_page` (required; derived from slug/name if missing)
- `referrer`, `landing_url`, `timestamp`, `user_agent`

UTM params can also be sent via query string (client persists from cookie/localStorage, 30-day TTL).

**Response:**

- `200` + `{ success: true }` for inline/modal success
- `302` redirect if form config has `successBehavior: 'redirect'` and `redirectUrl`

### GET /api/v1/submissions (authenticated, Editor+)

List submissions for workspace. Query: `?pageId=...` to filter by page.

### GET /api/v1/submissions/:id (authenticated, Editor+)

Get single submission.

## Security

- Rate limit: 10 req/min per IP on POST
- Optional: signed token per page (page-level secret in publishConfig) to reduce spoofing
- Validates `page_id` exists and page is published (`lastPublishedContentJson` present)
- Validates `email` is present

## Delivery

On new submission, queues Zapier delivery. Retries 3 times. Stores `deliveryStatus` and `deliveryAttempts` on Submission.
