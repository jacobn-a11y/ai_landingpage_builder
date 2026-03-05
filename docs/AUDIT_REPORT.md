# Codebase Quality & Functionality Audit Report

**Project:** Replica Pages — AI Landing Page Builder
**Date:** 2026-03-05 (Revision 2 — post-fix re-audit)
**Scope:** Full codebase audit across all three packages (`api`, `web`, `blocks`)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What Was Fixed](#what-was-fixed)
3. [Remaining Critical Security Issues](#remaining-critical-security-issues)
4. [Remaining High-Severity Bugs & Risks](#remaining-high-severity-bugs--risks)
5. [New Issues Introduced by Fixes](#new-issues-introduced-by-fixes)
6. [Type Safety & Cross-Package Consistency](#type-safety--cross-package-consistency)
7. [Code Quality Issues](#code-quality-issues)
8. [React-Specific Issues (Web Package)](#react-specific-issues-web-package)
9. [Test Coverage Gaps](#test-coverage-gaps)
10. [Architecture Concerns](#architecture-concerns)
11. [Accessibility Issues](#accessibility-issues)
12. [Configuration & Environment](#configuration--environment)
13. [Summary Scorecard](#summary-scorecard)
14. [Prioritized Action Plan](#prioritized-action-plan)

---

## Executive Summary

The initial audit identified **67 issues**. A fix commit (`a77c858`) addressed several critical items — most notably adding HTML sanitization, an Error Boundary, a Toast notification system, and improved error handling across the web package.

After re-auditing the changed files, **14 issues were fully resolved**, **5 were partially resolved**, and **4 new issues** were introduced by the fixes. **48 issues remain open**, including **4 critical security vulnerabilities** and **7 high-severity bugs**.

### Issue Status After Fixes

| Status | Count |
|--------|-------|
| Fixed | 14 |
| Partially Fixed | 5 |
| New Issues | 4 |
| Remaining | 44 |
| **Total Open** | **53** |

| Severity (Open) | Count |
|----------|-------|
| Critical | 4 |
| High | 7 |
| Medium | 25 |
| Low | 17 |

---

## What Was Fixed

The following issues from the initial audit have been **fully resolved**:

| ID | Issue | Fix Applied |
|----|-------|-------------|
| SEC-1 | XSS via customHtml block (server renderer) | `sanitizeCustomHtml()` now called at `renderer.ts:177` |
| SEC-2 | XSS via customHtml block (client editor) | `sanitizeCustomHtml()` applied in `BlockCustomHtml.tsx:55` |
| BUG-5 | Missing Error Boundary in React App | `ErrorBoundary` component added, wraps `PageEditFeature` route and global app in `main.tsx` |
| BUG-4 (partial) | Silent error swallowing in LibraryDropdown | Now uses `showError()` from Toast context |
| BUG-4 (partial) | Silent error swallowing in PageScriptsPanel | Now uses `showError()` from Toast context |
| BUG-4 (partial) | Silent error swallowing in SubmissionsFeature | Error state properly displayed to user |
| BUG-4 (partial) | Silent error swallowing in FormBuilderFeature | Now uses `showError()` from Toast context |
| BUG-4 (partial) | Silent error swallowing in PagesFeature (main fetches) | Now uses `showError()` from Toast context |
| BUG-4 (partial) | Silent error swallowing in PublishDialog | Comprehensive error handling with `showError()` |
| BUG-8 | Hardcoded session secret usable in production | `app.ts` now exits with fatal error if default secret used in production |
| BUG-1 | Regex-based sanitizer too weak | Improved: now strips `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, event handlers, and `javascript:` URIs. Validates `href` on `<a>` tags. |
| — | No toast/notification system | `ToastContext.tsx` added with proper ARIA attributes |
| — | No error feedback to users | Toast system integrated across multiple features |
| SEC-1 | Server-side customHtml unsanitized | `sanitizeCustomHtml()` strips scripts, event handlers, and dangerous URIs |

---

## Remaining Critical Security Issues

### SEC-3: XSS via Rich Text Block (UNCHANGED)

- **File:** `packages/web/src/features/pages/editor/blocks/BlockText.tsx:88`
- **Status:** NOT FIXED
- **Issue:** `dangerouslySetInnerHTML` used for rich text content when not in edit mode, without sanitization.
- **Impact:** Stored XSS — malicious content persisted in page data executes on every view in the editor.
- **Fix:** Apply `sanitizeHtml()` before rendering via `dangerouslySetInnerHTML`.

### SEC-4: Server-Side Request Forgery (SSRF) in Webhook Delivery (UNCHANGED)

- **File:** `packages/api/src/modules/submissions/submissions.delivery.ts:46`
- **File:** `packages/api/src/modules/integrations/integrations.routes.ts:196-214`
- **Status:** NOT FIXED
- **Issue:** `fetch()` called with user-provided webhook URLs without validation against internal IP ranges.
- **Impact:** Attackers can probe internal services, access cloud metadata endpoints (169.254.169.254).
- **Fix:** Validate webhook URLs against a blocklist of private/reserved IP ranges.

### SEC-5: Fake Encryption of Webhook Configuration (UNCHANGED)

- **File:** `packages/api/src/modules/integrations/integrations.routes.ts:86,130`
- **Status:** NOT FIXED
- **Issue:** `configEncrypted` field is just `JSON.stringify()` — not encrypted.
- **Impact:** Sensitive webhook URLs stored in plaintext with a misleading field name.
- **Fix:** Implement actual encryption using `crypto.createCipheriv()`.

### SEC-6: CSS Injection via Page Settings (UNCHANGED)

- **File:** `packages/api/src/modules/serve/renderer.ts:537-538`
- **Status:** NOT FIXED
- **Issue:** `pageSettings.backgroundColor` and `pageSettings.fontFamily` applied directly to inline styles.
- **Impact:** CSS injection can overlay content or exfiltrate data via `url()`.
- **Fix:** Validate CSS values against a whitelist of safe patterns.

---

## Remaining High-Severity Bugs & Risks

### BUG-2: Race Condition in Slug Uniqueness Check (UNCHANGED)

- **File:** `packages/api/src/modules/pages/pages.routes.ts`
- **Issue:** Slug uniqueness check and insert are not wrapped in a transaction.
- **Fix:** Use database unique constraint or wrap in a transaction.

### BUG-3: Missing Error Handling in Serve Routes (UNCHANGED)

- **File:** `packages/api/src/modules/serve/serve.routes.ts:95-153,161-281,284-333`
- **Issue:** No try-catch blocks for database queries in serve route handlers.
- **Fix:** Add try-catch wrappers to all route handlers.

### BUG-9: Invite Accept Endpoint Lacks Authentication (UNCHANGED)

- **File:** `packages/api/src/modules/invites/invites.routes.ts:59-82`
- **Issue:** `/accept` stores invite data in session without authentication or CSRF protection.

### BUG-10: O(n²) Folder Tree Construction (UNCHANGED)

- **File:** `packages/api/src/modules/folders/folders.routes.ts:19-29`
- **Issue:** `buildTree` recursively filters all folders — O(n²).
- **Fix:** Use hash map for O(n) construction.

### BUG-11: Duplicate Serve Route Logic (UNCHANGED)

- **File:** `packages/api/src/modules/serve/serve.routes.ts:95-153,161-281`
- **Issue:** ~180 lines of near-identical code between demo and domain serve handlers.

### BUG-12: Global Script Injection Risk (UNCHANGED)

- **File:** `packages/api/src/modules/serve/renderer.ts:526-529`
- **Issue:** `globalHeaderScript` and `globalFooterScript` injected directly into all rendered pages.

### SEC-7: Unsafe URL Input Without Validation (UNCHANGED)

- **File:** `packages/web/src/features/pages/editor/blocks/BlockText.tsx:58-59`
- **Issue:** `prompt('Enter URL:')` with no scheme validation, passed directly to `document.execCommand('createLink')`.
- **Fix:** Validate URL scheme is `http`, `https`, `mailto`, or `#`.

---

## New Issues Introduced by Fixes

### NEW-1: Sanitizer Still Uses Regex (Both Packages)

- **Files:**
  - `packages/api/src/lib/sanitize-html.ts` (server)
  - `packages/web/src/lib/sanitize-html.ts` (client)
- **Severity:** MEDIUM
- **Issue:** Both sanitizers use regex-based HTML parsing instead of a proper DOM parser. The server-side sanitizer cannot use DOMParser (Node.js has no native DOM), and the client-side sanitizer's `sanitizeCustomHtml()` also uses regex.
- **Risk:** Regex-based sanitization is fundamentally bypassable with crafted payloads (e.g., nested tags, encoding tricks, parser differentials).
- **Recommendation:**
  - Server: Use `jsdom` + `DOMPurify` or the `sanitize-html` npm package
  - Client: Use `DOMPurify` directly (already has browser DOM access)

### NEW-2: Client-Side Sanitizer Incomplete Attribute Blocking

- **File:** `packages/web/src/lib/sanitize-html.ts`
- **Severity:** MEDIUM
- **Issue:** `sanitizeCustomHtml()` checks `href` and `src` for `javascript:` and `data:` schemes, but does not check other URL-bearing attributes: `poster`, `srcset`, `action`, `formaction`, `data`, `background`.
- **Fix:** Block dangerous URI schemes in all URL-bearing attributes.

### NEW-3: EditorContext Save Error Still Silent

- **File:** `packages/web/src/features/pages/editor/EditorContext.tsx:198`
- **Severity:** MEDIUM
- **Issue:** The autosave `catch` block still contains only a comment (`// Could surface error`) and does not use the Toast system added in the same commit.
- **Fix:** Import `useToast` and call `showError()` on save failure.

### NEW-4: SubmissionDetail Missing Error Handling

- **File:** `packages/web/src/features/submissions/SubmissionsFeature.tsx` (SubmissionDetail component)
- **Severity:** LOW
- **Issue:** The `useEffect` that fetches submission detail has no `.catch()` handler. If the API call fails, the component shows nothing with no feedback.
- **Fix:** Add `.catch()` with error toast.

---

## Type Safety & Cross-Package Consistency

*All type safety issues from the initial audit remain unchanged.*

### TYPE-1: FormFieldSchema Mismatch Across Packages (CRITICAL)

| Field | `blocks` | `api` | `web` |
|-------|----------|-------|-------|
| `name` | Yes | No | No |
| `placeholder` | Yes | No | No |
| `stepIndex` | No | Yes | Yes |
| `accept` | No | Yes | Yes |

- **Fix:** Consolidate into single definition in the `blocks` package.

### TYPE-2: Missing Form Field Types in Blocks Package (CRITICAL)

- **Issue:** Blocks `FormFieldType` is missing `date` and `file` types that the API supports.

### TYPE-3: Loose Block Props Typing

- **Issue:** `props?: Record<string, unknown>` provides zero type safety; unsafe `as string` casts throughout the editor.

### TYPE-4: FormSchemaJson Type Never Used

- **Issue:** Exported but never imported anywhere.

### TYPE-5: FieldMapping Type Doesn't Match Usage

- **Issue:** Type definition doesn't match actual `Record<string, string>` usage.

---

## Code Quality Issues

### QC-1: No Input Validation Library (UNCHANGED)

- **Scope:** Entire API package — all validation is manual if-checks.
- **Fix:** Adopt Zod.

### QC-2: No Structured Logging (UNCHANGED)

- **Scope:** Entire API package — only `console.log`/`console.error`.
- **Fix:** Add pino or winston.

### QC-3: Magic Numbers and Strings (UNCHANGED)

- `MAX_ATTEMPTS = 3`, `RETRY_DELAY_MS = 2000`, `UTM_TTL_DAYS = 30`, depth limit of 50.

### QC-4: Silent Error Swallowing in API (PARTIALLY FIXED)

- **Fixed:** Most web package catch blocks now show toast errors.
- **Remaining:**
  - `packages/api/src/modules/auth/auth.routes.ts:71` — `.catch(() => res.json({ user: null }))`
  - `packages/api/src/modules/integrations/integrations.routes.ts:174` — `catch { // ignore }`
  - `packages/web/src/features/pages/PagesFeature.tsx` — `mapFormId` effect catch still silent
  - `packages/web/src/features/pages/editor/EditorContext.tsx:198` — autosave catch still silent

### QC-5: Deprecated `document.execCommand()` Usage (UNCHANGED)

- **Files:** `RichTextToolbar.tsx`, `BlockText.tsx`

### QC-6: Monolithic Renderer File (UNCHANGED)

- `renderer.ts` — 576 lines handling all 25+ block types.

### QC-7: Missing URL Validation in Form Mapping (UNCHANGED)

- `FormMappingModal.tsx` — `redirectUrl` from form input not validated.

---

## React-Specific Issues (Web Package)

### REACT-1: Large Context Provider Causing Re-renders (UNCHANGED)

- `EditorContext.tsx` — 38+ memoized values in single context.

### REACT-2: Missing useMemo for Computed Values (UNCHANGED)

- `PublishDialog.tsx:42-47` — `destinationUrl` computed every render.

### REACT-3: Unnecessary useEffect Dependency (UNCHANGED)

- `PagesFeature.tsx:91` — depends on `pages` array, triggering unnecessary re-fetches.

### REACT-4: Prop Drilling in Editor Components (UNCHANGED)

- `PropertiesPanel.tsx` — block editing props passed through multiple layers.

---

## Test Coverage Gaps

*No new tests were added in the fix commit. All test coverage issues remain.*

### TEST-1: API Package — Missing Test Files

No tests for: `folders`, `forms`, `integrations`, `library`, `serve`, `workspace` routes.

### TEST-2: Web Package — Minimal Test Coverage

Only **6 test files** for the entire frontend. Not tested:
- `EditorContext.tsx` (900+ LOC)
- All block renderer components
- HTML import utilities
- Both `sanitizeHtml` functions (server + client)
- `ErrorBoundary.tsx` (new)
- `ToastContext.tsx` (new)

### TEST-3: No Security-Focused Tests (UNCHANGED)

No tests for XSS payloads, SSRF protection, or malformed input.

### TEST-4: Existing Tests Lack Edge Cases (UNCHANGED)

---

## Architecture Concerns

### ARCH-1: No Request Body Size Limits (UNCHANGED)

- `app.ts` uses `express.json()` without `{ limit: '1mb' }`.

### ARCH-2: Missing Security Headers (UNCHANGED)

- No `helmet` middleware.

### ARCH-3: No Rate Limiting on Serve Routes (UNCHANGED)

### ARCH-4: Scheduled Publishing Runs Inline (UNCHANGED)

### ARCH-5: Cascading Deletes Throughout Schema (UNCHANGED)

- All relationships use `onDelete: Cascade`.

### ARCH-6: Missing Database Indexes (UNCHANGED)

- `User.email` has no standalone index.

### ARCH-7: Inconsistent TypeScript Configuration (UNCHANGED)

| Config | `blocks` | `api` | `web` |
|--------|----------|-------|-------|
| `target` | ES2020 | ES2022 | ES2020 |
| `module` | commonjs | NodeNext | ESNext |

---

## Accessibility Issues

### A11Y-1: BlockButton Uses `<span>` Instead of `<button>` (PARTIALLY FIXED)

- **File:** `packages/web/src/features/pages/editor/blocks/BlockButton.tsx`
- **Status:** `role="button"`, `tabIndex`, and `onKeyDown` were added, but it still uses a `<span>` element instead of a native `<button>`.
- **Remaining Risk:** Assistive technology may not fully support the button semantics via ARIA alone. Native `<button>` is the recommended approach.

### A11Y-2: Missing ARIA Labels on Loading States (UNCHANGED)

### A11Y-3: No Keyboard Navigation in Editor (UNCHANGED)

---

## Configuration & Environment

### CFG-1: Missing Environment Variables in .env.example (UNCHANGED)

- `CNAME_TARGET` not documented.

### CFG-2: No Environment Validation at Startup (PARTIALLY FIXED)

- **Fixed:** `SESSION_SECRET` now validated in production — app exits if default is used.
- **Remaining:** Other required env vars (`DATABASE_URL`, `GOOGLE_CLIENT_ID`, etc.) still not validated at startup.

### CFG-3: No CSP Configuration (UNCHANGED)

---

## Summary Scorecard

| Category | Initial Grade | Updated Grade | Improvement | Open Issues |
|----------|---------------|---------------|-------------|-------------|
| **Security** | F | D- | +1 | 4 critical, 2 medium |
| **Bug Resilience** | D | C- | +1.5 | 7 high, 3 medium |
| **Type Safety** | D | D | — | 2 critical, 1 high, 2 medium |
| **Code Quality** | C | C | — | 7 medium, 8 low |
| **Test Coverage** | F | F | — | 1 high, 3 medium |
| **Architecture** | C- | C- | — | 7 medium, 3 low |
| **Accessibility** | D | D+ | +0.5 | 2 medium, 1 low |
| **Configuration** | C | C+ | +0.5 | 3 low |
| **Overall** | **D+** | **C-** | **+0.7** | **53 total** |

---

## Prioritized Action Plan

### Immediate (Week 1) — Remaining Critical Security Fixes

1. **Fix XSS in BlockText** — Apply `sanitizeHtml()` to rich text content before `dangerouslySetInnerHTML` in `BlockText.tsx:88`.
2. **Add SSRF protection** — Validate webhook URLs against private IP ranges in `submissions.delivery.ts` and `integrations.routes.ts`.
3. **Implement real encryption** — Replace `JSON.stringify` with actual crypto for `configEncrypted`.
4. **Validate CSS values** — Whitelist safe patterns for `backgroundColor`/`fontFamily` in `renderer.ts`.
5. **Replace regex sanitizers with DOMPurify** — Server: `jsdom` + DOMPurify; Client: DOMPurify directly.

### High Priority (Week 2) — Stability & Error Handling

6. **Add try-catch to serve route handlers** — All 3 endpoints in `serve.routes.ts`.
7. **Surface autosave errors** — Use Toast in `EditorContext.tsx:198` catch block.
8. **Add database unique constraint for page slugs**.
9. **Add `helmet` middleware** and `express.json({ limit: '1mb' })`.
10. **Validate URL schemes in BlockText** — Only allow `http`, `https`, `mailto`.

### Medium Priority (Week 3-4) — Type Safety & Quality

11. **Consolidate FormFieldSchema** into `blocks` package as single source of truth.
12. **Add `date` and `file` to blocks FormFieldType**.
13. **Adopt Zod** for API request validation.
14. **Add structured logging** (pino).
15. **Block dangerous URI schemes in all URL-bearing attributes** in client sanitizer.

### Ongoing — Test Coverage & Maintenance

16. **Add tests for both sanitizeHtml implementations** — Include XSS bypass payloads.
17. **Add tests for ErrorBoundary and ToastContext**.
18. **Add tests for untested API routes** — Target >70% coverage.
19. **Add tests for EditorContext** — Most critical untested file.
20. **Refactor renderer.ts** — Split into per-block modules.
21. **Fix remaining accessibility issues** — Use native `<button>`, add ARIA labels.
22. **Standardize TypeScript config** across packages.

---

*This report was generated by a comprehensive automated audit. Revision 2 reflects changes from commit `a77c858`. All file paths reference the codebase as of 2026-03-05. Manual verification of each finding is recommended before implementing fixes.*
