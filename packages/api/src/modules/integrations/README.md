# Integrations Module

Manages workspace integrations (Zapier, Salesforce, Webflow). Admin-only.

## Endpoints

### GET /api/v1/integrations (Admin)

List integrations. Config is masked (e.g. webhook URL partially hidden).

### GET /api/v1/integrations/:id (Admin)

Get single integration. Config partially masked for display.

### POST /api/v1/integrations (Admin)

Create integration.

**Zapier:**

```json
{
  "type": "zapier",
  "config": { "webhookUrl": "https://hooks.zapier.com/..." }
}
```

### PATCH /api/v1/integrations/:id (Admin)

Update integration config (e.g. webhook URL).

### POST /api/v1/integrations/:id/test (Admin)

Send a test payload to the Zapier webhook. Returns `{ ok: true }` on success, or 502 with error details on failure.

### DELETE /api/v1/integrations/:id (Admin)

Remove integration.

## Zapier Delivery

When a new Submission is created, the submissions module POSTs the canonical payload to each Zapier webhook URL. Retries 3 times with 2s delay. Delivery status stored on Submission.
