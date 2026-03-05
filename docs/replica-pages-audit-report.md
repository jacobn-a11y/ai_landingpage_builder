# Replica Pages — Comprehensive UI/UX & Usability Audit

**Date:** March 5, 2026  
**Application:** Replica Pages (AI Landing Page Builder) v0.7  
**Commit:** 7d4626d (latest main)  
**Auditor:** Claude  
**Environment:** Local test environment with seeded personas and bypass auth

---

## Executive Summary

Replica Pages is an AI-powered landing page builder designed for marketing teams. Its core workflow — import HTML, map form fields, publish, and capture leads — was tested across all three user roles (Admin, Marketer/Editor, Viewer) and published demo pages.

**The application has strong fundamentals in its import and form-mapping pipeline**, but two critical bugs block core workflows entirely. The page editor crashes on every page due to a React hooks violation, and the Viewer role has zero permission restrictions, effectively giving read-only users full edit access.

### Severity Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **P0 — Blocker** | 1 | Page editor crash (100% repro, blocks all editing) |
| **P1 — Critical** | 2 | Publishing page empty; Viewer role has no restrictions |
| **P2 — Major** | 2 | Demo pages 404; "Upload & open editor" doesn't open editor |
| **P3 — Minor** | 3 | Missing tooltips; form field auto-map gap; default page naming |

---

## Test Environment

| Role | URL | User |
|------|-----|------|
| Admin | http://localhost:5173 | admin@localhost |
| Marketer (Editor) | http://localhost:5174 | marketer@localhost |
| Viewer | http://localhost:5175 | revops@localhost |
| API / Demo Pages | http://localhost:3001 | — |

---

## Bug Report

### P0-001: Page Editor Crashes on All Pages (Blocker)

**Severity:** P0 — Blocker  
**Component:** `PageEditFeature.tsx:459`  
**Repro rate:** 100%  
**Affected users:** All roles

**Steps to Reproduce:**
1. Navigate to Pages
2. Click the edit (pencil) icon on any page
3. Page editor loads briefly, then crashes

**Expected:** Drag-and-drop page editor opens with blocks, styling controls, and preview.  
**Actual:** React error: *"Rendered more hooks than during the previous render"*

**Root Cause:** A `useState` hook at line 459 of `PageEditFeature.tsx` is called conditionally (inside a branch that doesn't always execute). This violates React's Rules of Hooks — hooks must be called in the same order on every render. When the component's state changes, the hook count shifts from N to N+1, crashing the reconciler.

**Impact:** The entire page editor — the core product feature — is completely non-functional. No page can be edited, previewed, or built. The ErrorBoundary catches the crash and offers a "Try again" button, but retrying re-triggers the same crash.

**Suggested Fix:** Move the `useState` call outside the conditional block. Initialize it unconditionally and conditionally use its value instead.

---

### P1-001: Publishing Page Is Empty

**Severity:** P1 — Critical  
**Component:** Publishing section (`/publishing`)  
**Repro rate:** 100%

**Steps to Reproduce:**
1. Navigate to Publishing from the left sidebar

**Expected:** Publishing interface with options for Demo domain, Custom domain (CNAME), WordPress, Drupal, and Webflow deployment targets, along with scheduling and status.  
**Actual:** Page loads with only a header and subtitle. No publish targets, no action buttons, no scheduling UI. The page body is entirely empty.

**Impact:** Users cannot publish any pages through the UI. The PRD specifies 5 publishing destinations — none are accessible.

---

### P1-002: Viewer Role Has No Permission Restrictions

**Severity:** P1 — Critical  
**Component:** `ProtectedRoute.tsx`, Role-based access control  
**Repro rate:** 100%

**Steps to Reproduce:**
1. Open the Viewer instance at localhost:5175 (revops@localhost)
2. Observe the Pages view

**Expected (per PRD):** "View pages, forms, submissions, and settings. No editing or publishing." The viewer should see a read-only interface with no create, edit, delete, or import actions.  
**Actual:** The Viewer sees an identical interface to the Marketer role:
- "Import HTML" button is visible and clickable
- "Create page" button is visible and clickable
- "Upload page" button is visible and clickable
- "New folder" button is visible and clickable
- All row action icons (edit, export, form map, clone, delete) are visible and clickable

**Positive note:** Admin-only navigation sections (Domains, Integrations, Scripts, Users) *are* correctly hidden from the Viewer. The route guard also correctly redirects direct URL access to `/domains` back to `/pages`. However, within the allowed sections, there is no distinction between Editor and Viewer permissions.

**Impact:** Any user with Viewer access can modify, delete, or import pages — a security and authorization failure.

---

### P2-001: Demo Pages Return Raw 404 Errors

**Severity:** P2 — Major  
**Component:** Express server demo route (`localhost:3001/demo/:slug`)  
**Repro rate:** 100%

**Steps to Reproduce:**
1. Navigate to `http://localhost:3001/demo/spring-demand-gen-campaign`
2. Or navigate to `http://localhost:3001/demo/imported-page`

**Expected:** Either the published page renders, or a styled 404 page is shown.  
**Actual:** Raw Express error text: `Cannot GET /demo/spring-demand-gen-campaign` — unstyled, no branding, no navigation back.

**Notes:** All pages in the system are in "draft" status, which likely means no content has been published to the demo route. However, the raw Express 404 is a poor experience. A branded 404 with a "return home" link or contact CTA should be served instead.

---

### P2-002: "Upload & Open Editor" Doesn't Open Editor

**Severity:** P2 — Major  
**Component:** Upload page modal flow  
**Repro rate:** 100%

**Steps to Reproduce:**
1. Click "Upload page" in the Pages view
2. Upload an HTML file (successfully parsed — shows block count and form detection)
3. Complete form field mapping
4. Click "Upload & open editor" (or equivalent save action)

**Expected:** Page is created and the editor opens immediately.  
**Actual:** Page is created successfully (appears in the page list with correct name and slug), but the user is returned to the page list instead of the editor. This is likely because the editor navigation triggers the P0 crash, which is caught silently and falls back to the list view.

---

### P3-001: No Tooltips on Page Row Action Icons

**Severity:** P3 — Minor  
**Component:** Pages list, action icon buttons  

**Description:** Each page row has 5 small icon buttons (pencil/edit, download/export, form-map, copy/clone, trash/delete). None of them have hover tooltips. For first-time users or anyone unfamiliar with the iconography, the meaning of each icon is ambiguous — particularly the "form map" icon.

**Suggested Fix:** Add `title` attributes or tooltip components to each action button with labels like "Edit page," "Export HTML," "Map form fields," "Clone page," "Delete page."

---

### P3-002: Form Field "Name" Not Auto-Mapped

**Severity:** P3 — Minor  
**Component:** Form field mapping modal (upload/import flow)

**Description:** When uploading an HTML form with fields `name`, `email`, and `phone`, the auto-mapper correctly maps `email` → Email and `phone` → Phone, but maps `name` → "— Skip —". The `name` attribute (`name="name"`) should be recognized and mapped to the canonical "Name" field (or "Full Name").

**Impact:** Users must manually map one of the most common form fields. Since the auto-mapper handles email and phone correctly, the omission of "name" is unexpected and adds friction to the import workflow.

---

### P3-003: Imported Page Defaults to Generic Name

**Severity:** P3 — Minor  
**Component:** Upload page flow

**Description:** When uploading an HTML file, the created page defaults to the name "Imported page" regardless of the file name or `<title>` tag content. The uploaded test file had `<title>Test Landing Page</title>`, but the page was named "Imported page."

**Suggested Fix:** Default the page name to the file's `<title>` tag content (if present), or fall back to the filename without extension.

---

## Positive Findings

### Navigation & Layout
The admin dashboard loads correctly with all 9 navigation sections visible: Pages, Forms, Submissions, Publishing, Domains, Integrations, Scripts, Users, and Settings. The left sidebar navigation is well-organized with clear iconography and active-state highlighting.

### Import & Upload Pipeline
The HTML import pipeline is the strongest part of the application. Testing with a real HTML file containing a form with three fields (name, email, phone) demonstrated:

- **File upload works correctly** — drag-and-drop zone accepts HTML files
- **HTML parsing is accurate** — correctly identifies "4 blocks" and "1 form detected"
- **Form field detection works** — all three form fields (`name`, `email`, `phone`) are detected from the HTML
- **Field mapping UI is well-designed** — each detected field shows a dropdown with canonical field options (Email, Phone, First Name, Last Name, Full Name, Company, etc.)
- **Auto-mapping is partially effective** — email and phone are correctly auto-mapped; only "name" is missed
- **Slug collision handling works** — when a slug already exists, the system appends `-1` (e.g., `imported-page-1`)

### Role-Based Route Guards (Partial)
The Marketer role correctly hides admin-only navigation sections (Domains, Integrations, Scripts, Users). Direct URL access to admin routes (e.g., `/domains`) is properly intercepted and redirects to `/pages`. This demonstrates that the route guard infrastructure works — it just needs to be extended to differentiate Viewer from Editor permissions within allowed sections.

### Forms, Submissions, and Settings Pages
All secondary pages load without errors:
- **Forms** — list view renders with form entries
- **Submissions** — list view renders with submission data
- **Settings** — settings panel loads with configuration options
- **Domains, Integrations, Scripts, Users** — all load correctly in the Admin view

### Error Boundary
The ErrorBoundary component successfully catches the P0 editor crash and prevents a full application white-screen. While the "Try again" button doesn't resolve the underlying issue, the boundary itself is a solid safety net.

---

## Recommendations

### Immediate (Pre-Launch Blockers)

1. **Fix the conditional useState hook in PageEditFeature.tsx:459.** This is the single most impactful fix — it unblocks the entire page editor, which is the core product.

2. **Implement Viewer role permissions.** Add permission checks at the component level to hide or disable create/edit/delete actions for Viewer users. The route guard infrastructure already works for admin routes; extend it with a `canEdit` or `role === 'viewer'` check for UI elements.

3. **Populate the Publishing page.** The publishing interface needs its UI components — publish target selection, domain configuration, and status display.

### Short-Term (Quality Polish)

4. **Add a styled 404 page for demo routes.** Replace the raw Express error with a branded page that includes a link back to the dashboard.

5. **Fix the "Upload & open editor" flow.** After page creation, ensure the editor navigation succeeds (this may resolve automatically once P0-001 is fixed).

6. **Add tooltips to all icon-only action buttons** across the application.

### Nice-to-Have (UX Improvements)

7. **Improve form field auto-mapping** to recognize `name` as a canonical field.

8. **Default imported page names** to the HTML `<title>` content or filename.

9. **Add a confirmation dialog** for destructive actions (delete page, delete folder) if not already present.

---

## Test Coverage Matrix

| Feature | Admin | Marketer | Viewer | Status |
|---------|-------|----------|--------|--------|
| Navigation (all 9 sections) | ✅ Visible | ✅ 5 visible (admin hidden) | ✅ 5 visible (admin hidden) | Working |
| Route guards (admin URLs) | N/A | ✅ Redirects to /pages | ✅ Redirects to /pages | Working |
| Page list view | ✅ | ✅ | ✅ | Working |
| Page editor | ❌ Crashes | ❌ Crashes | ❌ Crashes | **P0 Bug** |
| Import HTML | ✅ | ✅ | ⚠️ Should be hidden | Working (permissions bug) |
| Upload page | ✅ | ✅ | ⚠️ Should be hidden | Working (permissions bug) |
| Form detection & mapping | ✅ | ✅ | ⚠️ Should be hidden | Working |
| Create page | ✅ | ✅ | ⚠️ Should be hidden | Working (permissions bug) |
| Publishing | ❌ Empty page | ❌ Empty page | ❌ Empty page | **P1 Bug** |
| Forms list | ✅ | ✅ | ✅ | Working |
| Submissions list | ✅ | ✅ | ✅ | Working |
| Settings | ✅ | ✅ | ✅ | Working |
| Domains | ✅ | N/A (hidden) | N/A (hidden) | Working |
| Integrations | ✅ | N/A (hidden) | N/A (hidden) | Working |
| Scripts | ✅ | N/A (hidden) | N/A (hidden) | Working |
| Users | ✅ | N/A (hidden) | N/A (hidden) | Working |
| Demo pages | ❌ Raw 404 | N/A | N/A | **P2 Bug** |
| Viewer read-only UI | N/A | N/A | ❌ Full edit access | **P1 Bug** |

---

*End of audit report.*
