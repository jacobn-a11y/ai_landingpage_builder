# Replica Pages

Replica Pages is a landing page platform for importing HTML, editing with a drag-and-drop builder, mapping forms, and publishing to demo or custom domains.

## Quick start

```bash
# Install dependencies
npm install

# Set up environment (copy from .env.example)
cp .env.example .env

# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# Start dev server (API + web)
npm run dev
```

- **API**: http://localhost:3001
- **Web**: http://localhost:5173

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for session signing (required in production) |
| `WEB_URL` | Frontend URL (e.g. http://localhost:5173) |
| `API_URL` | API URL (e.g. http://localhost:3001) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CNAME_TARGET` | CNAME target for custom domains (e.g. cname.replicapages.io) |
| `BYPASS_AUTH_LOCALHOST` | Set to `1` to skip Google OAuth on localhost (dev only) |

See `.env.example` for full list.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API and web in dev mode |
| `npm run build` | Build all packages |
| `npm run test` | Run tests in api and web packages |
| `npm run lint` | Type-check all packages |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database (dev) |

## Tests

```bash
# Run all tests
npm run test

# Run API tests only
npm run test -w @replica-pages/api

# Run web tests only
npm run test -w @replica-pages/web
```

## Documentation

See [docs/README.md](docs/README.md) for architecture, HTML import, UTM flow, and block library documentation.

---

# PRD: Replica Pages, Responsive Landing Pages from HTML Import or Drag and Drop Builder, Existing Form Mapping plus Native Forms, Multi-Channel Publishing, Script Allowlists, Admin Domains Workflow, and Google OAuth Provisioning

## Document control
- Product: Replica Pages (working name)
- Owner: Jacob Nikolau
- Status: Draft
- Last updated: 2026-03-05
- Version: 0.7

---

## 1) Executive summary

Replica Pages is a landing page platform that lets teams:

- Import an existing landing page via HTML upload and replicate it as a hosted page.
- Edit pages in a modern drag and drop builder with responsive-by-design output that resizes intuitively across devices and browsers.
- Standardize lead capture so that forms, whether already present in imported HTML (mapped and hooked) or added as new native forms, route through the same predictable backend data flow.
- Publish through multiple methods modeled on what teams expect from modern landing page platforms:
  - Custom domain publishing via CNAME on a subdomain
  - Path publishing through WordPress and Drupal
  - Demo domain publishing for testing
  - Webflow-friendly subdomain publishing
  - Optional Webflow Data API CMS publishing with restricted overwrite rules
  - Optional embedding
  - Optional path hosting via reverse proxy (advanced)
- Support operational publishing features:
  - Scheduling (publish, unpublish, timed updates)
  - Custom 404 per publish target
  - URL redirects
  - Security headers and embedding controls
  - SSL and HTTPS handling with common DNS edge cases like Cloudflare proxying and CAA records

UX and UI requirements:
- The admin application is a client-rendered React SPA.
- Use a well-known free component library used by SaaS startups, avoid bespoke UI primitives, avoid SSR for the app UI.
- Simple sign-up and user provisioning using Sign in with Google OAuth only.

---

## 2) Problem statement

Teams build landing pages across Webflow, agency HTML, and internal tools. The recurring issues:
- Editing and iteration are slow, especially when a page starts as HTML.
- Imported pages often already contain forms, teams want to map that form to required fields and have it work without embedding a new form.
- Data routing and attribution vary page-by-page, creating operational risk and broken reporting.
- Publishing to production URLs is blocked by DNS complexity, SSL delays, Cloudflare proxy settings, naked domain behavior, and CMS constraints.
- Teams need multiple publishing paths depending on how their website is managed, including WordPress and Drupal subdirectory publishing, and a demo publishing mode for testing. :contentReference[oaicite:0]{index=0}

Replica Pages solves this by combining import and editing, existing-form mapping plus native forms, a normalized submission pipeline, and a publishing system that supports the common real-world flows and edge cases. :contentReference[oaicite:1]{index=1}

---

## 3) Goals, non-goals, and principles

### 3.1 Goals
- Import HTML, replicate, and allow drag and drop editing.
- Responsive-by-design output, intuitive resizing across displays and browsers.
- Existing form mapping and hooking is first-class:
  - Detect forms in imported HTML.
  - Map fields to required schema.
  - Make the existing form submit through the canonical pipeline without embedding a new form.
- Native form builder also supported:
  - Add a new form, reuse forms, embed in builder pages.
- Standardized submission pipeline destinations:
  - Salesforce native integration, or Zapier integration.
- Attribution:
  - Capture UTMs, persist across session, always include utm_page derived from page slug or name.
- Library:
  - Pages stored in folders, clone pages from library, clones include page-level scripts and form wiring.
- Publishing support must include the major flow families:
  - Custom domain via CNAME
  - Demo domain for testing
  - WordPress plugin style publishing under a subdirectory
  - Drupal module style publishing under a subdirectory
  - Subdirectories under a connected subdomain
  - Naked domain and www handling via redirect strategy
  - SSL and HTTPS provisioning behavior
  - Cloudflare CNAME issues and guidance
  - Custom 404, URL redirects, scheduling, security headers and embedding controls :contentReference[oaicite:2]{index=2}
- Auth and provisioning:
  - Google OAuth only.
  - Admin-controlled users and roles.

### 3.2 Non-goals for V1
- Full website builder, CMS, ecommerce.
- A/B testing and personalization suite.
- Perfect HTML-to-block conversion for every pattern, must degrade gracefully.
- Server-side rendered admin UI.
- Building a custom component library from scratch.

### 3.3 Principles
- Simple default path, advanced options exist but are not required.
- Keep the imported form if it exists, map it once, it works.
- Publishing should feel like choosing a destination and pressing publish.
- Domain and DNS friction must be handled with guided setup, clear status, and the ability to publish to a demo domain when production DNS is not ready. :contentReference[oaicite:3]{index=3}

---

## 4) UX and UI implementation requirements

### 4.1 Admin application UI
- Client-rendered React SPA, no SSR requirement for the app UI.
- Standard SPA routing.
- Consistent patterns across pages, forms, publishing, and settings.

### 4.2 Component library requirement
Use one primary, well-known, free component library commonly used by SaaS startups, and use it consistently. Examples:
- shadcn/ui
- Chakra UI
- Mantine
- Material UI (free tier)

### 4.3 UX quality requirements
- IA and nav:
  - Pages
  - Forms
  - Submissions
  - Publishing
  - Domains
  - Integrations
  - Scripts
  - Users
  - Settings
- Progressive disclosure:
  - Most marketers should complete Import, Map Form, Publish without leaving the page workflow.
- Strong status surfaces:
  - DNS status, SSL status, publish status, scheduling status.

Acceptance criteria:
- A marketer can import a page with an existing form, map fields, publish to a demo domain, and see submissions routed correctly in under 10 minutes.
- An admin can create a workspace and invite a user in under 2 minutes.

---

## 5) Personas and user stories

### 5.1 Personas
- Demand Gen Marketer
- RevOps
- Admin

### 5.2 Primary user stories
- Import HTML, keep the existing form, map it, publish, receive leads.
- Add a native form when needed.
- Clone a page from the library, including scripts and form behavior.
- Publish via:
  - Custom domain subdomain (CNAME)
  - Demo domain (testing)
  - WordPress path
  - Drupal path
  - Webflow subdomain
  - Webflow API CMS collection, restricted overwrite
- Schedule publish and unpublish.
- Configure redirects and custom 404.
- Control embedding and security headers.

---

## 6) Product scope overview

### 6.1 Page creation
- Builder mode
- Import mode with editable conversion where possible and Custom HTML blocks as fallback

### 6.2 Forms, both required
1) Existing form mapping and hooking (primary):
- Map imported forms to schema and intercept submit.

2) Native forms:
- Create and insert a platform form block, save reusable forms.

### 6.3 Publishing destinations, all required to support
- Demo domain publishing for testing :contentReference[oaicite:4]{index=4}
- Custom domain publishing via CNAME to a subdomain :contentReference[oaicite:5]{index=5}
- Subdirectories under a connected subdomain :contentReference[oaicite:6]{index=6}
- WordPress publishing under site subdirectory, via plugin style integration :contentReference[oaicite:7]{index=7}
- Drupal publishing under site subdirectory, via module style integration :contentReference[oaicite:8]{index=8}
- Webflow-friendly subdomain publishing, plus optional embed
- Optional Webflow API publishing to CMS, restricted to one collection, overwrite only tool-managed items
- Optional reverse proxy path publishing (advanced)

### 6.4 Publishing operations, all required to support
- Scheduling publish, unpublish, scheduled updates :contentReference[oaicite:9]{index=9}
- SSL and HTTPS management, including CAA edge case handling :contentReference[oaicite:10]{index=10}
- Cloudflare CNAME handling, DNS-only requirement for some setups :contentReference[oaicite:11]{index=11}
- Naked domain and www handling via redirect strategy :contentReference[oaicite:12]{index=12}
- URL redirects capability :contentReference[oaicite:13]{index=13}
- Custom 404 page support per publish target :contentReference[oaicite:14]{index=14}
- Security headers and embedding controls, including X-Frame-Options behavior :contentReference[oaicite:15]{index=15}

---

## 7) Functional requirements

## 7.1 Drag and drop editor
- Blocks:
  - Layout: Section, Container, Grid, Columns, Stack
  - Content: Text, Image, Button, Divider, Spacer
  - Pattern: Hero, Features, Testimonials, FAQ, Logos
  - Forms: Form block
  - Embed: Custom HTML block
- Editing:
  - Canvas drag and drop
  - Layers tree, reorder, lock, hide
  - Properties panel for style and layout
  - Undo, redo, autosave
  - Preview mode matches publish output
- Versioning:
  - Draft and last published snapshot
  - Roll back to last published

---

## 7.2 Responsive-by-design
- Defaults:
  - Fluid containers with max-width
  - Flex and grid layouts
  - Auto and percent sizing
  - Responsive images preserve aspect ratio
- Breakpoints:
  - Desktop, Tablet, Mobile
  - Smaller breakpoints do not override desktop unless explicitly set
- QA tools:
  - Device presets
  - Width scrubber
  - Basic warnings for overflow and risky fixed widths

---

## 7.3 HTML import and replication
- Inputs:
  - HTML file plus assets folder, or zip
- Import outcomes:
  - Convert to blocks where possible
  - Fallback to Custom HTML blocks for unmappable regions
- Form detection:
  - Detect all form elements and list them as candidates for mapping and hooking

---

## 7.4 Forms

### 7.4.1 Existing forms on imported pages, map and hook (primary)
Requirements:
- Detect forms in imported content, including inside Custom HTML blocks.
- Select form:
  - Visual click-to-select in preview
  - List view with identifiers
- Map fields:
  - Auto-suggest based on name, id, label, placeholder, type
  - Support custom fields
- Submit interception:
  - Prevent default submit by default
  - Extract values, including hidden fields
  - Normalize into canonical payload
  - Send to backend submit endpoint
  - Success behavior: inline message, redirect, modal

Acceptance criteria:
- An imported page with an existing form can be published and routed without embedding a new form.

### 7.4.2 Native form builder, insert and reuse (also required)
- Field types: Text, Email, Phone, Textarea, Dropdown, Checkbox, Radio, Hidden
- Validation: required, email format
- Consent checkbox support
- Forms library: save, reuse, basic versioning

---

## 7.5 Canonical submission payload and attribution
- Canonical fields:
  - first_name, last_name, email, phone
  - company, title
  - custom fields key-value
  - consent fields
  - page_id, page_name, page_slug, page_url
  - utm_source, utm_medium, utm_campaign, utm_term, utm_content
  - utm_page required, derived from slug or name
  - referrer, landing_url
  - timestamp, user_agent
- UTM persistence:
  - cookie or local storage TTL default 30 days

---

## 7.6 Integrations and routing
- Zapier:
  - signed webhook, retries, replay
- Salesforce:
  - OAuth, create Lead initially, field mapping, dedupe by email, retries

---

## 7.7 Scripts and allowlists
- Global scripts, admin only:
  - global header code
  - global footer code
- Page scripts, configured in builder:
  - page header code
  - page footer code
- Allowlist:
  - admin-managed domains and subdomains
  - optional path constraints
- Enforcement:
  - CSP derived from allowlist
- Clone behavior:
  - cloning a page copies page scripts and form wiring

---

## 7.8 Pages library, folders, cloning
- Pages saved in a library with folders.
- Clone from library:
  - layout and content
  - page scripts
  - existing-form mappings and selectors, plus native form placements
  - routing settings
  - publish settings except slug must be unique

---

## 7.9 Auth, users, provisioning, Google OAuth only

### 7.9.1 Auth method
- Sign in with Google OAuth is the only supported interactive login.

### 7.9.2 Admin sign-up
- First user to sign in with a new email domain creates a workspace and becomes admin.
- Admin sets:
  - allowed email domains
  - invite policy for externals

### 7.9.3 User management
- Admin can:
  - invite by email
  - assign role
  - remove users, access revoked immediately
- Roles:
  - Admin: domains, publishing, scripts allowlist, integrations, users
  - Editor: pages, imports, form mapping, publish within allowed targets
  - Viewer: read-only

---

## 8) Publishing system, destinations and required flows

## 8.1 Publish target types
The platform must implement all of these target families.

### 8.1.1 Demo domain publishing
- Provide a demo domain for testing and previews.
- Intended for QA and internal review, not long-term production. :contentReference[oaicite:16]{index=16}

### 8.1.2 Custom domain publishing via CNAME
- Support connecting subdomains via CNAME and publishing pages there. :contentReference[oaicite:17]{index=17}
- Include subdirectory publishing under that connected subdomain so a single connected subdomain can host many pages. :contentReference[oaicite:18]{index=18}

### 8.1.3 Cloudflare CNAME compatibility
- If customer uses Cloudflare, support the DNS-only requirement, and surface a clear warning when proxying is enabled. :contentReference[oaicite:19]{index=19}

### 8.1.4 Naked domain and www handling
- Prefer publishing to a subdomain, and support root domain via redirect strategy.
- Support publishing to www when the customer chooses to repoint it and there is no conflicting record. :contentReference[oaicite:20]{index=20}

### 8.1.5 WordPress publishing
- Support a publishing mode where landing pages are served as a subdirectory of the main site, via a WordPress plugin style integration. :contentReference[oaicite:21]{index=21}
- Include troubleshooting surface for common issues like caching and token misconfiguration. :contentReference[oaicite:22]{index=22}

### 8.1.6 Drupal publishing
- Support a publishing mode where landing pages are served as a subdirectory of the main site, via a Drupal module style integration. :contentReference[oaicite:23]{index=23}

### 8.1.7 Webflow publishing
- Support Webflow-friendly subdomain publishing (domain managed by IT, pages managed by Replica Pages).
- Optional embedding:
  - iframe embed safe default
  - script embed advanced option, must respect CSP and embedding headers

### 8.1.8 Webflow Data API CMS publishing, optional
- Admin selects exactly one Webflow CMS collection.
- Tool may create and update items only in that collection.
- Tool may overwrite only items it created, marker field required, for example rp_page_id.
- Tool must never modify other Webflow content.

### 8.1.9 Reverse proxy path publishing, advanced
- Provide a mode where customer routes a path prefix to Replica Pages via their proxy layer.
- This is advanced and must be clearly labeled.

---

## 9) Publishing operations, required features

### 9.1 Scheduling
- Per page scheduling:
  - publish at
  - unpublish at
  - schedule updates to go live at a specific time :contentReference[oaicite:24]{index=24}

### 9.2 SSL and HTTPS
- Automatic HTTPS for custom domain CNAME published pages where platform is the host.
- Surface SSL provisioning state, allow up to 48 hours in UI messaging.
- If customer has a CAA record, provide required guidance and support to add pki.goog when needed for certificate issuance. :contentReference[oaicite:25]{index=25}
- For WordPress and Drupal publishing, SSL is owned by the CMS side. :contentReference[oaicite:26]{index=26}

### 9.3 URL redirects
Replica Pages must provide URL redirect capability as a first-class feature:
- Create redirects within a publish target, for example:
  - /old -> /new (301 or 302)
- Redirect rules must apply for:
  - custom domain publishing
  - demo domain publishing
  - reverse proxy mode
- For WordPress and Drupal, support redirects via plugin/module configuration, or surface guidance and integrate if feasible.

Reference point:
- Instapage explicitly calls out redirects as an operational need and describes alternative methods when not native. Replica Pages should implement the redirect manager natively. :contentReference[oaicite:27]{index=27}

### 9.4 Custom 404 pages
- Support custom 404 configuration per domain or per publish target:
  - Choose a published page as the 404 page for that domain or site. :contentReference[oaicite:28]{index=28}
- WordPress and Drupal modes:
  - Support mapping a published page as 404 via plugin/module configuration where possible. :contentReference[oaicite:29]{index=29}

### 9.5 Security headers and embedding controls
- Provide default security headers for hosted pages, including:
  - HSTS
  - X-Content-Type-Options
  - X-Frame-Options or CSP frame-ancestors controls
- Provide an admin setting per domain:
  - Allow embedding (for iframe use cases) or deny embedding (clickjacking protection). :contentReference[oaicite:30]{index=30}

---

## 10) Admin Domains workflow, setup and verification

### 10.1 Admin-only Domains area
- Add domain or subdomain
- Status: Draft, Pending DNS, Verifying, Active, Error
- Disable domain

### 10.2 Setup methods
- Manual DNS setup for any DNS provider.
- Provider-specific guided views for common providers (optional), not required to ship, but the workflow must handle the same outcomes.

### 10.3 Records and conflicts
- Show required records for:
  - Verification (TXT)
  - Traffic (CNAME preferred for subdomains, A record only when required by architecture)
- Surface conflict detection and guidance:
  - CNAME conflicts with A records at same name
  - Cloudflare proxied versus DNS-only warning :contentReference[oaicite:31]{index=31}

### 10.4 Verification loop
- Verify TXT first, then traffic record.
- Do not allow publishing to domain until Active.
- Show last checked time, and clear missing record instructions.

---

## 11) Security requirements, right-sized
- Tenant isolation: pages, assets, forms, submissions, integrations.
- Encryption at rest for integration tokens.
- Submission endpoint protections:
  - rate limiting
  - signed tokens to reduce spoofing
- Script security:
  - allowlist and CSP enforcement
- Privacy controls:
  - configurable submission storage and masking in UI

---

## 12) Data model, high level
- Workspace, allowed email domains, policies
- User, role, Google identity
- Invite
- Folder
- Domain, status, required records, SSL status, embed policy
- Page, versions, scripts, publish config, schedule config
- Form, versions
- PageFormBinding:
  - native placements
  - hooked form selectors and mappings
- Submission, delivery attempts
- Integrations: Zapier, Salesforce, Webflow

---

## 13) Success metrics
- Time to first published page.
- Time to first successful submission from an imported existing form.
- Submission delivery success rate.
- Percentage of submissions with utm_page, target 100 percent.
- Domain verification success rate.
- Publish success rate by target type: custom domain, demo, WordPress, Drupal, Webflow.
- Scheduling reliability: percent scheduled publishes executed within acceptable window.

---

## 14) Rollout plan

### Phase 1, MVP
- React SPA admin app using a standard free SaaS component library.
- Google OAuth sign-in, invites, roles.
- Drag and drop editor, responsive-by-design.
- HTML import with Custom HTML fallback.
- Existing form mapping and hooking.
- Native forms and forms library.
- Zapier integration.
- UTM tracking and utm_page.
- Pages library, folders, cloning.
- Scripts allowlist, global scripts admin-only, page scripts in builder, CSP.
- Domains admin workflow with verification.
- Publishing:
  - Demo domain publishing
  - Custom domain via CNAME publishing with subdirectories
  - Scheduling
  - Basic 404 and redirects support
  - Embedding controls and headers

### Phase 2
- Salesforce integration.
- WordPress publishing mode.
- Drupal publishing mode.
- Cloudflare-specific enhanced diagnostics.
- SSL CAA guidance and automation.

### Phase 3
- Webflow Data API CMS publishing with restricted overwrite model.
- Reverse proxy path publishing.
- Self-hosting GA packaging.

---

## 15) Acceptance test checklist

### UI and auth
- Client-rendered React SPA, consistent use of chosen component library.
- Admin self-signup with Google.
- Invite user, user joins via Google.
- Remove user, access revoked.

### Import with existing form mapping
- Import HTML with a form.
- Detect form, map fields.
- Publish to demo domain, submit, verify payload and delivery.
- Publish to custom domain, submit, verify delivery.

### Native form
- Add a native form to a page, publish, submit, verify delivery.

### Publishing targets
- Demo domain works for preview and QA. :contentReference[oaicite:32]{index=32}
- Custom domain CNAME works, subdirectory paths work. :contentReference[oaicite:33]{index=33}
- Cloudflare DNS-only guidance surfaced when proxied. :contentReference[oaicite:34]{index=34}
- Naked domain redirect strategy supported. :contentReference[oaicite:35]{index=35}
- Scheduling publishes and unpublishes execute correctly. :contentReference[oaicite:36]{index=36}
- Custom 404 configuration works. :contentReference[oaicite:37]{index=37}
- Redirect manager works for old to new paths. :contentReference[oaicite:38]{index=38}
- Embedding headers can be toggled to allow or deny iframe usage. :contentReference[oaicite:39]{index=39}
