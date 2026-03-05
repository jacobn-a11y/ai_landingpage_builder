# Replica Pages - Architecture & Build Plan

## Tech Stack (Phase 1)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React 18 + Vite + TypeScript | Fast, SPA, no SSR |
| UI Library | shadcn/ui | Free, SaaS-standard, Tailwind-based |
| Backend | Node.js + Express + TypeScript | Simple, widely known |
| Database | PostgreSQL + Prisma | Strong typing, migrations |
| Auth | Passport.js + Google OAuth 2.0 | Google-only per PRD |
| Editor | Custom + @dnd-kit/core | Lightweight, accessible DnD |

## Module Boundaries (No God Files)

```
packages/
  web/                           # React SPA admin app
    src/
      features/                  # One folder per feature
        pages/                   # PagesFeature, PageEditFeature, PublishDialog, FormMappingModal, ImportPageDialog, CreatePageDialog
        forms/                   # FormsFeature.tsx, FormBuilderFeature.tsx
        submissions/             # SubmissionsFeature.tsx
        publishing/              # PublishingFeature.tsx
        domains/                 # DomainsFeature.tsx (admin only)
        integrations/            # IntegrationsFeature.tsx (admin only)
        scripts/                 # ScriptsFeature.tsx (admin only)
        users/                   # UsersFeature.tsx (admin only)
        settings/                # SettingsFeature.tsx
        auth/                    # LoginFeature.tsx, AcceptInviteFeature.tsx
        upload/                  # UploadPageModal.tsx (HTML/MHTML import)
      components/                # Shared UI (layout, ui)
        layout/                  # AppLayout.tsx, NavSidebar.tsx
      lib/                       # api.ts, html-import
  api/                           # Express backend
    src/
      modules/                   # One module per domain
        health/                  # health.routes.ts
        auth/                    # auth.routes.ts, passport.config.ts, dev-bypass.ts
        workspace/               # workspace.routes.ts
        invites/                 # invites.routes.ts
        users/                   # users.routes.ts
        domains/                 # domains.routes.ts, domains.verification.ts
        folders/                 # folders.routes.ts
        pages/                   # pages.routes.ts, pages.forms.ts
        forms/                   # forms.routes.ts
        submissions/             # submissions.routes.ts, submissions.service.ts, submissions.delivery.ts
        integrations/            # integrations.routes.ts
        publishing/              # publishing.routes.ts, publishing.service.ts
        serve/                   # serve.routes.ts, renderer.ts, utm-scripts.ts
        library/                 # library.routes.ts (block library: folders, items, import from page)
        scripts/                 # csp.ts, scripts.types.ts (CSP from allowlist; used by serve + workspace)
      shared/                    # db.ts
    prisma/
      schema.prisma
  blocks/                        # Shared block types
    src/
      block-types.ts
      form-types.ts
```

**Dev note**: `BYPASS_AUTH_LOCALHOST=1` enables auth bypass on localhost for development (see `auth/dev-bypass.ts`).

## Dependency Order (Build Bottom-Up)

1. **Foundation** - Project scaffold, DB schema, API structure, env config
2. **Auth** - Google OAuth, sessions, workspace creation on first sign-in
3. **Workspace & Users** - Invites, roles (Admin/Editor/Viewer), RBAC
4. **Domains** - Domain model, verification workflow, status states
5. **Pages & Folders** - Page model, folder hierarchy, versions (draft/published)
6. **Forms** - Form model, native form schema, PageFormBinding
7. **Submission Pipeline** - Canonical payload, submit endpoint, UTM capture
8. **Form Mapping** - Detect forms in HTML, map to schema, intercept submit
9. **Blocks & Editor** - Block types, drag-drop canvas, layers, properties, block library
10. **HTML Import** - Parse HTML/MHTML, convert to blocks, Custom HTML fallback
11. **Library** - Block library (folders, items, import from page)
12. **Publishing** - Demo domain, CNAME, subdirs, scheduling, 404, redirects
13. **Integrations** - Zapier webhook, delivery queue
14. **Scripts** - Allowlist, global/page scripts, CSP

## Data Model (Prisma)

See `packages/api/prisma/schema.prisma` - entities: Workspace, User, Invite, Folder, Domain, Page, Form, PageFormBinding, Submission, Integration, BlockLibraryFolder, BlockLibraryItem.

## Block Types (Editor)

| Category | Types |
|----------|-------|
| Layout | section, container, grid, columns, stack |
| Content | text, image, button, divider, spacer, video, shapeRectangle, shapeCircle, countdown, table |
| Pattern | hero, features, testimonials, faq, logos |
| Form | form |
| Embed | customHtml |

## API Conventions

- REST-style: `GET/POST/PUT/DELETE /api/v1/{resource}`
- Tenant-scoped: All routes require workspace context from session
- Auth: Session cookie + CSRF for mutations

### API Routes

| Prefix | Module | Notes |
|--------|--------|-------|
| `/api/health` | health | Liveness |
| `/api/v1/auth` | auth | Login, logout, me |
| `/api/v1/invites` | invites | Create invite |
| `/api/v1/workspaces` | workspace | Get workspace, PATCH settings |
| `/api/v1/users` | users | Remove user |
| `/api/v1/domains` | domains | CRUD, verify |
| `/api/v1/folders` | folders | CRUD |
| `/api/v1/pages` | pages + publishing | CRUD, clone, publish, unpublish, schedule |
| `/api/v1/forms` | forms | CRUD |
| `/api/v1/submissions` | submissions | List, get |
| `/api/v1/serve` | serve | Render published pages |
| `/api/v1/integrations` | integrations | CRUD, test webhook |
| `/api/v1/library` | library | Folders, items, import from page |

## Documentation Standards

- Each module: README.md with purpose, exports, usage
- Complex logic: JSDoc with examples
- API: OpenAPI spec (optional for MVP)
