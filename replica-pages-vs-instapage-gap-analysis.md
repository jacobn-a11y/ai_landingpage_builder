# Replica Pages vs. Instapage: Comprehensive Gap Analysis

**Date:** March 6, 2026
**Scope:** Feature-by-feature comparison of the Replica Pages landing page editor (ai_landingpage_builder) against Instapage's production builder
**Method:** Live hands-on testing of both builders, code audit of Replica Pages repository

---

## Executive Summary

Replica Pages is in an early-stage prototype state. While it has a functional block-based editor with drag-and-drop capabilities and some unique features (HTML/MHTML import, multi-channel publishing, UTM attribution), the editor falls dramatically short of Instapage in virtually every dimension that matters for a landing page builder: canvas fidelity, element property controls, styling capabilities, and design tooling. The gap is not incremental — it is foundational.

**Overall readiness estimate: ~10-15% of Instapage's editor functionality.**

---

## 1. Canvas & Layout Model

### Instapage
- **Pixel-perfect freeform canvas** — every element has X, Y, Width, Height controls
- Elements can be placed anywhere on the canvas with absolute positioning
- Alignment guides and snapping assist with precise placement
- Separate desktop and mobile views with per-device visibility controls ("Visible on: Desktop & Mobile" / "Desktop only")
- Mature, battle-tested canvas with years of iteration

### Replica Pages
- **Two modes:** "Fluid grid" (default flow-based) and "Freeform canvas" (absolute positioning)
- **Fluid grid mode:** Elements stack vertically within sections — no freeform placement, no X/Y controls. Properties panel shows only Margin, Padding, Border radius, Background, Z-index, Width
- **Freeform canvas mode:** Adds X, Y, Width, Height fields — closer to Instapage's model but far less polished
- No alignment guides or snapping observed
- No separate mobile editing view
- No per-element device visibility controls (Instapage has "Visible on" for every element)
- Responsive preview buttons exist (desktop/tablet/mobile icons in toolbar) but only resize the viewport — no separate mobile layout editor

### Gap Severity: 🔴 CRITICAL
The canvas is the core of a landing page builder. In fluid grid mode, Replica Pages cannot produce the kind of layouts Instapage creates. The freeform mode exists but lacks the polish, guides, snapping, and mobile-specific controls that make Instapage usable for production work.

---

## 2. Element Types — Availability Comparison

| Element | Instapage | Replica Pages | Gap |
|---------|-----------|---------------|-----|
| Headline (H1-H6) | ✅ Full heading levels, AI rewrite | ❌ Text block only, no heading levels | 🔴 |
| Paragraph | ✅ Full text with lists, AI rewrite | ⚠️ Text block with basic B/I/U/Link | 🔴 |
| Button | ✅ Colors, hover states, effects, 3D, shadow | ⚠️ Text + Link URL only | 🔴 |
| Image | ✅ 33M stock library, masks, backgrounds, alt text | ⚠️ Present in sidebar but no image on test canvas | 🟡 |
| Video | ✅ URL, title, progress bar, auto play | ⚠️ Provider dropdown, URL, autoplay, mute | 🟡 |
| Forms | ✅ Full library (My Forms, Global, Templates), 5 templates, multi-field | ❌ Exists in code but NOT in add block panel | 🔴 |
| Carousel/Slider | ✅ Slides, auto play, arrows, dots, transitions, loop | ❌ Missing entirely | 🔴 |
| Box (rectangle) | ✅ Background, border, corner radius, opacity, drop shadow | ⚠️ Width, Height, Fill color, Border radius only | 🟡 |
| Circle | ✅ Background, border, opacity, drop shadow | ⚠️ Size, Fill color only | 🟡 |
| Vertical Line | ✅ Color, border style | ❌ Missing entirely (Divider exists but different) | 🟡 |
| Horizontal Line | ✅ Color, border style | ⚠️ Divider block (basic) | 🟡 |
| Accordion | ✅ BG color, arrows, divider, spacing, radius, text style, sections | ❌ Missing entirely | 🔴 |
| Timer/Countdown | ✅ Colors (3), time settings, language, timezone, label position, hide labels | ⚠️ Target date, Days/Hours labels only — no colors, no minutes/seconds labels, no timezone | 🔴 |
| Custom HTML | ✅ Full HTML widget with "Full size content" toggle | ❌ Exists in code but NOT in add block panel | 🔴 |
| Instablocks (reusable) | ✅ Full library of saved/global reusable blocks | ❌ No equivalent | 🔴 |
| Section | ✅ (implicit via canvas) | ✅ Available | 🟢 |
| Container | N/A (Instapage uses Box) | ✅ Available | 🟢 |
| Grid | N/A | ✅ Available | 🟢 |
| Columns | N/A | ✅ Available | 🟢 |
| Stack | N/A | ✅ Available | 🟢 |
| Spacer | N/A (manual positioning) | ✅ Height (px) control | 🟢 |
| Table | N/A | ❌ In code but NOT in add block panel | 🟡 |

**Summary:** Instapage has 15 element types all fully functional. Replica Pages has ~13 visible in the sidebar but 3 critical ones (Form, Custom HTML, Table) exist only in code, not the UI. Carousel and Accordion are entirely absent.

---

## 3. Property Panel Depth — Element-by-Element

This is the most significant gap. Instapage has deeply customized property panels per element type. Replica Pages uses a mostly generic panel for all elements.

### 3.1 Text / Headline

| Property | Instapage | Replica Pages |
|----------|-----------|---------------|
| Font family | ✅ 5000+ fonts | ❌ None |
| Font size | ✅ Numeric input (e.g., 36px, 16px) | ❌ None |
| Font weight | ✅ Dropdown | ❌ None |
| Line height | ✅ Numeric (e.g., 1.6) | ❌ None |
| Heading levels | ✅ H1-H6 selector | ❌ None |
| Text color | ✅ Color picker | ❌ None |
| Link color | ✅ Separate color picker | ❌ None |
| Bold | ✅ | ✅ (inline toolbar) |
| Italic | ✅ | ✅ (inline toolbar) |
| Underline | ✅ | ✅ (inline toolbar) |
| Strikethrough | ✅ | ❌ |
| Subscript/Superscript | ✅ | ❌ |
| Text alignment | ✅ 5 options (left, center, right, justify, full) | ❌ None |
| Lists (bullet/numbered) | ✅ (Paragraph) | ❌ None |
| AI content rewrite | ✅ "REFINE WITH AI" button | ❌ None |
| Position & Size (X, Y, W, H) | ✅ Always present | ⚠️ Only in Canvas mode |

### 3.2 Button

| Property | Instapage | Replica Pages |
|----------|-----------|---------------|
| Button text | ✅ | ✅ |
| Link URL | ✅ | ✅ |
| Text color | ✅ | ❌ |
| Text hover color | ✅ | ❌ |
| Button background color | ✅ | ❌ (only generic Background field) |
| Button hover color | ✅ | ❌ |
| Font family/size/weight | ✅ | ❌ |
| Effects (Flat/Glossy) | ✅ | ❌ |
| Shadow | ✅ | ❌ |
| Border | ✅ | ❌ |
| 3D effect | ✅ | ❌ |
| Corner radius | ✅ | ⚠️ Generic border radius field |
| Background image | ✅ | ❌ |
| Accessibility (aria-label) | ✅ | ❌ |

### 3.3 Image

| Property | Instapage | Replica Pages |
|----------|-----------|---------------|
| Image upload | ✅ | Not tested (no image on canvas) |
| Stock library | ✅ 33M images via Bigstock | ❌ |
| Image search | ✅ In-builder search | ❌ |
| Recent images | ✅ | ❌ |
| Edit mask | ✅ | ❌ |
| Set as background | ✅ | ❌ |
| Alt text | ✅ | ❌ |
| Link | ✅ | ❌ |

### 3.4 Video

| Property | Instapage | Replica Pages |
|----------|-----------|---------------|
| Video URL | ✅ | ✅ |
| Provider selection | ❌ (auto-detects) | ✅ YouTube dropdown |
| Video title | ✅ | ❌ |
| Progress bar toggle | ✅ | ❌ |
| Auto play | ✅ | ✅ |
| Mute | ❌ | ✅ |

### 3.5 Shapes (Box/Circle)

| Property | Instapage | Replica Pages |
|----------|-----------|---------------|
| Size (W × H) | ✅ Position & Size panel | ✅ Width/Height or Size fields |
| Fill/Background color | ✅ | ✅ |
| Background image | ✅ | ❌ |
| Border color/style | ✅ | ❌ |
| Corner radius | ✅ (4 individual corners + consistent) | ⚠️ Single border radius |
| Opacity | ✅ Slider | ❌ |
| Drop shadow | ✅ | ❌ |

### 3.6 Countdown Timer

| Property | Instapage | Replica Pages |
|----------|-----------|---------------|
| Target date/time | ✅ Full date + time picker | ✅ Date/time picker |
| Number color | ✅ | ❌ |
| Timer background color | ✅ | ❌ |
| Label color | ✅ | ❌ |
| Label position (above/below) | ✅ | ❌ |
| Hide individual labels | ✅ | ❌ |
| Language selection | ✅ | ❌ |
| Timezone | ✅ | ❌ |
| Days/Hours/Minutes/Seconds labels | ✅ All four | ⚠️ Only Days and Hours visible |

---

## 4. Global/Page-Level Features

| Feature | Instapage | Replica Pages |
|---------|-----------|---------------|
| Page background settings | ✅ | ❌ |
| Default fonts | ✅ Set global fonts for page | ❌ |
| Sticky bar | ✅ | ❌ |
| Page popup | ✅ | ❌ |
| Custom CSS editor | ✅ | ❌ |
| Custom JavaScript | ✅ | ⚠️ Scripts management exists at platform level |
| Version history | ✅ | ❌ (Undo/redo buttons exist) |
| AMP mobile pages | ✅ | ❌ |
| A/B testing (variations) | ✅ Native | ❌ |
| Heatmaps | ✅ Native | ❌ |
| Dynamic text replacement | ✅ | ❌ |
| Real-time collaboration | ✅ | ❌ |
| 500+ templates | ✅ | ⚠️ 3 templates (Hero, Features, CTA) |

---

## 5. Platform Features Unique to Replica Pages

Replica Pages does have some features that Instapage doesn't offer in the same way:

| Feature | Description |
|---------|-------------|
| HTML/MHTML import | Client-side DOMParser can import existing landing pages with form detection |
| Multi-channel publishing | Pages can be published to multiple domains/channels |
| UTM attribution tracking | Built-in UTM parameter tracking for form submissions |
| Role-based access | Admin/Editor/Viewer roles with separate portals (Admin :5173, Marketer :5174, RevOps :5175) |
| Form submission management | Dedicated submissions viewer with form mapping |
| "Show when" URL param | Every block can be conditionally shown based on URL parameters |
| Page cloning | Clone existing pages |
| Script management | Add/manage custom scripts at platform level |

---

## 6. Canvas & Editing Experience

### What works in Replica Pages:
- Clicking elements in the Layers panel selects them and shows properties
- "Click to edit..." text on canvas for inline text editing
- Blocks can be added from sidebar (click + icon)
- Undo/redo buttons present
- Two canvas modes (Grid and Canvas/freeform)
- Responsive preview at 3 viewport sizes

### What doesn't work well or is missing:
- **No drag-and-drop of elements from sidebar to canvas** (click adds to bottom)
- **No freeform element repositioning in Grid mode** — elements locked in flow
- **No alignment guides or snapping** in either mode
- **No element grouping**
- **No copy/paste of elements on canvas** (Copy/Paste buttons exist in properties but for style, not element duplication)
- **No right-click context menu**
- **No keyboard shortcuts** for common actions (besides undo/redo)
- **No zoom controls** on canvas
- **No rulers or measurement guides**
- **No element locking** (prevent accidental moves)
- **No multi-select** (shift-click multiple elements)
- **Generic property panel** for most elements — same Margin/Padding/Background/Z-index/Width for all

---

## 7. Code Architecture Concerns

From the code audit (docs/CODE_AUDIT_REPORT.md):

| Issue | Severity | Detail |
|-------|----------|--------|
| XSS vulnerability | 🔴 Critical | BlockCustomHtml uses dangerouslySetInnerHTML without sanitization |
| Monolithic EditorContext | 🔴 High | Single context with 40+ values causes unnecessary re-renders |
| No test coverage | 🔴 High | Zero test files in entire codebase |
| No ErrorBoundary | 🟡 Medium | Runtime errors crash entire editor |
| 50+ TypeScript `as` assertions | 🟡 Medium | Type safety bypassed throughout |
| No code splitting | 🟡 Medium | All blocks loaded upfront |
| ~575-line renderer.ts switch | 🟡 Medium | Maintenance and extension difficulty |
| Silent error handling | 🟡 Medium | Errors swallowed in catch blocks |

---

## 8. Priority Gap Ranking

Ranked by impact on achieving Instapage parity:

### P0 — Must Have (Blocks users from building real landing pages)
1. **Typography controls** — Font family, size, weight, color, alignment, line height for all text elements
2. **Heading levels** — H1-H6 support for SEO and hierarchy
3. **Button styling** — Background color, hover states, border, shadow, effects
4. **Forms** — Surface the form block that exists in code; add field types, validation, integrations
5. **Image handling** — Upload, alt text, linking, background mode
6. **Canvas polish** — Alignment guides, snapping, element dragging in grid mode

### P1 — High Priority (Significant usability gaps)
7. **Color pickers** — Real color picker UI instead of hex text inputs
8. **Opacity control** — For shapes, images, containers
9. **Drop shadows** — For buttons, shapes, images
10. **Custom HTML block** — Surface the block that exists in code
11. **Corner radius per-corner** — Individual corner control (Instapage has all 4)
12. **Templates library** — Expand from 3 to at least 50+ professionally designed templates
13. **Page background settings** — Color, image, gradient at page level
14. **Default fonts** — Set page-wide typography defaults

### P2 — Important (Competitive feature gaps)
15. **Accordion widget** — FAQ sections are critical for landing pages
16. **Carousel/Slider** — Image galleries and testimonial sliders
17. **AI content generation** — "Refine with AI" for text rewriting
18. **A/B testing** — Native variation testing
19. **Custom CSS editor** — Power user escape hatch
20. **Reusable blocks** — Save and reuse across pages (like Instablocks)
21. **Mobile-specific editing** — Separate mobile layout, not just responsive preview
22. **Stock image library** — Even a small curated library adds huge value

### P3 — Nice to Have (Polish and advanced features)
23. Sticky bar support
24. Page popups
25. Heatmaps
26. Dynamic text replacement
27. Real-time collaboration
28. Version history with restore
29. AMP page support
30. Keyboard shortcuts

---

## 9. Quantitative Summary

| Dimension | Instapage | Replica Pages | Gap % |
|-----------|-----------|---------------|-------|
| Element types (functional) | 15 | ~10 (3 hidden in code) | 33% missing |
| Avg properties per element | 12-20 | 3-7 | ~65% fewer |
| Typography controls | 8+ per text element | 0 | 100% gap |
| Color controls | Per-property color pickers | Hex text input only | ~80% gap |
| Canvas features | 10+ (guides, snap, group, etc.) | 2 modes, basic positioning | ~80% gap |
| Templates | 500+ | 3 | 99% gap |
| Page-level settings | 7+ | 1 (Scripts) | ~85% gap |
| AI features | Native AI content | None | 100% gap |
| Testing/Analytics | A/B + Heatmaps | None | 100% gap |

---

## 10. Conclusion

Replica Pages has a working foundation: the block editor renders, elements can be added and selected, and the platform features (publishing, forms management, UTM tracking, roles) are genuinely differentiated. However, the editor itself — the core product surface where marketers spend their time — is at an early prototype level compared to Instapage.

The most impactful investment would be in the **property panel system**: replacing the generic one-size-fits-all panel with element-specific panels that expose the styling controls users need (typography, colors, effects, hover states). This single change would dramatically close the usability gap without requiring architectural changes to the canvas itself.

The canvas freeform mode provides a good starting point for pixel-perfect positioning, but needs significant polish (alignment guides, snapping, element dragging) to be production-ready.
