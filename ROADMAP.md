# Replica Pages - Product Roadmap

**Last updated:** 2026-03-06
**Product owner:** Jacob Nikolau
**PRD version:** 0.7

---

## Status Legend

| Icon | Meaning |
|------|---------|
| Done | Implemented and functional |
| In Progress | Partially implemented or underway |
| Not Started | Planned but no implementation yet |
| Backlog | Lower priority, not yet scheduled |

---

## Phase 1: MVP (Current)

### 1.1 Foundation & Infrastructure

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.1.1 | Monorepo scaffold (api, web, blocks) | Done | Turborepo with 3 packages |
| 1.1.2 | PostgreSQL + Prisma schema | Done | 12 models: Workspace, User, Invite, Folder, Domain, Page, Form, PageFormBinding, Submission, Integration, BlockLibraryFolder, BlockLibraryItem |
| 1.1.3 | Express API with module-based routing | Done | REST-style `/api/v1/{resource}`, tenant-scoped |
| 1.1.4 | React 18 + Vite + TypeScript SPA | Done | Client-rendered, SPA routing |
| 1.1.5 | shadcn/ui component library | Done | Radix UI primitives + Tailwind |
| 1.1.6 | Environment configuration | Done | `.env.example` with DATABASE_URL, SESSION_SECRET, OAuth vars |
| 1.1.7 | Dev tooling (Vitest, Supertest) | Done | 8 API test suites, 6 web test suites |

### 1.2 Authentication & User Management

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.2.1 | Google OAuth sign-in (Passport.js) | Done | Only supported login method |
| 1.2.2 | Session management | Done | httpOnly cookies, secure in production, 7-day maxAge |
| 1.2.3 | Workspace auto-creation on first sign-in | Done | First user becomes Admin |
| 1.2.4 | Allowed email domains per workspace | Done | Workspace model field |
| 1.2.5 | Role-based access control (Admin/Editor/Viewer) | Done | Consistent RBAC across routes |
| 1.2.6 | User invites with token + expiry | Done | Email invite flow with role assignment |
| 1.2.7 | User removal with immediate revocation | Done | DELETE endpoint |
| 1.2.8 | Dev auth bypass for localhost | Done | `BYPASS_AUTH_LOCALHOST=1` flag |

### 1.3 Drag-and-Drop Editor

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.3.1 | Canvas with @dnd-kit/core | Done | Drag-and-drop block placement |
| 1.3.2 | Layout blocks (Section, Container, Grid, Columns, Stack) | Done | 5 layout block types |
| 1.3.3 | Content blocks (Text, Image, Button, Divider, Spacer, Video, Countdown, Table) | Done | 8+ content block types including shapes |
| 1.3.4 | Pattern blocks (Hero, Features, Testimonials, FAQ, Logos) | Done | 5 pattern block types |
| 1.3.5 | Form block | Done | Native form placement in editor |
| 1.3.6 | Custom HTML embed block | Done | Raw HTML rendering (needs XSS sanitization - see P0 issues) |
| 1.3.7 | Layers tree with reorder, lock, hide | Done | EditorContext manages tree state |
| 1.3.8 | Properties panel for style and layout | Done | Universal props system |
| 1.3.9 | Undo/redo | Done | History stack in EditorContext |
| 1.3.10 | Autosave | Done | Periodic save of draft |
| 1.3.11 | Preview mode | Done | Matches publish output |
| 1.3.12 | Draft / last published snapshot versioning | Done | `contentJson` + `lastPublishedContentJson` |
| 1.3.13 | Rollback to last published | Done | Restore from snapshot |

### 1.4 Responsive-by-Design

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.4.1 | Fluid containers with max-width | Done | Default layout behavior |
| 1.4.2 | Flex and grid layouts | Done | Grid and Columns blocks |
| 1.4.3 | Auto and percent sizing | Done | Universal props |
| 1.4.4 | Responsive images with aspect ratio | Done | BlockImage component |
| 1.4.5 | Desktop / Tablet / Mobile breakpoints | Done | Breakpoint system |
| 1.4.6 | Device presets in editor | Done | Preview at different widths |
| 1.4.7 | Width scrubber | In Progress | Basic implementation |
| 1.4.8 | Overflow/fixed-width warnings | Not Started | QA warning system |

### 1.5 HTML Import & Replication

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.5.1 | HTML file + assets upload | Done | ImportPageDialog, UploadPageModal |
| 1.5.2 | MHTML import support | Done | Single-file import path |
| 1.5.3 | ZIP archive import | Done | Extract and process |
| 1.5.4 | Convert to blocks where possible | Done | HTML-to-block parser |
| 1.5.5 | Custom HTML fallback for unmappable regions | Done | Graceful degradation |
| 1.5.6 | Form detection in imported HTML | Done | `pages.forms.ts` detects form elements |
| 1.5.7 | Block library extraction from imports | Done | BlockLibraryFolder + BlockLibraryItem models |

### 1.6 Forms

#### 1.6.1 Existing Form Mapping & Hooking (Primary)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.6.1a | Detect forms in imported content (inc. Custom HTML) | Done | CSS selector-based detection |
| 1.6.1b | Visual click-to-select in preview | Done | FormMappingModal |
| 1.6.1c | List view with identifiers | Done | Form candidate listing |
| 1.6.1d | Auto-suggest field mapping (name, id, label, type) | Done | Heuristic matching |
| 1.6.1e | Custom field support | Done | Key-value mappings |
| 1.6.1f | Submit interception (prevent default) | Done | Client-side hook script |
| 1.6.1g | Hidden field extraction | Done | Included in payload normalization |
| 1.6.1h | Success behavior (inline message, redirect, modal) | Done | Configurable via publishConfig |

#### 1.6.2 Native Form Builder

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.6.2a | Field types (Text, Email, Phone, Textarea, Dropdown, Checkbox, Radio, Hidden) | Done | FormBuilderFeature |
| 1.6.2b | Required + email validation | Done | Built-in validators |
| 1.6.2c | Consent checkbox support | Done | Field type option |
| 1.6.2d | Forms library (save, reuse, basic versioning) | Done | Form model with version field |

### 1.7 Submission Pipeline & Attribution

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.7.1 | Canonical payload (first_name, last_name, email, phone, company, title, custom fields, consent) | Done | Normalized schema |
| 1.7.2 | Page context fields (page_id, page_name, page_slug, page_url) | Done | Included in payload |
| 1.7.3 | UTM fields (source, medium, campaign, term, content) | Done | UTM capture flow |
| 1.7.4 | utm_page (derived from slug or name) | Done | Auto-derived, always present |
| 1.7.5 | Referrer and landing_url capture | Done | Client-side capture |
| 1.7.6 | Timestamp and user_agent | Done | Server-side enrichment |
| 1.7.7 | UTM persistence (cookie/localStorage, 30-day TTL) | Done | utm-scripts.ts |
| 1.7.8 | Rate limiting on submission endpoint | Done | 10/min per IP |
| 1.7.9 | Delivery status tracking (pending/delivered/failed) | Done | deliveryAttempts JSON |

### 1.8 Integrations

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.8.1 | Zapier webhook integration | Done | Signed webhook with retries |
| 1.8.2 | Integration CRUD endpoints | Done | integrations.routes.ts |
| 1.8.3 | Test webhook endpoint | Done | Verify connectivity |
| 1.8.4 | Delivery queue with retry logic | Done | submissions.delivery.ts |

### 1.9 Pages Library, Folders & Cloning

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.9.1 | Folder hierarchy (nested folders) | Done | Folder model with parentId |
| 1.9.2 | Pages organized in folders | Done | Page.folderId |
| 1.9.3 | Clone page from library | Done | Copies layout, content, scripts, form bindings, routing |
| 1.9.4 | Unique slug enforcement on clone | Done | workspaceId + slug unique constraint |
| 1.9.5 | Block library (folders + items from imports) | Done | library.routes.ts |

### 1.10 Scripts & Allowlists

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.10.1 | Global header/footer scripts (admin only) | Done | Workspace model fields |
| 1.10.2 | Page header/footer scripts (in builder) | Done | Page.scripts JSON |
| 1.10.3 | Script allowlist (domains, path prefixes) | Done | Workspace.scriptAllowlist |
| 1.10.4 | CSP derived from allowlist | Done | csp.ts module |
| 1.10.5 | Clone preserves page scripts and form wiring | Done | Clone copies scripts + bindings |

### 1.11 Admin Domains Workflow

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.11.1 | Add domain/subdomain | Done | domains.routes.ts |
| 1.11.2 | Status states (Draft, PendingDNS, Verifying, Active, Error) | Done | Domain.status enum |
| 1.11.3 | TXT verification record generation | Done | verificationTxt field |
| 1.11.4 | CNAME target display | Done | cnameTarget field |
| 1.11.5 | Verification loop (TXT first, then traffic) | Done | domains.verification.ts |
| 1.11.6 | Last checked time display | Done | verificationCheckedAt |
| 1.11.7 | Error details on failure | Done | verificationError field |
| 1.11.8 | Block publishing until Active | Done | Status check before publish |
| 1.11.9 | SSL status tracking | Done | sslStatus field |
| 1.11.10 | Disable domain | Done | Status management |

### 1.12 Publishing

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.12.1 | Demo domain publishing | Done | serve.routes.ts, workspace-scoped demo URLs |
| 1.12.2 | Custom domain via CNAME publishing | Done | Domain-based serving |
| 1.12.3 | Subdirectory publishing under connected subdomain | Done | Path-based routing |
| 1.12.4 | Publish / unpublish actions | Done | publishing.routes.ts, publishing.service.ts |
| 1.12.5 | Schedule publish at / unpublish at | Done | scheduleConfig JSON |
| 1.12.6 | Schedule timed updates | In Progress | Basic scheduling; cron/worker reliability TBD |
| 1.12.7 | URL redirects per domain | Done | Domain.redirects JSON (301/302) |
| 1.12.8 | Custom 404 page per domain | Done | Domain.custom404PageId |
| 1.12.9 | Global 404 redirect URL | Done | Workspace.notFoundRedirectUrl |
| 1.12.10 | Embedding controls (allow/deny iframe) | Done | Domain.embedPolicy |
| 1.12.11 | Security headers (HSTS, X-Content-Type-Options, X-Frame-Options/CSP frame-ancestors) | Done | Serve route headers |
| 1.12.12 | Dynamic text substitution (URL params) | Done | `{{param}}` in renderer (needs sanitization - see P1 issues) |

---

## Phase 2: Expanded Publishing & Integrations

### 2.1 Salesforce Integration

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.1.1 | Salesforce OAuth connection | Not Started | Admin connects Salesforce org |
| 2.1.2 | Create Lead on submission | Not Started | Default object mapping |
| 2.1.3 | Field mapping UI (canonical -> Salesforce fields) | Not Started | |
| 2.1.4 | Dedupe by email | Not Started | Upsert logic |
| 2.1.5 | Retry logic with exponential backoff | Not Started | Reuse delivery queue pattern |

### 2.2 WordPress Publishing Mode

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.2.1 | WordPress plugin design & packaging | Not Started | Plugin serves RP pages under site subdirectory |
| 2.2.2 | API token authentication between WP and RP | Not Started | Secure handshake |
| 2.2.3 | Page content sync (push from RP to WP) | Not Started | On publish action |
| 2.2.4 | Cache-busting on publish/unpublish | Not Started | WP caching compatibility |
| 2.2.5 | Troubleshooting surface (caching, token issues) | Not Started | In-app diagnostics |
| 2.2.6 | Redirect support via WP plugin | Not Started | Map RP redirects to WP rules |
| 2.2.7 | Custom 404 via WP plugin | Not Started | Map RP 404 config |

### 2.3 Drupal Publishing Mode

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.3.1 | Drupal module design & packaging | Not Started | Module serves RP pages under site subdirectory |
| 2.3.2 | API token authentication between Drupal and RP | Not Started | Secure handshake |
| 2.3.3 | Page content sync (push from RP to Drupal) | Not Started | On publish action |
| 2.3.4 | Redirect support via Drupal module | Not Started | Map RP redirects |
| 2.3.5 | Custom 404 via Drupal module | Not Started | Map RP 404 config |

### 2.4 Cloudflare-Specific Enhanced Diagnostics

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.4.1 | Detect Cloudflare-proxied CNAME | Not Started | DNS lookup during verification |
| 2.4.2 | Surface DNS-only warning when proxied | Not Started | Clear UI guidance with fix steps |
| 2.4.3 | Auto-retry verification after user action | Not Started | Poll after user confirms DNS change |

### 2.5 SSL & CAA Guidance

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.5.1 | SSL provisioning state surface (up to 48h messaging) | In Progress | sslStatus field exists; UI messaging TBD |
| 2.5.2 | CAA record detection | Not Started | Check for CAA records during verification |
| 2.5.3 | Guidance to add pki.goog for certificate issuance | Not Started | In-app instructions when CAA blocks SSL |
| 2.5.4 | Note that WP/Drupal SSL is CMS-side | Not Started | Documentation/UI callout |

### 2.6 Naked Domain & WWW Handling

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.6.1 | Redirect strategy for naked domain -> subdomain | Not Started | Guide users to set up redirect |
| 2.6.2 | Support publishing to www when no conflicting record | Not Started | Detect A/AAAA conflicts |
| 2.6.3 | DNS conflict detection and guidance | Not Started | Surface clear instructions |

---

## Phase 3: Advanced Publishing & Packaging

### 3.1 Webflow Data API CMS Publishing

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 3.1.1 | Webflow OAuth connection | Not Started | Admin connects Webflow site |
| 3.1.2 | Select exactly one CMS collection | Not Started | Admin picks target collection |
| 3.1.3 | Create/update items in selected collection | Not Started | Push page content as CMS items |
| 3.1.4 | Marker field (rp_page_id) for owned items | Not Started | Only overwrite tool-managed items |
| 3.1.5 | Never modify other Webflow content | Not Started | Strict scope enforcement |
| 3.1.6 | Webflow-friendly subdomain publishing | Not Started | Domain managed by IT, pages by RP |
| 3.1.7 | Optional iframe embed (safe default) | Not Started | X-Frame-Options / CSP controls |
| 3.1.8 | Optional script embed (advanced, CSP-aware) | Not Started | Respect embedding headers |

### 3.2 Reverse Proxy Path Publishing

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 3.2.1 | Reverse proxy serving mode | Not Started | Customer routes path prefix to RP |
| 3.2.2 | Path prefix configuration | Not Started | Admin sets path prefix per domain |
| 3.2.3 | Redirect support in proxy mode | Not Started | Apply redirect rules |
| 3.2.4 | Clear "advanced" labeling | Not Started | UI guidance for setup complexity |

### 3.3 Self-Hosting GA Packaging

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 3.3.1 | Docker image(s) for API + web | Not Started | Production-ready containers |
| 3.3.2 | Docker Compose for local deployment | Not Started | All-in-one dev/staging setup |
| 3.3.3 | Helm chart or deployment manifests | Not Started | Kubernetes-ready |
| 3.3.4 | Configuration documentation | Not Started | Env vars, DB setup, SSL, DNS |

---

## Cross-Cutting: Security & Quality Hardening

Priority items identified by code audit (2026-03-05). These should be addressed in parallel with feature work.

### P0 - Critical (Address Immediately)

| # | Item | Status | Notes |
|---|------|--------|-------|
| S.1 | Add CSRF protection for all mutation endpoints | Not Started | Architecture doc specifies but not implemented |
| S.2 | Sanitize custom HTML in BlockCustomHtml and renderer | Not Started | `dangerouslySetInnerHTML` without sanitization; DOMPurify recommended |

### P1 - High (Within 1-2 Sprints)

| # | Item | Status | Notes |
|---|------|--------|-------|
| S.3 | Escape/sanitize URL param values in `replaceDynamicText` | Not Started | XSS via `{{param}}` substitution |
| S.4 | Validate `redirectUrl` in submissions (block javascript:/data: URLs) | Not Started | Open redirect risk |
| S.5 | Add React ErrorBoundary and toast notification system | Not Started | Silent `.catch(() => {})` throughout |
| S.6 | Add Zod for request body validation | Not Started | Replace ad hoc `typeof` checks |
| S.7 | Add ESLint + Prettier | Not Started | Currently only `tsc --noEmit` |
| S.8 | Use `select` instead of `include` for pages list and serve workspace | Not Started | Over-fetching full contentJson |

### P2 - Medium (Within 2-4 Sprints)

| # | Item | Status | Notes |
|---|------|--------|-------|
| S.9 | Encrypt integration config at rest | Not Started | `configEncrypted` stores plain JSON |
| S.10 | Add API tests for folders, forms, users, integrations, library, serve | Not Started | Major coverage gaps |
| S.11 | Route-level code splitting (React.lazy) | Not Started | All features loaded eagerly |
| S.12 | Extract shared slugify to blocks package | Not Started | Duplicated in 4 places |
| S.13 | Unify FormFieldSchema across packages | Not Started | 4 different definitions |
| S.14 | Split EditorContext (~900 lines, 40+ values) | Not Started | Re-render performance issues |
| S.15 | Add CONTRIBUTING.md and first-run docs | Not Started | Onboarding gaps |
| S.16 | Add pagination for list endpoints | Not Started | Pages, forms, domains unbounded |

### P3 - Low (Backlog)

| # | Item | Status | Notes |
|---|------|--------|-------|
| S.17 | Add E2E tests (Playwright/Cypress) | Not Started | Critical flows untested end-to-end |
| S.18 | Add bundle analyzer + manualChunks in Vite | Not Started | Chunks exceed 500kB |
| S.19 | Add OpenAPI/Swagger spec | Not Started | No machine-readable API docs |
| S.20 | Add Mermaid diagrams for auth, submissions, publishing flows | Not Started | Only UTM has ASCII diagram |
| S.21 | Add Cache-Control/ETag headers for serve responses | Not Started | No caching headers |
| S.22 | Accessibility improvements (aria-labels, keyboard nav) | Not Started | Icon-only buttons, BlockButton missing onKeyDown |

---

## Success Metrics

Track these to measure product health and feature completeness:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first published page | < 10 min | Import -> map form -> publish to demo |
| Time to first successful submission from imported form | < 10 min | End-to-end with mapped form |
| Submission delivery success rate | > 99% | Delivered / total submissions |
| Submissions with utm_page | 100% | Always derived from slug/name |
| Domain verification success rate | > 95% | Active / total domain attempts |
| Publish success rate by target type | > 99% | Per target: demo, custom domain |
| Scheduling reliability | > 99% | Executed within acceptable window |
| Admin workspace + invite | < 2 min | Create workspace, invite user |

---

## Non-Goals (V1)

These are explicitly out of scope and should not be pursued:

- Full website builder, CMS, or ecommerce
- A/B testing and personalization suite
- Perfect HTML-to-block conversion for every pattern (must degrade gracefully)
- Server-side rendered admin UI
- Building a custom component library from scratch

---

## Principles

1. **Simple default path** - Advanced options exist but are not required
2. **Keep the imported form** - Map it once, it works
3. **Publishing should feel like choosing a destination and pressing publish**
4. **DNS friction handled with guided setup** - Clear status, demo domain fallback when production DNS isn't ready
