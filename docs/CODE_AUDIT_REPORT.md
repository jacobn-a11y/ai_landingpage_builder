# Comprehensive Code Audit Report
## Ai-landingpage-builder (Replica Pages)

**Audit Date:** March 5, 2026  
**Scope:** Full codebase (packages/api, packages/web, packages/blocks)  
**Method:** Parallel subagent audits across Security, Testing, Architecture, Code Quality, Dependencies/Performance, and Documentation

---

## Executive Summary

The Replica Pages codebase is **well-structured and production-capable** with clear module boundaries, consistent conventions, and solid foundational patterns. The audit identified **2 critical** and **4 high** severity issues, primarily in security (CSRF, XSS) and testing coverage. Addressing these and the medium-priority recommendations would significantly improve robustness and maintainability.

| Category | Grade | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Security | B- | 2 | 2 | 1 | 4 |
| Testing | C+ | - | - | - | - |
| Architecture | B+ | - | - | - | - |
| Code Quality | B- | - | - | - | - |
| Dependencies/Performance | C+ | - | - | - | - |
| Documentation | B | - | - | - | - |

---

## 1. Security Audit

### 1.1 Critical Findings

| Finding | Location | Description |
|---------|----------|-------------|
| **Custom HTML XSS** | `BlockCustomHtml.tsx`, `renderer.ts` | Custom HTML blocks render via `dangerouslySetInnerHTML` (web) and raw HTML output (API) without sanitization. Editors can inject arbitrary HTML/JS visible to all visitors. |
| **No CSRF Protection** | All mutation endpoints | Architecture doc mentions "Session cookie + CSRF" but no CSRF implementation exists. Mutations use session cookies; attacker can craft pages triggering authenticated requests. |

### 1.2 High Findings

| Finding | Location | Description |
|---------|----------|-------------|
| **URL param injection** | `renderer.ts` `replaceDynamicText` | `{{param}}` substitution uses raw URL query values. Visiting `?param=<script>alert(1)</script>` can inject script if page uses `{{param}}` in customHtml. |
| **Redirect URL not validated** | `submissions.routes.ts` | `redirectUrl` from publishConfig used directly in `res.redirect()`. No check for `javascript:` or `data:` URLs; open redirect/XSS possible. |
| **Integration config not encrypted** | `integrations.routes.ts` | `configEncrypted` column stores plain JSON; webhook URLs exposed if DB compromised. |

### 1.3 Medium/Low Findings

- **X-Test-Auth**: If `VITEST` is set in production, any client could bypass auth with `X-Test-Auth: 1`. Ensure `VITEST` never set in production.
- **BlockText edit mode**: `dangerouslySetInnerHTML` in edit mode; less protected than display mode.
- **Regex sanitizer**: Server-side sanitizer may miss edge cases (nested tags, encoding tricks).
- **Workspace ID enumeration**: Demo URL exposes `workspaceId`; allows enumeration.

### 1.4 Strengths

- Session config: `httpOnly`, `secure` in production, 7-day `maxAge`
- `SESSION_SECRET` check: App exits if default used in production
- Dev bypass correctly guarded (localhost + env flag only)
- Prisma used throughout; no SQL injection risk
- Workspace scoping and RBAC consistent
- Rate limiting on submission POST (10/min per IP)

### 1.5 Security Recommendations (Priority Order)

1. **Add CSRF protection** for all mutation endpoints (e.g. `csurf` or double-submit cookie)
2. **Sanitize custom HTML** in both web and API before rendering (DOMPurify or robust server sanitizer)
3. **Escape/sanitize URL param values** in `replaceDynamicText` before substitution
4. **Validate redirectUrl** to allow only `http://` or `https://`; optionally restrict to allowlist
5. **Encrypt integration config** at rest or use secrets manager
6. **Reject X-Test-Auth** in production regardless of env

---

## 2. Testing Audit

### 2.1 Coverage Summary

| Package | Test Files | Coverage |
|---------|------------|----------|
| API | 8 suites | Partial (auth, health, pages clone, domains, publishing, submissions, workspace, invites) |
| Web | 6 suites | Partial (App smoke, AuthContext, ProtectedRoute, PublishDialog, ImportPageDialog, FormMappingModal) |
| Blocks | 0 | None |

### 2.2 Tested vs Untested

**API routes – Untested:**
- Folders (all CRUD)
- Forms (all CRUD)
- Users (DELETE)
- Integrations (all)
- Serve (demo, domain, preview)
- Library (all)
- Pages (POST, GET, PATCH, DELETE – only clone tested)
- Submissions (GET list/detail)
- Domains (verify, PATCH, DELETE)
- Auth (logout, Google callback, invite accept)

**Web – Untested:**
- Page editor (EditorCanvas, BlockRenderer, DnD)
- 20+ block components
- CreatePageDialog, CreateFolderDialog
- FormBuilder, FormsFeature
- SubmissionsFeature, DomainsFeature, IntegrationsFeature, UsersFeature, SettingsFeature
- PublishDialog (publish/unpublish actions, schedule, domain selection)
- FormMappingModal (save flow)
- ProtectedRoute (authenticated success, requireAdmin)

### 2.3 Test Quality

**Strengths:**
- Supertest + Prisma mocks for real HTTP behavior without DB
- Error paths (401, 404, 400, 429) covered
- AuthContext covers loading, success, failure, login redirect

**Weaknesses:**
- Many assertions use `toBeDefined()` or loose `toMatchObject` instead of exact values
- No pure unit tests for utilities (slugify, detectForms, etc.)
- No E2E tests (Playwright, Cypress)

### 2.4 Testing Recommendations

1. Add API tests for folders, forms, users, integrations, library, serve routes
2. Add tests for pages CRUD (POST, GET, PATCH, DELETE)
3. Add tests for PublishDialog publish/unpublish, FormMappingModal save
4. Add unit tests for slugify, detectForms, normalizeSchemaJson
5. Add E2E for critical flows: login, create page, publish, form submit
6. Consider MSW for web API mocking
7. Add coverage reporting and enforce minimum thresholds

---

## 3. Architecture Audit

### 3.1 Structure

```
packages/
  blocks/     # Shared types (leaf)
  api/        # Express, Prisma, Passport
  web/        # React SPA, Vite
```

- Clear monorepo; `blocks` shared by api and web
- Feature-based web structure; domain modules in API
- No circular package dependencies

### 3.2 Duplication (Critical)

| Item | Locations | Notes |
|------|-----------|-------|
| `sanitizeHtml` | api/lib, web/lib | Different implementations (regex vs DOMParser); same contract |
| `slugify` | pages.routes, ImportPageDialog, UploadPageModal, CreatePageDialog | Same logic in 4 places |
| `FormFieldSchema` | blocks, api/forms, api/serve, web/api | Four definitions with small differences |
| Universal props | web/universal-props, api/renderer | `getUniversalStyleString` duplicated |

### 3.3 File Sizes & Complexity

| File | Lines | Notes |
|------|-------|-------|
| EditorContext.tsx | ~900 | Single context for editor; many responsibilities |
| renderer.ts | ~575 | All block rendering in one switch |
| lib/api.ts | ~394 | API client + types mixed |
| pages.routes.ts | ~343 | Page CRUD, clone, form detection |
| serve.routes.ts | ~333 | Serve routing |

### 3.4 Architecture Recommendations

1. **Extract shared slugify** to blocks or `@replica-pages/shared`
2. **Unify form types** in blocks; import everywhere
3. **Split lib/api.ts** – move types to shared package
4. **Share universal props** – move to blocks; use in web and api renderer
5. **Split EditorContext** – selection, clipboard, overlays into smaller contexts
6. **Modularize renderer** – registry or per-block render functions

---

## 4. Code Quality Audit

### 4.1 TypeScript

**Strengths:** Strict mode, no `any`, no `@ts-ignore`

**Issues:**
- 50+ type assertions (`as`) instead of runtime validation
- `req.session!.workspaceId!` non-null assertions throughout
- `useParams` id used without null check

**Recommendation:** Add Zod for request bodies; typed session helper; explicit null checks for params

### 4.2 Error Handling

**Strengths:** try/catch in async flows; some user feedback

**Issues:**
- Silent failures: `PageEditFeature`, `PublishDialog`, `SubmissionsFeature`, `LibraryDropdown`, `FormBuilderFeature` – `.catch(() => {})` with no feedback
- Empty catch blocks in utm-scripts
- No React ErrorBoundary
- No shared toast/notification system

**Recommendation:** Add ErrorBoundary; toast system; replace silent catches with user feedback or logging

### 4.3 Validation

- **No Zod** or similar
- Ad hoc validation with `typeof`, `trim()`, manual checks
- `as` casts for `raw.email`, `raw.custom_fields` without runtime validation

**Recommendation:** Add Zod for request bodies and shared schemas

### 4.4 API Design

**Strengths:** RESTful, good status codes, consistent `{ error: string }`

**Issues:**
- Inconsistent error payloads (some return objects)
- Serve routes use plain text for some 404s
- No global Express error handler
- Unhandled rejections can leave requests hanging

### 4.5 React Patterns

**Strengths:** Context usage, useMemo/useCallback in EditorContext

**Issues:**
- EditorContext exposes 40+ values; any change triggers re-renders
- No code splitting; all features loaded eagerly
- No React.lazy or Suspense

### 4.6 Accessibility

**Strengths:** Radix UI (built-in a11y), Label htmlFor, BlockImage alt

**Issues:**
- BlockButton (edit mode) missing `onKeyDown` for Enter/Space
- No aria-label on icon-only buttons
- No aria-live for dynamic status (e.g. "Copied")

### 4.7 Linting/Formatting

- **No ESLint** (no .eslintrc)
- **No Prettier**
- Lint script: `tsc --noEmit` only

**Recommendation:** Add ESLint + Prettier; eslint-plugin-react-hooks; eslint-plugin-jsx-a11y

---

## 5. Dependencies & Performance Audit

### 5.1 Dependencies

- TypeScript ^5.3, React 18, Express 4, Prisma 5
- Run `npm audit` and fix vulnerabilities
- Express CVE-2025-13466 (body-parser DoS) – ensure body-parser >= 2.2.1 if used

### 5.2 Bundle & Build

- **No route-level code splitting** – all features imported statically in App.tsx
- **No block-level code splitting** – all 22 blocks imported in BlockRenderer
- **No manualChunks** in Vite
- **No bundle analyzer**
- Vite warns: "Some chunks are larger than 500 kB"

### 5.3 Database

**Over-fetching:**
- Serve routes: `include: { workspace: true }` – only need scriptAllowlist, scripts
- Pages list: returns full Page including contentJson, lastPublishedContentJson
- Library folders: `include: { items: true }` with full blockJson

**Recommendation:** Use `select` instead of `include` where possible

### 5.4 Caching

- No Cache-Control, ETag, or Last-Modified on API responses
- No server-side response cache

### 5.5 Pagination

- Submissions: `take: 100` with no skip/cursor
- Pages, forms, domains: no pagination; all records loaded

### 5.6 Performance Recommendations

1. **Pages list:** Use `select` to exclude contentJson, lastPublishedContentJson
2. **Serve routes:** Use `select` for workspace fields
3. **Route-level code splitting:** React.lazy for features
4. **manualChunks** for vendor groups (react, dnd-kit, radix)
5. **Add bundle analyzer** (rollup-plugin-visualizer)
6. **Add pagination** for list endpoints
7. **Cache-Control** for serve HTML

---

## 6. Documentation Audit

### 6.1 Strengths

- Root README: quick start, env table, commands
- 12 module READMEs with routes, flows, env
- docs/ARCHITECTURE.md, UTM_FLOW.md, HTML_IMPORT.md, BLOCK_LIBRARY.md
- Package READMEs for api, web, blocks

### 6.2 Gaps

- **PRD embedded in root README** (~500 lines) – should move to docs/PRD.md
- **No OpenAPI/Swagger** – no machine-readable API spec
- **Sparse JSDoc** – api.ts, fetchApi, renderer switch, pages.forms regex undocumented
- **No first-run checklist** – ordered steps, prerequisites, DB creation
- **.env.example** – missing CNAME_TARGET
- **No CONTRIBUTING.md** – no branching, PRs, commit conventions
- **No flow diagrams** – only UTM has ASCII diagram; no Mermaid for auth, submissions, publishing

### 6.3 Documentation Recommendations

1. Move PRD to docs/PRD.md
2. Add "First run" section with ordered steps
3. Add CNAME_TARGET to .env.example
4. Add CONTRIBUTING.md and CODE_STYLE.md
5. Add JSDoc for api.ts, renderer, complex logic
6. Add Mermaid diagrams for auth, submissions, publishing
7. Consider OpenAPI spec for core endpoints

---

## 7. Priority Action Matrix

### P0 – Critical (Address Immediately)

| # | Action | Category |
|---|--------|----------|
| 1 | Add CSRF protection for mutation endpoints | Security |
| 2 | Sanitize custom HTML in BlockCustomHtml and renderer | Security |

### P1 – High (Within 1–2 Sprints)

| # | Action | Category |
|---|--------|----------|
| 3 | Sanitize/escape URL param values in replaceDynamicText | Security |
| 4 | Validate redirectUrl in submissions | Security |
| 5 | Add React ErrorBoundary and improve error feedback | Code Quality |
| 6 | Add Zod for request validation | Code Quality |
| 7 | Add ESLint and Prettier | Code Quality |
| 8 | Use select instead of include for pages list, serve workspace | Performance |

### P2 – Medium (Within 2–4 Sprints)

| # | Action | Category |
|---|--------|----------|
| 9 | Encrypt integration config at rest | Security |
| 10 | Add API tests for folders, forms, users, integrations, library, serve | Testing |
| 11 | Add route-level code splitting (React.lazy) | Performance |
| 12 | Extract shared slugify, unify form types | Architecture |
| 13 | Split EditorContext into smaller contexts | Architecture |
| 14 | Add CONTRIBUTING.md, first-run docs | Documentation |

### P3 – Low (Backlog)

| # | Action | Category |
|---|--------|----------|
| 15 | Add E2E tests | Testing |
| 16 | Add bundle analyzer and manualChunks | Performance |
| 17 | Add OpenAPI spec | Documentation |
| 18 | Add Mermaid architecture diagrams | Documentation |

---

## 8. Appendix: Audit Methodology

- **Security:** Auth, sanitization, XSS, CSRF, SQL injection, sensitive data, authorization, serve routes, form submissions
- **Testing:** Test locations, patterns, coverage by module, mock strategies, quality, gaps
- **Architecture:** Monorepo structure, module organization, data flow, duplication, coupling, file sizes, naming
- **Code Quality:** TypeScript, error handling, validation, API design, React patterns, performance, a11y, linting
- **Dependencies/Performance:** package.json, duplicates, vulnerabilities, bundle size, DB indexes, over-fetching, caching
- **Documentation:** READMEs, JSDoc, architecture docs, API docs, onboarding, contributing

---

*Report generated by parallel subagent code audits. For questions or clarifications, refer to the source audit outputs.*
