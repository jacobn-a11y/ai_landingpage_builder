# Domains Module

Admin-only domain management for custom domain publishing.

## Purpose

Manages custom domains and subdomains for publishing landing pages. Supports verification via TXT and CNAME records, SSL status, and embedding controls.

## Verification Flow

1. **Draft** – User adds domain (hostname). On create, we generate:
   - `verificationTxt` = `rp-{randomToken}` for TXT record `_replica-verify.{hostname}`
   - `cnameTarget` = platform host (default `cname.replicapages.io`, configurable via `CNAME_TARGET` env)
2. **User adds DNS records** – TXT and CNAME per instructions.
3. **Verify** – POST `/api/v1/domains/:id/verify` performs DNS lookup:
   - Checks TXT at `_replica-verify.{hostname}` matches `verificationTxt`
   - Checks CNAME at `{hostname}` points to `cnameTarget`
4. **Active** – Both pass. **Error** – One or both fail; `verificationError` stores what's missing.
5. **Conflict** – UI warns: CNAME and A record cannot coexist at same hostname.
6. **Cloudflare** – When status is Error or PendingDNS, UI shows: "Set proxy to DNS-only (grey cloud) for CNAME verification."

## Exports

- `domainsRouter` – Express router for domain CRUD + verify
- `DomainStatus` – Enum: Draft, PendingDNS, Verifying, Active, Error
- `EmbedPolicy` – Enum: allow, deny
- `verifyDomain`, `getCnameTarget`, `getVerificationTxtName` – from `domains.verification.js`

## Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/domains | Add domain (hostname); generates verificationTxt and cnameTarget |
| GET | /api/v1/domains | List domains |
| GET | /api/v1/domains/:id | Get domain by id |
| POST | /api/v1/domains/:id/verify | Run DNS verification; updates status, verificationCheckedAt, verificationError |
| PATCH | /api/v1/domains/:id | Update status, embedPolicy, verification fields |
| DELETE | /api/v1/domains/:id | Delete domain |

## Fields

- `hostname` – Domain or subdomain (e.g. `landing.example.com`)
- `status` – Draft | PendingDNS | Verifying | Active | Error
- `verificationTxt` – TXT record value (e.g. `rp-{token}`) for `_replica-verify.{hostname}`
- `verificationCheckedAt` – Last verification check timestamp
- `verificationError` – Error details when status = Error
- `cnameTarget` – CNAME target (e.g. `cname.replicapages.io`)
- `sslStatus` – SSL certificate status
- `embedPolicy` – allow | deny (iframe embedding)

## Environment

- `CNAME_TARGET` – Platform host for CNAME (default: `cname.replicapages.io`)

## Access

Admin role only. Tenant-scoped by `workspaceId` from session.
