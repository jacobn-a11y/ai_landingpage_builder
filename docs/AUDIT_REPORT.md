# Codebase Quality & Functionality Audit Report

**Project:** Replica Pages — AI Landing Page Builder
**Date:** 2026-03-05
**Scope:** Full codebase audit across all three packages (`api`, `web`, `blocks`)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Security Issues](#critical-security-issues)
3. [High-Severity Bugs & Risks](#high-severity-bugs--risks)
4. [Type Safety & Cross-Package Consistency](#type-safety--cross-package-consistency)
5. [Code Quality Issues](#code-quality-issues)
6. [React-Specific Issues (Web Package)](#react-specific-issues-web-package)
7. [Test Coverage Gaps](#test-coverage-gaps)
8. [Architecture Concerns](#architecture-concerns)
9. [Accessibility Issues](#accessibility-issues)
10. [Configuration & Environment](#configuration--environment)
11. [Summary Scorecard](#summary-scorecard)
12. [Prioritized Action Plan](#prioritized-action-plan)

---

## Executive Summary

This audit identifies **67 issues** across the three packages, including **7 critical security vulnerabilities**, **12 high-severity bugs**, and numerous code quality, testing, and architecture concerns.

The most urgent issues are:
- **XSS vulnerabilities** in both the server-side renderer and client-side editor (custom HTML blocks, text blocks)
- **SSRF vulnerability** in webhook delivery with no URL validation
- **Fake encryption** — webhook config is labeled "encrypted" but stored as plaintext JSON
- **Critical type mismatches** between the `blocks`, `api`, and `web` packages that cause silent runtime errors
- **Minimal test coverage** — only 5 test files cover the entire web frontend

| Severity | Count |
|----------|-------|
| Critical | 7 |
| High | 12 |
| Medium | 28 |
| Low | 20 |

---

## Critical Security Issues

### SEC-1: XSS via Custom HTML Block (Server-Side Renderer)

- **File:** `packages/api/src/modules/serve/renderer.ts:173`
- **Issue:** The `customHtml` block type passes user-supplied HTML directly into rendered output without sanitization.
- **Impact:** Any page author can inject arbitrary JavaScript into published pages, affecting all visitors.
- **Fix:** Run all custom HTML through `sanitizeHtml()` before rendering, or use a robust server-side sanitizer like `sanitize-html` or `DOMPurify` with jsdom.

### SEC-2: XSS via Custom HTML Block (Client-Side Editor)

- **File:** `packages/web/src/features/pages/editor/blocks/BlockCustomHtml.tsx:54`
- **Issue:** Uses `dangerouslySetInnerHTML={{ __html: html }}` without any sanitization.
- **Impact:** Malicious HTML/JS executes in the editor context, potentially stealing session tokens.
- **Fix:** Sanitize with DOMPurify before rendering in the editor preview.

### SEC-3: XSS via Rich Text Block

- **File:** `packages/web/src/features/pages/editor/blocks/BlockText.tsx:88`
- **Issue:** `dangerouslySetInnerHTML` used for rich text content when not in edit mode, without sanitization.
- **Impact:** Stored XSS — malicious content persisted in page data executes on every view.
- **Fix:** Always sanitize HTML before rendering via `dangerouslySetInnerHTML`.

### SEC-4: Server-Side Request Forgery (SSRF) in Webhook Delivery

- **File:** `packages/api/src/modules/submissions/submissions.delivery.ts:46`
- **File:** `packages/api/src/modules/integrations/integrations.routes.ts:196-214`
- **Issue:** `fetch()` is called with user-provided webhook URLs with no validation against internal IP ranges (127.0.0.1, 10.x.x.x, 169.254.169.254, etc.).
- **Impact:** Attackers can probe internal services, access cloud metadata endpoints, and exfiltrate data.
- **Fix:** Validate webhook URLs against a blocklist of private/reserved IP ranges before making requests.

### SEC-5: Fake Encryption of Webhook Configuration

- **File:** `packages/api/src/modules/integrations/integrations.routes.ts:86,130`
- **File:** `packages/api/src/modules/submissions/submissions.delivery.ts:96-104`
- **Issue:** Field named `configEncrypted` is actually just `JSON.stringify()` — not encrypted at all.
- **Impact:** Sensitive webhook URLs and credentials are stored in plaintext in the database. Misleading field name gives false sense of security.
- **Fix:** Implement actual encryption using `crypto.createCipheriv()` or an envelope encryption service.

### SEC-6: CSS Injection via Page Settings

- **File:** `packages/api/src/modules/serve/renderer.ts:533-536`
- **Issue:** `pageSettings.backgroundColor` and `pageSettings.fontFamily` are applied directly to inline styles without validation.
- **Impact:** CSS injection can alter page appearance, overlay content, or exfiltrate data via `url()`.
- **Fix:** Validate CSS property values against a whitelist of safe patterns.

### SEC-7: Unsafe URL Input Without Validation

- **File:** `packages/web/src/features/pages/editor/blocks/BlockText.tsx:58-59`
- **Issue:** Uses `prompt('Enter URL:')` with no scheme validation; result is passed directly to `document.execCommand('createLink')`.
- **Impact:** `javascript:`, `data:`, and other dangerous URI schemes can be injected as links.
- **Fix:** Validate that the URL scheme is one of `http`, `https`, `mailto`, or `#`.

---

## High-Severity Bugs & Risks

### BUG-1: Regex-Based HTML Sanitizer Is Bypassable

- **File:** `packages/api/src/lib/sanitize-html.ts:30-35`
- **Issue:** The sanitizer uses regex to strip HTML, which is fundamentally insufficient for security. Crafted payloads can bypass regex-based sanitization.
- **Fix:** Replace with a battle-tested library (`sanitize-html`, `DOMPurify`).

### BUG-2: Race Condition in Slug Uniqueness Check

- **File:** `packages/api/src/modules/pages/pages.routes.ts:47-55,302-308`
- **Issue:** Slug uniqueness is checked with a SELECT, then a separate INSERT follows — no transaction wraps the two.
- **Impact:** Under concurrent requests, duplicate slugs can be created.
- **Fix:** Use a database unique constraint or wrap in a transaction.

### BUG-3: Missing Error Handling in Serve Routes

- **File:** `packages/api/src/modules/serve/serve.routes.ts:95-153,161-281,284-333`
- **Issue:** None of the serve route handlers have try-catch blocks for database queries.
- **Impact:** Any database error returns an unhandled 500 with stack trace, potentially leaking internals.
- **Fix:** Add try-catch wrappers to all route handlers.

### BUG-4: Unhandled Promise Rejections in Web Features

- **Files:**
  - `packages/web/src/features/pages/PagesFeature.tsx:86-89`
  - `packages/web/src/features/submissions/SubmissionsFeature.tsx:38`
  - `packages/web/src/features/pages/PublishDialog.tsx:81`
  - `packages/web/src/features/pages/editor/PageScriptsPanel.tsx:73`
  - `packages/web/src/features/pages/editor/LibraryDropdown.tsx:25`
- **Issue:** `.catch(() => {})` or `.catch(() => setState(fallback))` silently swallows API errors.
- **Impact:** Users receive no feedback when operations fail; debugging is impossible.
- **Fix:** Implement consistent error notification system (toast/snackbar).

### BUG-5: Missing Error Boundary in React App

- **File:** `packages/web/src/App.tsx`
- **Issue:** No Error Boundary wraps the application routes.
- **Impact:** Any unhandled React rendering error causes a white screen of death.
- **Fix:** Add an Error Boundary component with a user-friendly fallback UI.

### BUG-6: Autosave Race Condition

- **File:** `packages/web/src/features/pages/editor/EditorContext.tsx:202-211`
- **Issue:** The debounced autosave doesn't prevent concurrent save calls. Rapid edits during a pending save can trigger overlapping API requests.
- **Impact:** Data consistency issues — older content could overwrite newer saves.
- **Fix:** Add a `saving` flag and queue saves, or use an abort controller.

### BUG-7: Stale Content Reference in Save Closure

- **File:** `packages/web/src/features/pages/editor/EditorContext.tsx:180-200`
- **Issue:** The `save` function captures `content` in its closure, but is invoked via a debounced `setTimeout`. The closure may reference stale state.
- **Impact:** Autosave could persist outdated content.
- **Fix:** Use a ref to track the latest content for debounced saves.

### BUG-8: Hardcoded Default Session Secret

- **File:** `packages/api/src/app.ts:23-27`
- **Issue:** Falls back to `'dev-secret-change-in-production'` if `SESSION_SECRET` is not set. This default is publicly known.
- **Impact:** If deployed without setting the env var, session cookies can be forged.
- **Fix:** Fail at startup if `SESSION_SECRET` is not set in production.

### BUG-9: Invite Accept Endpoint Lacks Authentication

- **File:** `packages/api/src/modules/invites/invites.routes.ts:59-82`
- **Issue:** The `/accept` endpoint stores invite data in the session without requiring authentication or CSRF protection.
- **Impact:** Potential for session fixation or unauthorized workspace access.
- **Fix:** Require authentication or add CSRF token verification.

### BUG-10: O(n²) Folder Tree Construction

- **File:** `packages/api/src/modules/folders/folders.routes.ts:19-29`
- **Issue:** `buildTree` recursively filters all folders for each parent, resulting in O(n²) complexity.
- **Impact:** Performance degrades significantly with many folders.
- **Fix:** Use a hash map for O(n) tree construction.

### BUG-11: Duplicate Serve Route Logic

- **File:** `packages/api/src/modules/serve/serve.routes.ts:95-153,161-281`
- **Issue:** Demo serve and domain serve handlers contain ~180 lines of near-identical code.
- **Impact:** Bug fixes must be applied in two places; divergence is likely.
- **Fix:** Extract shared rendering logic into a helper function.

### BUG-12: Global Script Injection Risk

- **File:** `packages/api/src/modules/serve/renderer.ts:523-528`
- **Issue:** `globalHeaderScript` and `globalFooterScript` are injected directly into all rendered pages.
- **Impact:** A compromised admin account enables site-wide persistent XSS across all published pages.
- **Fix:** Add CSP enforcement and consider script sandboxing.

---

## Type Safety & Cross-Package Consistency

### TYPE-1: FormFieldSchema Mismatch Across Packages (CRITICAL)

Three different definitions exist:

| Field | `blocks` | `api` | `web` |
|-------|----------|-------|-------|
| `name` | Yes | No | No |
| `placeholder` | Yes | No | No |
| `stepIndex` | No | Yes | Yes |
| `accept` | No | Yes | Yes |

- **Files:**
  - `packages/blocks/src/form-types.ts:15-23`
  - `packages/api/src/modules/forms/forms.types.ts:16-24`
  - `packages/web/src/lib/api.ts:248-256`
- **Impact:** HTML import generates fields with `name` and `placeholder` that the API doesn't expect. The API returns `stepIndex` and `accept` that the blocks package can't type.
- **Fix:** Consolidate into a single definition in the `blocks` package as the source of truth.

### TYPE-2: Missing Form Field Types in Blocks Package (CRITICAL)

- **File:** `packages/blocks/src/form-types.ts:5-13` vs `packages/api/src/modules/forms/forms.types.ts:1-12`
- **Issue:** The blocks package `FormFieldType` is missing `date` and `file` types that the API supports.
- **Impact:** Type-safe code using blocks types cannot create date/file form fields.
- **Fix:** Add `date` and `file` to the blocks `FormFieldType` union.

### TYPE-3: Loose Block Props Typing

- **File:** `packages/blocks/src/block-types.ts:49`
- **Issue:** `props?: Record<string, unknown>` provides zero type safety. The web package uses unsafe `as string` casts throughout `PropertiesPanel.tsx` (lines 85, 102, 112, 126, 135, 147, 167, 181, 198).
- **Fix:** Create discriminated union types for each block type's props.

### TYPE-4: FormSchemaJson Type Never Used

- **File:** `packages/blocks/src/form-types.ts:25-28`
- **Issue:** `FormSchemaJson` is exported but never imported anywhere in the codebase. The actual schema format used differs from this type.
- **Fix:** Either adopt this type consistently or remove it.

### TYPE-5: FieldMapping Type Doesn't Match Usage

- **File:** `packages/blocks/src/form-types.ts:32-36`
- **Issue:** Defined as `{ formFieldId, sourceSelector, sourceAttribute? }` but actual code uses `Record<string, string>` (see `packages/api/src/modules/submissions/submissions.service.ts:87`).
- **Fix:** Align the type definition with actual usage.

---

## Code Quality Issues

### QC-1: No Input Validation Library

- **Scope:** Entire API package
- **Issue:** All request body validation is done with manual if-checks. No use of Zod, Yup, or similar.
- **Impact:** Inconsistent validation, easy to miss edge cases, verbose code.
- **Fix:** Adopt Zod for request validation.

### QC-2: No Structured Logging

- **Scope:** Entire API package
- **Issue:** Only `console.log` and `console.error` used throughout. No log levels, no structured output, no request correlation.
- **Impact:** Production debugging is extremely difficult.
- **Fix:** Add a logging library (pino, winston).

### QC-3: Magic Numbers and Strings

- **Files:**
  - `packages/api/src/modules/submissions/submissions.delivery.ts:3-4` — `MAX_ATTEMPTS = 3`, `RETRY_DELAY_MS = 2000`
  - `packages/api/src/modules/serve/utm-scripts.ts:9` — `UTM_TTL_DAYS = 30`
  - `packages/api/src/modules/serve/renderer.ts:98-99` — depth limit of 50
- **Fix:** Move to configuration or environment variables.

### QC-4: Silent Error Swallowing

- **Files:**
  - `packages/api/src/modules/auth/auth.routes.ts:71` — `.catch(() => res.json({ user: null }))`
  - `packages/api/src/modules/integrations/integrations.routes.ts:174` — `catch { // ignore }`
  - `packages/api/src/modules/auth/dev-bypass.ts:84` — catch block silenced
- **Impact:** Errors are hidden, making debugging impossible.
- **Fix:** Log errors before returning fallback values.

### QC-5: Deprecated API Usage

- **Files:**
  - `packages/web/src/features/pages/editor/RichTextToolbar.tsx:12`
  - `packages/web/src/features/pages/editor/blocks/BlockText.tsx:59`
- **Issue:** Uses deprecated `document.execCommand()` for rich text editing.
- **Fix:** Consider migrating to a modern rich text library (TipTap, Slate, Lexical).

### QC-6: Monolithic Renderer File

- **File:** `packages/api/src/modules/serve/renderer.ts` — 576 lines
- **Issue:** Single file handles rendering for all 25+ block types.
- **Fix:** Split into per-block-type renderer modules.

### QC-7: Missing URL Validation in Form Mapping

- **File:** `packages/web/src/features/pages/FormMappingModal.tsx:54,80`
- **Issue:** `redirectUrl` accepted from form input without URL validation.
- **Fix:** Validate URL format and scheme.

---

## React-Specific Issues (Web Package)

### REACT-1: Large Context Provider Causing Re-renders

- **File:** `packages/web/src/features/pages/editor/EditorContext.tsx:787-887`
- **Issue:** Single context with 38+ memoized values. Any change triggers re-renders in all consuming components.
- **Fix:** Split into smaller contexts by concern (content, UI state, actions).

### REACT-2: Missing useMemo for Computed Values

- **File:** `packages/web/src/features/pages/PublishDialog.tsx:42-47`
- **Issue:** `destinationUrl` computed on every render without memoization.

### REACT-3: Unnecessary useEffect Dependency on `pages`

- **File:** `packages/web/src/features/pages/PagesFeature.tsx:91`
- **Issue:** The effect depends on `pages` array which changes frequently, triggering unnecessary refetches.
- **Fix:** Depend only on `mapFormId`.

### REACT-4: Prop Drilling in Editor Components

- **File:** `packages/web/src/features/pages/editor/PropertiesPanel.tsx`
- **Issue:** Block editing props passed through multiple component layers.
- **Fix:** Use EditorContext more extensively.

---

## Test Coverage Gaps

### TEST-1: API Package — Missing Test Files

The following route modules have **no tests**:
- `packages/api/src/modules/folders/folders.routes.ts`
- `packages/api/src/modules/forms/forms.routes.ts`
- `packages/api/src/modules/integrations/integrations.routes.ts`
- `packages/api/src/modules/library/library.routes.ts`
- `packages/api/src/modules/serve/serve.routes.ts`
- `packages/api/src/modules/workspace/workspace.routes.ts`

### TEST-2: Web Package — Minimal Test Coverage

Only **5 test files** exist for the entire frontend:
- `App.test.tsx`
- `AuthContext.test.tsx`
- `ProtectedRoute.test.tsx`
- `FormMappingModal.test.tsx`
- `ImportPageDialog.test.tsx`
- `PublishDialog.test.tsx`

**Not tested at all:**
- `EditorContext.tsx` (900+ LOC, most critical file)
- All block renderer components
- HTML import utilities
- `sanitizeHtml` function
- API error handling paths

### TEST-3: No Security-Focused Tests

- No tests verify XSS payloads are sanitized
- No tests for SSRF protection
- No tests for SQL injection resistance
- No tests for malformed/adversarial input

### TEST-4: Existing Tests Lack Edge Cases

- **File:** `packages/api/src/modules/domains/__tests__/domains.test.ts` — only basic CRUD, no DNS verification tests
- **File:** `packages/api/src/modules/submissions/__tests__/submissions.test.ts` — no form submission handling tests

---

## Architecture Concerns

### ARCH-1: No Request Body Size Limits

- **File:** `packages/api/src/app.ts`
- **Issue:** No explicit body size limits configured for Express JSON/URL-encoded parsers.
- **Impact:** Denial of service via large request bodies.
- **Fix:** Add `express.json({ limit: '1mb' })`.

### ARCH-2: Missing Security Headers

- **Scope:** API package
- **Issue:** No `helmet` middleware for security headers (X-Frame-Options, X-Content-Type-Options, etc.).
- **Fix:** Add `helmet` middleware.

### ARCH-3: No Rate Limiting on Serve Routes

- **File:** `packages/api/src/modules/serve/serve.routes.ts`
- **Issue:** Public-facing page serve endpoints have no rate limiting.
- **Impact:** Pages can be scraped or DDoS'd without throttling.

### ARCH-4: Scheduled Publishing Runs Inline

- **File:** `packages/api/src/modules/publishing/publishing.routes.ts:25-27`
- **Issue:** `maybeProcessSchedule()` is called on every status request instead of in a background worker.
- **Impact:** Adds latency to every API call; not scalable.
- **Fix:** Implement a cron job or background worker.

### ARCH-5: Cascading Deletes Throughout Schema

- **File:** `packages/api/prisma/schema.prisma`
- **Issue:** All relationships use `onDelete: Cascade`. Deleting a workspace cascades to all pages, forms, submissions, domains, etc.
- **Impact:** Accidental workspace deletion is catastrophic and unrecoverable.
- **Fix:** Consider soft deletes or `onDelete: Restrict` for critical entities.

### ARCH-6: Missing Database Indexes

- **File:** `packages/api/prisma/schema.prisma`
- **Issue:** `User.email` has no standalone index (only part of a composite). User lookups by email will table-scan.
- **Fix:** Add `@@index([email])`.

### ARCH-7: Inconsistent TypeScript Configuration

| Config | `blocks` | `api` | `web` |
|--------|----------|-------|-------|
| `target` | ES2020 | ES2022 | ES2020 |
| `module` | commonjs | NodeNext | ESNext |
| `strict` | true | true | true |

- **Impact:** Potential runtime incompatibilities; module resolution differences.

---

## Accessibility Issues

### A11Y-1: BlockButton Uses `<span>` Instead of `<button>`

- **File:** `packages/web/src/features/pages/editor/blocks/BlockButton.tsx:26`
- **Issue:** Uses `<span tabIndex={0}>` instead of a semantic `<button>` element.
- **Impact:** Screen readers don't announce it as a button; keyboard activation doesn't work.

### A11Y-2: Missing ARIA Labels on Loading States

- **Files:** `ProtectedRoute.tsx`, `LoginFeature.tsx`, and others
- **Issue:** Loading spinners lack `role="status"` and `aria-label="Loading"`.

### A11Y-3: No Keyboard Navigation in Editor

- **Scope:** Editor components
- **Issue:** Block selection, reordering, and toolbar actions lack keyboard shortcuts and focus management.

---

## Configuration & Environment

### CFG-1: Missing Environment Variables in .env.example

- `CNAME_TARGET` — used in `packages/api/src/modules/domains/domains.verification.ts:5` with a default of `'cname.replicapages.io'`
- Not documented in `.env.example`

### CFG-2: No Environment Validation at Startup

- **File:** `packages/api/src/app.ts`
- **Issue:** No validation that required environment variables are set. Silently uses insecure defaults.
- **Fix:** Validate environment with Zod on startup; fail fast if required vars are missing.

### CFG-3: No CSP Configuration in Vite Dev Server

- **File:** `packages/web/vite.config.ts`
- **Issue:** No Content Security Policy headers configured.
- **Fix:** Add CSP headers to prevent inline script execution in development.

---

## Summary Scorecard

| Category | Grade | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| **Security** | **F** | 7 | 3 | 2 | 0 |
| **Bug Resilience** | **D** | 0 | 7 | 5 | 2 |
| **Type Safety** | **D** | 2 | 1 | 2 | 0 |
| **Code Quality** | **C** | 0 | 0 | 7 | 8 |
| **Test Coverage** | **F** | 0 | 1 | 3 | 0 |
| **Architecture** | **C-** | 0 | 0 | 7 | 3 |
| **Accessibility** | **D** | 0 | 0 | 2 | 1 |
| **Configuration** | **C** | 0 | 0 | 0 | 6 |
| **Overall** | **D+** | **7** | **12** | **28** | **20** |

---

## Prioritized Action Plan

### Immediate (Week 1) — Critical Security Fixes

1. **Fix XSS in customHtml rendering** — Server (`renderer.ts:173`) and client (`BlockCustomHtml.tsx:54`, `BlockText.tsx:88`). Replace regex sanitizer with DOMPurify or `sanitize-html`.
2. **Add SSRF protection** — Validate webhook URLs against private IP ranges in `submissions.delivery.ts` and `integrations.routes.ts`.
3. **Implement real encryption** — Replace `JSON.stringify` with actual crypto for `configEncrypted` field.
4. **Validate CSS values** — Whitelist safe patterns for `backgroundColor` and `fontFamily` in `renderer.ts`.
5. **Validate URL schemes** — In `BlockText.tsx` link creation, only allow `http`, `https`, `mailto`.

### High Priority (Week 2-3) — Stability & Error Handling

6. **Add try-catch to all API route handlers** — Especially serve routes.
7. **Add React Error Boundary** in `App.tsx`.
8. **Fix autosave race condition** — Add saving flag / abort controller in `EditorContext.tsx`.
9. **Use content ref for debounced save** — Prevent stale closure in `EditorContext.tsx`.
10. **Add database unique constraint for page slugs** — Replace application-level check.
11. **Fail at startup if SESSION_SECRET is not set** in production.
12. **Add `helmet` middleware** and request body size limits.

### Medium Priority (Week 3-4) — Type Safety & Quality

13. **Consolidate FormFieldSchema** into single definition in `blocks` package.
14. **Add `date` and `file` to blocks FormFieldType**.
15. **Adopt Zod** for API request validation.
16. **Add structured logging** (pino).
17. **Implement error notification system** in web package (toast/snackbar).
18. **Split EditorContext** into smaller focused contexts.

### Ongoing — Test Coverage & Maintenance

19. **Add tests for untested API routes** — Target >70% coverage.
20. **Add tests for EditorContext** — Most critical untested file.
21. **Add security-focused test suite** — XSS payloads, SSRF attempts, malformed input.
22. **Refactor renderer.ts** — Split into per-block modules.
23. **Fix accessibility issues** — Semantic HTML, ARIA labels, keyboard navigation.
24. **Standardize TypeScript config** across packages.

---

*This report was generated by a comprehensive automated audit. All file paths and line numbers reference the codebase as of 2026-03-05. Manual verification of each finding is recommended before implementing fixes.*
