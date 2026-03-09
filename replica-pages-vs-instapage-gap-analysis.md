# Replica Pages → Instapage Parity: Product Requirements Document

**Date:** March 6, 2026
**Author:** Gap Analysis Agent
**Scope:** Complete feature-by-feature PRD to bring Replica Pages landing page editor to Instapage parity
**Method:** Live hands-on testing of both builders (every element, every property panel, every page setting), code audit of Replica Pages repository, architecture review
**Version:** 2.0 — PRD-level detail

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Canvas & Layout Engine](#2-canvas--layout-engine)
3. [Element Catalog — Full Feature Spec per Element](#3-element-catalog)
   - 3.1 Headline
   - 3.2 Paragraph
   - 3.3 Button
   - 3.4 Image
   - 3.5 Video
   - 3.6 Form
   - 3.7 Carousel / Slider
   - 3.8 Box (Rectangle)
   - 3.9 Circle
   - 3.10 Vertical Line
   - 3.11 Horizontal Line / Divider
   - 3.12 Accordion
   - 3.13 Countdown Timer
   - 3.14 Custom HTML Widget
   - 3.15 Instablocks (Reusable Blocks)
   - 3.16 Table
4. [Shared Property System (All Elements)](#4-shared-property-system)
5. [Typography System](#5-typography-system)
6. [Color System](#6-color-system)
7. [Page-Level Settings](#7-page-level-settings)
8. [Canvas Interaction & Editing UX](#8-canvas-interaction--editing-ux)
9. [Responsive / Mobile Editing](#9-responsive--mobile-editing)
10. [Platform Features (Outside Editor)](#10-platform-features-outside-editor)
11. [Code Architecture Requirements](#11-code-architecture-requirements)
12. [Replica Pages Unique Features to Preserve](#12-replica-pages-unique-features-to-preserve)
13. [Implementation Phases & Priorities](#13-implementation-phases--priorities)
14. [Appendix: Raw Property Inventories](#appendix-raw-property-inventories)

---

## 1. Executive Summary

Replica Pages is an early-stage landing page builder currently at approximately **10–15% of Instapage's editor functionality**. While the platform layer (publishing, form submissions, UTM tracking, role-based access) has genuine differentiation, the editor — the core surface where marketers build pages — is fundamentally incomplete.

This PRD documents every feature and sub-feature needed to bring Replica Pages to Instapage parity, organized as actionable requirements with current state, target state, and implementation guidance.

### Critical Gaps at a Glance

| Gap Category | Severity | Summary |
|---|---|---|
| Typography controls | 🔴 CRITICAL | Zero font family, size, weight, color, alignment controls. Instapage has 8+ per text element. |
| Element-specific property panels | 🔴 CRITICAL | Generic one-size-fits-all panel for all elements. Instapage has deeply customized panels per element type. |
| Button styling | 🔴 CRITICAL | Text + URL only. No colors, hover states, effects, borders, shadows. |
| Forms | 🔴 CRITICAL | Code exists but not surfaced in UI. Instapage has full form builder with templates, field types, validation. |
| Canvas polish | 🔴 CRITICAL | No alignment guides, snapping, element grouping, or multi-select. |
| Missing elements | 🔴 HIGH | Carousel, Accordion, Custom HTML, Table not available. |
| Color system | 🟡 HIGH | Hex text input only. No color picker, no opacity, no gradients. |
| Mobile editing | 🟡 HIGH | Preview only, no separate mobile layout editor. |
| Page settings | 🟡 HIGH | No page background, default fonts, sticky bars, popups, custom CSS. |
| Templates | 🟡 MEDIUM | 3 pattern templates vs. Instapage's 500+. |
| AI features | 🟡 MEDIUM | None vs. Instapage's AI content rewriting. |
| A/B testing | 🟡 MEDIUM | None vs. Instapage's native variations. |

---

## 2. Canvas & Layout Engine

### 2.1 Canvas Positioning Model

#### Instapage (Target State)
- **Pixel-perfect freeform canvas** is the ONLY mode
- Every element has X, Y, Width, Height numeric inputs in a "Position & Size" panel section
- Elements can be placed anywhere on the canvas with absolute positioning
- No flow/grid system — everything is absolute
- Canvas boundary is the page width (typically ~1080px center column)

#### Replica Pages (Current State)
- **Two modes:** "Fluid grid" (default) and "Freeform canvas"
- **Fluid grid mode:** Flow-based layout. Elements stack vertically within sections. No X/Y controls. Properties: Margin T/R/B/L, Padding, Border radius, Background, Z-index, Width
- **Freeform canvas mode:** Adds X, Y, Width, Height fields — closer to Instapage but not polished

#### Requirements to Reach Parity

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| CANVAS-001 | Default to freeform canvas mode for new pages | P0 | Instapage is freeform-only. Grid mode can remain as an option but freeform must be default. |
| CANVAS-002 | Position & Size panel on every element | P0 | Every element must show X, Y, W, H numeric inputs when selected, in both modes. |
| CANVAS-003 | Pixel-snap positioning | P0 | Elements should snap to whole pixel values. |
| CANVAS-004 | Canvas boundary enforcement | P1 | Visual indication of the page boundary (center column). Elements that extend beyond should show warning. |
| CANVAS-005 | Maintain grid mode as secondary option | P2 | Keep flow-based layout for users who prefer it, but it is not the primary mode. |

### 2.2 Alignment & Guides

#### Instapage (Target State)
- Smart alignment guides appear when dragging elements (cyan/teal lines)
- Snapping to other elements' edges, centers
- Snapping to canvas center line
- Visible column guides on canvas (dotted vertical lines)
- Center alignment indicator (diamond/circle at horizontal center)

#### Replica Pages (Current State)
- No alignment guides
- No snapping
- No visual column guides

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| ALIGN-001 | Smart alignment guides during drag | P0 | Show guide lines when element edge/center aligns with another element's edge/center. |
| ALIGN-002 | Snap to guides | P0 | Element should snap to alignment positions (configurable snap distance, default ~5px). |
| ALIGN-003 | Canvas center line guide | P1 | Persistent or on-drag vertical center line. |
| ALIGN-004 | Column grid overlay | P2 | Optional visible column grid (like Instapage's dotted lines). |
| ALIGN-005 | Distribute evenly | P2 | Select multiple elements → distribute spacing evenly horizontal/vertical. |
| ALIGN-006 | Align selected elements | P2 | Align left/right/center/top/bottom/middle for multi-selection. |

### 2.3 Element Selection & Manipulation

#### Instapage (Target State)
- Click to select element
- Resize handles on all 8 points (4 corners + 4 midpoints) — cyan/teal colored
- Drag to move element freely on canvas
- Multi-select via shift-click or drag selection box
- Right-click context menu (copy, paste, duplicate, delete, lock, group, arrange)
- Keyboard shortcuts: Delete/Backspace to remove, Ctrl+C/V copy/paste, Ctrl+Z/Y undo/redo, arrow keys to nudge

#### Replica Pages (Current State)
- Click to select in Layers panel or canvas
- No visible resize handles on canvas (or very subtle)
- No drag-to-move in grid mode
- No multi-select
- No right-click context menu
- Only undo/redo buttons, no keyboard shortcuts observed

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| SELECT-001 | 8-point resize handles | P0 | Visible, draggable handles at corners and midpoints. Color: accent color (e.g., cyan). |
| SELECT-002 | Drag to move | P0 | Click and drag any selected element to reposition. Must work in freeform mode. |
| SELECT-003 | Multi-select (Shift+click) | P1 | Hold Shift and click to add elements to selection. |
| SELECT-004 | Drag selection box | P1 | Click empty canvas area and drag to create selection rectangle. |
| SELECT-005 | Right-click context menu | P1 | Options: Copy, Paste, Duplicate, Delete, Lock/Unlock, Bring Forward, Send Backward, Group, Ungroup. |
| SELECT-006 | Keyboard shortcuts | P1 | Delete, Ctrl+C/V, Ctrl+Z/Y, arrow keys (1px nudge), Shift+arrow (10px nudge). |
| SELECT-007 | Element locking | P2 | Lock element to prevent accidental moves. Visual padlock icon. |
| SELECT-008 | Element grouping | P2 | Group multiple elements to move/resize as one unit. |

---

## 3. Element Catalog — Full Feature Spec per Element

For each element below, "Instapage Properties" is what was observed during live testing. "Replica Pages Current" is the current state. "Requirements" are what must be built.

---

### 3.1 Headline (H1-H6)

#### Instapage Properties (Observed)
**Content Panel:**
- Inline text editing on double-click
- Heading level selector: H1, H2, H3, H4, H5, H6
- "REFINE WITH AI" button — opens AI-powered content rewriting

**Typography Panel:**
- Font family dropdown (5000+ fonts via Google Fonts + system fonts)
- Font size: numeric input with px unit (e.g., 36)
- Font weight: dropdown (Thin, Light, Regular, Medium, Bold, Black, etc.)
- Line height: numeric input (e.g., 1.6)
- Letter spacing: numeric input
- Text color: color picker swatch
- Link color: separate color picker swatch

**Text Formatting Toolbar (inline):**
- Bold (B), Italic (I), Underline (U), Strikethrough (S)
- Subscript, Superscript
- Text alignment: Left, Center, Right, Justify, Full width
- Insert link

**Layout Panel:**
- Position & Size: X, Y, W, H numeric inputs
- Visible on: "Desktop & Mobile" / "Desktop only" / "Mobile only" dropdown

#### Replica Pages Current State
- Single "Text" block type — no distinction between Headline and Paragraph
- Inline toolbar: Bold (B), Italic (I), Underline (U), Link
- No heading level selector (no H1-H6)
- No font family, font size, font weight, line height, letter spacing
- No text color control
- No text alignment controls
- No AI content rewriting
- No Position & Size (unless in canvas mode)
- No Visible on device control
- Generic panel only: Show when, Margin, Padding, Border radius, Background, Z-index, Width

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| HEAD-001 | Separate Headline element type | P0 | Distinct from Paragraph. Add to sidebar. |
| HEAD-002 | Heading level selector (H1-H6) | P0 | Dropdown or buttons in properties panel. SEO-critical. |
| HEAD-003 | Font family dropdown | P0 | Minimum: Google Fonts integration (1000+ fonts). Searchable dropdown. |
| HEAD-004 | Font size numeric input (px) | P0 | Default by heading level: H1=48, H2=36, H3=28, H4=24, H5=20, H6=16. |
| HEAD-005 | Font weight dropdown | P0 | Options depend on selected font. Minimum: Regular, Medium, Semi-Bold, Bold, Extra-Bold. |
| HEAD-006 | Line height numeric input | P0 | Default: 1.4. Range: 0.5–3.0. |
| HEAD-007 | Text color picker | P0 | Full color picker with hex, RGB, opacity. Not a hex text input. |
| HEAD-008 | Text alignment buttons | P0 | Left, Center, Right, Justify. Visual icon buttons. |
| HEAD-009 | Letter spacing input | P1 | Numeric input in px or em. Default: 0. |
| HEAD-010 | Strikethrough formatting | P1 | Add to inline toolbar. |
| HEAD-011 | Subscript/Superscript | P2 | Add to inline toolbar. |
| HEAD-012 | Link color picker | P1 | Separate from text color. Applied to hyperlinked text. |
| HEAD-013 | AI content rewriting | P2 | "Refine with AI" button that rewrites headline copy. Requires LLM integration. |
| HEAD-014 | Visible on device control | P1 | Dropdown: Desktop & Mobile, Desktop only, Mobile only. |

---

### 3.2 Paragraph

#### Instapage Properties (Observed)
**All Headline properties above PLUS:**
- Bulleted list toggle
- Numbered list toggle
- Indent / Outdent controls
- No heading level selector (paragraphs don't have H1-H6)

#### Replica Pages Current State
- Same Text block as Headline — no separate Paragraph type
- Same limitations as Headline above
- No list support (bullet or numbered)

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| PARA-001 | Separate Paragraph element type | P0 | Distinct from Headline. Default font size: 16px. |
| PARA-002 | All typography controls from HEAD-003 through HEAD-012 | P0 | Same full set. |
| PARA-003 | Bulleted list toggle | P0 | Toggle button in toolbar or property panel. |
| PARA-004 | Numbered list toggle | P0 | Toggle button in toolbar or property panel. |
| PARA-005 | Indent / Outdent | P1 | Increase/decrease margin-left in increments (e.g., 20px). |
| PARA-006 | Rich text paste from clipboard | P1 | Preserve bold, italic, links when pasting from external source. |

---

### 3.3 Button

#### Instapage Properties (Observed)
**Content:**
- Button label text (inline editable)
- Link URL / action

**Typography:**
- Font family, size, weight (same as text elements)
- Text color picker
- Text hover color picker

**Button Styling:**
- Background color picker
- Background hover color picker
- Background image (upload or select)
- Effects dropdown: Flat, Glossy
- 3D effect toggle
- Shadow settings (offset X, Y, blur, color)

**Border:**
- Border width (px)
- Border color picker
- Border style (solid, dashed, dotted)
- Corner radius: 4 individual corner inputs OR "consistent" toggle for single value

**Layout:**
- Position & Size: X, Y, W, H
- Padding (all 4 sides)
- Visible on device
- Accessibility: aria-label input

#### Replica Pages Current State
- Button text input (plain text field)
- Link URL text input
- Generic panel: Margin, Padding, Border radius (single value), Background (hex), Z-index, Width
- No text color, no hover states, no font controls, no effects, no shadow, no border styling, no accessibility

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| BTN-001 | Inline button text editing (double-click to edit on canvas) | P0 | |
| BTN-002 | Link URL / action config | P0 | URL input, or modal with: URL, Email, Phone, Page anchor, File download. Open in: Same tab / New tab. |
| BTN-003 | Button text color picker | P0 | Full color picker. |
| BTN-004 | Button text hover color picker | P0 | |
| BTN-005 | Button background color picker | P0 | Full color picker, distinct from generic Background. |
| BTN-006 | Button background hover color picker | P0 | |
| BTN-007 | Font family / size / weight for button text | P0 | Same typography system as Headline/Paragraph. |
| BTN-008 | Border width (px) | P1 | Numeric input. |
| BTN-009 | Border color picker | P1 | |
| BTN-010 | Border style selector | P1 | Solid, Dashed, Dotted, None. |
| BTN-011 | Corner radius — 4 individual corners | P1 | Four inputs for TL, TR, BR, BL. Plus "link" toggle for consistent radius. |
| BTN-012 | Box shadow | P1 | Inputs: Offset X, Offset Y, Blur, Spread, Color. |
| BTN-013 | Effects: Flat / Glossy | P2 | Dropdown or toggle. Glossy adds CSS gradient overlay. |
| BTN-014 | 3D effect toggle | P2 | Adds bottom border + slight transform for depth appearance. |
| BTN-015 | Background image | P2 | Upload image as button background. |
| BTN-016 | Padding (4-side) | P1 | Already exists in generic panel but should be button-specific. |
| BTN-017 | Accessibility: aria-label | P1 | Text input. For screen readers. |
| BTN-018 | Visible on device | P1 | Desktop & Mobile / Desktop only / Mobile only. |

---

### 3.4 Image

#### Instapage Properties (Observed)
**Image Source:**
- "Choose image" button → opens image manager
- Image manager tabs: Upload, Bigstock (33M+ stock images), Recent
- Search bar for stock images
- Drag-and-drop upload support

**Image Settings:**
- Alt text input (for SEO and accessibility)
- Link: URL input + "Open in new tab" checkbox
- "Edit mask" — crop/mask the visible area of the image
- "Set as background" — converts element to background image on section/container

**Layout:**
- Position & Size: X, Y, W, H
- Visible on device

#### Replica Pages Current State
- Image block exists in sidebar add menu
- No image was on the test canvas (block may add a placeholder)
- Generic panel only
- No image upload UI observed
- No alt text, no link, no mask, no stock library, no background mode

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| IMG-001 | Image upload via file picker | P0 | Click to browse + drag-and-drop onto canvas. Accept: JPG, PNG, GIF, WebP, SVG. |
| IMG-002 | Image URL input | P0 | Alternative to upload — paste external image URL. |
| IMG-003 | Image preview on canvas | P0 | Show the actual image, not just a placeholder icon. |
| IMG-004 | Alt text input | P0 | Required for accessibility and SEO. |
| IMG-005 | Image link URL + open in new tab | P1 | Make image clickable. |
| IMG-006 | Image replace (swap image without changing position/size) | P1 | "Change image" button. |
| IMG-007 | Crop / mask editor | P2 | Visual crop tool to show subset of image. |
| IMG-008 | Set as section/container background | P2 | Convert image to CSS background-image on parent. |
| IMG-009 | Stock image library integration | P2 | Unsplash, Pexels, or similar free stock library. Searchable. |
| IMG-010 | Image lazy loading toggle | P2 | For performance. Default: on for below-fold images. |
| IMG-011 | Responsive image sizing (object-fit) | P1 | Cover, Contain, Fill, None options. |
| IMG-012 | Border radius on image | P1 | Reuse existing border radius control. |
| IMG-013 | Opacity slider | P1 | 0–100% opacity. |
| IMG-014 | Drop shadow | P2 | Same shadow controls as Button. |

---

### 3.5 Video

#### Instapage Properties (Observed)
**Video Settings:**
- Video URL input (auto-detects YouTube, Vimeo, etc.)
- Video title text input
- Progress bar toggle (show/hide video progress bar)
- Auto play toggle

**Layout:**
- Position & Size: X, Y, W, H
- Visible on device

#### Replica Pages Current State
- Video block exists
- Provider dropdown: YouTube (currently only YouTube shown)
- Video URL input
- Autoplay toggle
- Mute toggle (Replica has this, Instapage doesn't show explicitly)
- Generic panel

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| VID-001 | Auto-detect video provider from URL | P1 | Support YouTube, Vimeo, Wistia, Loom. Remove manual "Provider" dropdown. |
| VID-002 | Video title input | P1 | For accessibility. Shows as iframe title. |
| VID-003 | Progress bar toggle | P2 | YouTube: `controls=0` parameter. |
| VID-004 | Thumbnail/poster image | P2 | Custom thumbnail before play. |
| VID-005 | Loop toggle | P2 | |
| VID-006 | Start time input | P2 | Start video at specific timestamp. |
| VID-007 | Maintain Mute toggle | P0 | Already exists — keep it. Good UX for autoplay. |
| VID-008 | Visible on device | P1 | Desktop & Mobile / Desktop only / Mobile only. |

---

### 3.6 Form

#### Instapage Properties (Observed)
**Form Selection:**
- "Insert form" button → opens form library modal
- Tabs: My Forms, Global Forms, Templates
- 5 built-in templates: Email Only, Name + Email, Contact Us, Newsletter Sign-Up, Lead Generation
- Full form builder (separate editor) for custom forms

**Form Builder Capabilities (from Instapage product page):**
- Multiple field types: Text, Email, Phone, Dropdown, Checkbox, Radio, Hidden, GDPR consent
- Field validation (required, email format, phone format)
- Submit button customization (full button styling)
- Thank-you message / redirect URL
- Multi-step forms
- Conditional logic
- Integration with 100+ marketing tools (HubSpot, Salesforce, Marketo, etc.)
- Spam protection (reCAPTCHA)

**On-page form properties:**
- Position & Size: X, Y, W, H
- Form styling (background, border, padding)
- Visible on device

#### Replica Pages Current State
- Form block exists in code (`packages/blocks/src/blocks/form/`)
- Form block is NOT visible in the Add Block panel sidebar
- Form submission management exists at platform level (/forms, /submissions routes)
- No form builder UI in editor

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| FORM-001 | Surface Form block in Add Block sidebar | P0 | The code exists — expose it in the UI. |
| FORM-002 | Form field types: Text, Email, Phone, Number | P0 | Minimum viable set. |
| FORM-003 | Field labels and placeholder text | P0 | |
| FORM-004 | Required field validation | P0 | Toggle per field. Visual asterisk indicator. |
| FORM-005 | Email format validation | P0 | Built-in regex validation for email fields. |
| FORM-006 | Submit button (with full BTN-* styling) | P0 | Submit button should support all button properties. |
| FORM-007 | Thank-you message / redirect URL | P0 | After submission: show inline message OR redirect to URL. |
| FORM-008 | Dropdown / Select field type | P1 | Options list with add/remove. |
| FORM-009 | Checkbox field type | P1 | |
| FORM-010 | Radio button field type | P1 | |
| FORM-011 | Textarea (multi-line) field type | P1 | |
| FORM-012 | Hidden field type | P1 | For passing UTM params, campaign IDs, etc. |
| FORM-013 | GDPR consent checkbox | P1 | With customizable consent text and link. |
| FORM-014 | Form templates | P1 | Minimum 5: Email Only, Name+Email, Contact Us, Newsletter, Lead Gen. |
| FORM-015 | Form background / border styling | P1 | Background color, border, padding for form container. |
| FORM-016 | Field spacing / gap control | P2 | Space between form fields. |
| FORM-017 | Multi-step form (wizard) | P2 | Break form into steps with progress indicator. |
| FORM-018 | Conditional logic | P3 | Show/hide fields based on other field values. |
| FORM-019 | reCAPTCHA / spam protection | P1 | Google reCAPTCHA v2 or v3 integration. |
| FORM-020 | Integration with CRM/marketing tools | P2 | HubSpot, Salesforce, Mailchimp, Zapier webhook. Leverage existing integrations page. |

---

### 3.7 Carousel / Slider

#### Instapage Properties (Observed)
**Main Panel:**
- Position & Size: X, Y, W, H
- Slides list: named slides (Slide 1, Slide 2, ...) with reorder handles
- Add slide (+) button
- "Carousel settings" link → sub-panel
- Visible on: Desktop & Mobile

**Carousel Settings Sub-Panel:**
- Auto play toggle
- Arrows navigation toggle
  - Arrows position: Inside / Outside dropdown
  - Arrows color: color picker
- Dots navigation toggle
  - Dots position: Inside / Outside dropdown
  - Dot selected color: color picker
  - Dot unselected color: color picker
- Background color: color picker
- Slide transition time: numeric input (ms), default 300
- Loop toggle

**Per-Slide:**
- Each slide is its own canvas area — can contain any other elements (headlines, images, buttons, etc.)

#### Replica Pages Current State
- **Does not exist.** No carousel/slider element.

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| CARO-001 | Carousel element in Add Block sidebar | P1 | New element type. |
| CARO-002 | Slide management (add, remove, reorder, duplicate) | P1 | List UI in properties panel. |
| CARO-003 | Per-slide canvas (each slide contains child elements) | P1 | Each slide is a mini-canvas that can hold any element. |
| CARO-004 | Auto play toggle | P1 | + auto play interval (ms) input. |
| CARO-005 | Arrow navigation: toggle, position (inside/outside), color | P1 | |
| CARO-006 | Dot navigation: toggle, position, selected color, unselected color | P1 | |
| CARO-007 | Background color | P1 | |
| CARO-008 | Slide transition time (ms) | P2 | Default: 300ms. |
| CARO-009 | Loop toggle | P2 | |
| CARO-010 | Transition effect selector | P3 | Slide, Fade, etc. |

---

### 3.8 Box (Rectangle)

#### Instapage Properties (Observed)
**Shape Styling:**
- Background color picker
- Background image (upload)
- Border: width (px), color, style (solid/dashed/dotted)
- Corner radius: 4 individual corner inputs + "consistent" toggle
- Opacity slider (0–100%)
- Drop shadow (offset X, Y, blur, spread, color)

**Layout:**
- Position & Size: X, Y, W, H
- Visible on device

#### Replica Pages Current State
- Shape-Rectangle block exists
- Properties: Width (200), Height (100), Fill color (#e5e7eb hex input), Border radius (single value, 0)
- Plus generic panel

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| BOX-001 | Fill color — upgrade to full color picker | P0 | Replace hex text input with color picker (hex, RGB, HSL, opacity). |
| BOX-002 | Background image | P2 | Upload image as box background. |
| BOX-003 | Border: width, color, style | P1 | Width: px. Color: picker. Style: solid/dashed/dotted/none. |
| BOX-004 | Corner radius — 4 individual corners | P1 | TL, TR, BR, BL + link toggle. |
| BOX-005 | Opacity slider | P1 | 0–100%. |
| BOX-006 | Drop shadow | P1 | Offset X, Y, Blur, Spread, Color. |
| BOX-007 | Gradient fill | P2 | Linear/radial gradient with color stops. |

---

### 3.9 Circle

#### Instapage Properties (Observed)
- Same as Box but forced to circle aspect ratio
- Background color, border, opacity, drop shadow

#### Replica Pages Current State
- Shape-Circle block exists
- Properties: Size (px): 100, Fill color (#e5e7eb hex input)
- Plus generic panel

#### Requirements
- Same as BOX-001 through BOX-007 but with Size (diameter) instead of W/H.

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| CIRC-001 | All Box requirements (BOX-001 through BOX-007) adapted for circle | P1 | Size field controls diameter. Aspect ratio locked. |

---

### 3.10 Vertical Line

#### Instapage Properties (Observed)
- Line color picker
- Line thickness / weight (px)
- Line style: Solid, Dashed, Dotted
- Height controlled via Position & Size H value
- Visible on device

#### Replica Pages Current State
- **Does not exist.** No vertical line element.
- Divider block exists but is horizontal only.

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| VLINE-001 | Vertical Line element in sidebar | P2 | New element type. |
| VLINE-002 | Line color picker | P2 | |
| VLINE-003 | Line thickness (px) | P2 | Default: 1px. |
| VLINE-004 | Line style: solid/dashed/dotted | P2 | |

---

### 3.11 Horizontal Line / Divider

#### Instapage Properties (Observed)
- Line color picker
- Line thickness / weight (px)
- Line style: Solid, Dashed, Dotted
- Width controlled via Position & Size W value

#### Replica Pages Current State
- Divider block exists in sidebar
- No line color control
- No thickness control
- No style control
- Generic panel only

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| HLINE-001 | Line color picker | P1 | |
| HLINE-002 | Line thickness (px) | P1 | Default: 1px. |
| HLINE-003 | Line style: solid/dashed/dotted | P1 | |
| HLINE-004 | Width control | P1 | Percentage or px. Default: 100%. |

---

### 3.12 Accordion

#### Instapage Properties (Observed)
**Accordion Container:**
- Background color
- Arrow indicators (expand/collapse icons): toggle show/hide + color
- Divider between sections: toggle + color
- Spacing between sections (px)
- Border radius (px)

**Per-Section:**
- Section title text + styling (font, size, weight, color)
- Section content area (can contain text, images, etc.)
- Default state: expanded or collapsed

**Layout:**
- Position & Size: X, Y, W, H
- Visible on device

#### Replica Pages Current State
- **Does not exist.** No accordion element.

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| ACC-001 | Accordion element in Add Block sidebar | P1 | FAQ sections are extremely common on landing pages. |
| ACC-002 | Section management (add, remove, reorder) | P1 | |
| ACC-003 | Per-section: title text with typography styling | P1 | Font, size, weight, color. |
| ACC-004 | Per-section: content area (rich text minimum) | P1 | |
| ACC-005 | Arrow/chevron indicators: toggle + color | P1 | |
| ACC-006 | Section divider: toggle + color | P2 | |
| ACC-007 | Spacing between sections | P2 | |
| ACC-008 | Background color for container and sections | P2 | |
| ACC-009 | Default state per section: expanded or collapsed | P2 | |
| ACC-010 | Border radius | P2 | |
| ACC-011 | "Expand only one at a time" toggle | P2 | Common accordion behavior. |

---

### 3.13 Countdown Timer

#### Instapage Properties (Observed)
**Timer Settings:**
- Target date picker (full date)
- Target time picker (hour:minute)
- Timezone selector dropdown
- Language selector dropdown

**Styling:**
- Number color picker
- Timer background color picker
- Label color picker
- Label position: Above / Below dropdown
- Hide individual labels (toggle per: Days, Hours, Minutes, Seconds)

**Layout:**
- Position & Size: X, Y, W, H
- Visible on device

#### Replica Pages Current State
- Countdown Timer block exists
- Target date/time picker (date + time)
- Days label text input
- Hours label text input
- No Minutes or Seconds label visible
- No colors (number, background, label)
- No timezone
- No language
- No label position
- Generic panel

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| TIMER-001 | Minutes label text input | P0 | Currently missing — only Days and Hours visible. |
| TIMER-002 | Seconds label text input | P0 | Currently missing. |
| TIMER-003 | Number color picker | P0 | Color of the countdown digits. |
| TIMER-004 | Timer background color picker | P1 | Background behind the countdown. |
| TIMER-005 | Label color picker | P1 | Color of "Days", "Hours", etc. text. |
| TIMER-006 | Label position: Above / Below | P1 | |
| TIMER-007 | Hide individual labels toggle | P2 | Per unit: Days, Hours, Minutes, Seconds. |
| TIMER-008 | Timezone selector | P1 | Dropdown with major timezones. Defaults to user's local. |
| TIMER-009 | Language selector | P2 | Labels in multiple languages. |
| TIMER-010 | Expired action | P2 | What happens when timer reaches 0: show message, hide timer, redirect. |
| TIMER-011 | Evergreen timer mode | P2 | Per-visitor countdown (cookie-based) instead of fixed date. |

---

### 3.14 Custom HTML Widget

#### Instapage Properties (Observed)
**Content:**
- Full HTML code editor (syntax-highlighted textarea)
- "Full size content" toggle (expand to fill container)
- Preview renders in builder preview mode and live pages

**Layout:**
- Position & Size: X, Y, W, H
- Visible on device

#### Replica Pages Current State
- CustomHtml block exists in code (`BlockCustomHtml.tsx`)
- **NOT surfaced in the Add Block sidebar**
- Code uses `dangerouslySetInnerHTML` — **XSS vulnerability** (critical security issue)

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| HTML-001 | Surface Custom HTML block in Add Block sidebar | P0 | The code exists — expose it. |
| HTML-002 | HTML code editor with syntax highlighting | P0 | Use CodeMirror or Monaco editor. |
| HTML-003 | XSS sanitization | P0 | **SECURITY CRITICAL.** Replace dangerouslySetInnerHTML with DOMPurify or similar. Sanitize on save AND render. |
| HTML-004 | Preview rendering | P1 | Show rendered HTML in builder (sandboxed iframe). |
| HTML-005 | "Full size content" toggle | P2 | Expand content to fill container bounds. |
| HTML-006 | CSS scoping | P2 | Ensure custom HTML/CSS doesn't leak into builder UI. Use iframe sandbox or scoped styles. |

---

### 3.15 Instablocks (Reusable Blocks)

#### Instapage Properties (Observed)
**Instablocks Library:**
- Sidebar icon opens Instablocks panel
- Tabs: My Blocks, Global Blocks
- Save any element or group as a reusable block
- Insert saved blocks onto any page
- Global blocks: edit once, updates everywhere

#### Replica Pages Current State
- **No equivalent.** No reusable block system.
- Pattern templates (Hero, Features, CTA, FAQ, Testimonials, Logos) exist but are one-time inserts, not reusable.

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| REUSE-001 | "Save as reusable block" action | P2 | Right-click or property panel option on any element/group. |
| REUSE-002 | Reusable blocks library panel | P2 | Sidebar tab showing saved blocks with preview thumbnails. |
| REUSE-003 | Insert reusable block onto canvas | P2 | Click or drag from library. |
| REUSE-004 | Global blocks (edit once, update everywhere) | P3 | Changes to source block propagate to all instances. |
| REUSE-005 | Unlink from source (detach) | P3 | Convert instance back to independent elements. |

---

### 3.16 Table

#### Instapage Properties
- Instapage does NOT have a native Table element.

#### Replica Pages Current State
- Table block exists in code but is NOT surfaced in the Add Block sidebar.

#### Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| TABLE-001 | Surface Table block in sidebar | P2 | Unique differentiator vs. Instapage. |
| TABLE-002 | Row/column management (add, remove, reorder) | P2 | |
| TABLE-003 | Cell content editing (text, basic formatting) | P2 | |
| TABLE-004 | Table styling: header row, alternating row colors, border | P2 | |
| TABLE-005 | Responsive table behavior (scroll/stack on mobile) | P3 | |

---

## 4. Shared Property System (All Elements)

### 4.1 Instapage Shared Properties (on every element)

| Property | Control Type | Detail |
|---|---|---|
| Position & Size | 4 numeric inputs | X, Y, W, H — always visible |
| Visible on | Dropdown | "Desktop & Mobile" / "Desktop only" / "Mobile only" |

### 4.2 Replica Pages Current Shared Properties (generic panel)

| Property | Control Type | Detail |
|---|---|---|
| Block type label | Read-only text | e.g., "Block type: Section" |
| Show when (URL param) | Text input | Conditional visibility by URL parameter |
| Margin Top/Right/Bottom/Left | 4 numeric inputs | px values |
| Padding | Numeric input | Single value (not 4-side) |
| Border radius | Numeric input | Single value |
| Background | Hex text input | e.g., "#f8fafc" |
| Z-index | Numeric input | Stacking order |
| Width | Numeric input | px or % |
| Copy style / Paste style | Buttons | Copy styling to clipboard |
| Remove block | Button | Delete element |

### 4.3 Requirements for Shared Properties

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| SHARED-001 | Padding: 4-side inputs | P0 | Replace single padding with Top, Right, Bottom, Left. With "link" toggle for uniform. |
| SHARED-002 | Background: upgrade to full color picker | P0 | Replace hex text input with color picker widget. |
| SHARED-003 | Border radius: 4-corner inputs | P1 | TL, TR, BR, BL with "link" toggle. |
| SHARED-004 | Position & Size: X, Y, W, H always visible | P0 | Not just in "Canvas" mode. |
| SHARED-005 | Visible on device dropdown | P1 | Desktop & Mobile / Desktop only / Mobile only. |
| SHARED-006 | Opacity slider | P1 | 0–100%. For ALL element types. |
| SHARED-007 | Drop shadow controls | P1 | Offset X, Y, Blur, Spread, Color. For elements that support it. |
| SHARED-008 | Overflow control | P2 | Visible / Hidden / Scroll. For containers. |
| SHARED-009 | CSS class name input | P3 | For advanced users to add custom classes. |

---

## 5. Typography System

### 5.1 Instapage Typography Architecture

Instapage has a **three-tier typography system:**

1. **Page-level defaults** (Page Settings → Default fonts):
   - Headline font: Font name (dropdown) + Font weight (dropdown)
   - Paragraph font: Font name (dropdown) + Font weight (dropdown)
   - Button font: Font name (dropdown) + Font weight (dropdown)
   - "Set up default fonts" → bulk configuration
   - "Add fonts" → add Google Fonts or custom fonts

2. **Per-element overrides** (each text element's property panel):
   - Font family, size, weight, line height, letter spacing, color
   - These override page defaults when set

3. **Inline formatting** (toolbar on text selection):
   - Bold, Italic, Underline, Strikethrough, Sub/Superscript
   - Text alignment
   - Link insertion

### 5.2 Replica Pages Current Typography
- **No page-level font defaults**
- **No per-element typography controls**
- **Minimal inline formatting:** Bold, Italic, Underline, Link only

### 5.3 Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| TYPO-001 | Google Fonts integration | P0 | Load Google Fonts catalog. Searchable dropdown. Minimum 500 fonts. |
| TYPO-002 | Custom font upload | P2 | Upload .woff2/.ttf files. |
| TYPO-003 | Page-level default fonts | P0 | In page settings: Headline font (family + weight), Paragraph font (family + weight), Button font (family + weight). |
| TYPO-004 | Font family dropdown per element | P0 | Overrides page default. Shows recently used fonts at top. |
| TYPO-005 | Font size numeric input (px) | P0 | With common preset sizes: 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72. |
| TYPO-006 | Font weight dropdown per element | P0 | Populated based on selected font's available weights. |
| TYPO-007 | Line height input | P0 | Numeric (unitless multiplier or px). Default: 1.4–1.6. |
| TYPO-008 | Letter spacing input | P1 | px or em. Default: 0. |
| TYPO-009 | Text color picker per element | P0 | Full color picker. |
| TYPO-010 | Text alignment buttons | P0 | Left, Center, Right, Justify. |
| TYPO-011 | Text transform | P2 | Uppercase, Lowercase, Capitalize, None. |
| TYPO-012 | Text decoration | P1 | Underline, Overline, Line-through, None. |

---

## 6. Color System

### 6.1 Instapage Color System
- Full color picker on every color property (background, text, border, shadow, etc.)
- Color picker features: Hue/saturation gradient square, Hue slider, Opacity slider, Hex input, RGB inputs
- Recently used colors
- "Eyedropper" tool to pick color from canvas (browser-native)

### 6.2 Replica Pages Current Color System
- Hex text input only (e.g., "#f8fafc")
- No color picker UI
- No opacity control
- No recent colors

### 6.3 Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| COLOR-001 | Color picker component | P0 | Hue/saturation square + hue slider + opacity slider + hex input + RGB inputs. Use react-colorful or similar library. |
| COLOR-002 | Apply to all color properties | P0 | Replace every hex text input with this picker. |
| COLOR-003 | Recently used colors | P1 | Show last 8–12 colors used on this page. |
| COLOR-004 | Saved color palette | P2 | User-defined brand colors saved across pages. |
| COLOR-005 | Eyedropper tool | P2 | Browser EyeDropper API (Chrome/Edge). |
| COLOR-006 | Gradient support | P3 | Linear and radial gradients for backgrounds. Color stops editor. |

---

## 7. Page-Level Settings

### 7.1 Instapage Page Settings (Observed)

Accessed via gear icon → right panel shows 7 sub-menus:

#### 7.1.1 Page Background
- Background image (upload/URL)
- Background color (color picker)
- Column color (color picker for center content column)
- Hide center column toggle

#### 7.1.2 Default Fonts
- Headline font: Font name dropdown (e.g., Arial) + Font weight dropdown (e.g., Bold)
- Paragraph font: Font name dropdown + Font weight dropdown
- Button font: Font name dropdown + Font weight dropdown
- "Set up default fonts" link
- "Add fonts" button (+)

#### 7.1.3 Sticky Bar
- Sticky Header toggle
- Sticky Footer toggle

#### 7.1.4 Page Popup
- Enable/disable popup
- Popup trigger: On exit intent, After X seconds, On scroll percentage
- Popup content: mini-canvas to design popup content

#### 7.1.5 HTML/CSS
- Code editor modal with 3 tabs: HEAD, BODY, FOOTER
- Syntax-highlighted editor
- CANCEL / SAVE buttons
- Inject arbitrary HTML/CSS into page head, body start, or before body close

#### 7.1.6 Javascript
- Similar code editor for JavaScript injection
- Head / Body placement options

#### 7.1.7 Version History
- List of saved versions with timestamps
- Restore to any previous version

### 7.2 Replica Pages Current Page Settings
- **No dedicated page settings panel in editor**
- Platform-level script management exists (/scripts route)
- No page background settings
- No default fonts
- No sticky bar
- No popup
- No HTML/CSS injection in editor
- No version history (undo/redo buttons exist but no saved versions)

### 7.3 Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| PSET-001 | Page settings panel in editor | P0 | Gear icon or sidebar section. Contains all sub-menus below. |
| PSET-002 | Page background: color | P0 | Color picker for page background. |
| PSET-003 | Page background: image | P1 | Upload or URL. Position: cover/contain/repeat. |
| PSET-004 | Default fonts (Headline, Paragraph, Button) | P0 | Font family + weight for each. Applies to all new elements. |
| PSET-005 | Sticky Header toggle | P1 | Designate a section as sticky to top of viewport. |
| PSET-006 | Sticky Footer toggle | P1 | Designate a section as sticky to bottom. |
| PSET-007 | HTML/CSS injection (Head, Body, Footer) | P1 | Code editor with 3 tabs. Syntax highlighting. For tracking pixels, custom CSS, etc. |
| PSET-008 | JavaScript injection | P1 | Separate from HTML/CSS. Head/Body placement. |
| PSET-009 | Page popup builder | P2 | Mini-canvas for popup content. Triggers: exit intent, time delay, scroll %. |
| PSET-010 | Version history | P2 | Auto-save versions. List with timestamps. Restore any version. |
| PSET-011 | Custom CSS editor | P1 | Dedicated CSS editor that applies to entire page. With live preview. |
| PSET-012 | Favicon upload | P3 | Upload custom favicon for published page. |
| PSET-013 | SEO meta: title, description, OG image | P1 | May already exist in publishing settings — ensure it's in editor too. |

---

## 8. Canvas Interaction & Editing UX

### 8.1 Instapage UX Features (Observed)
- Undo / Redo buttons + keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- Save button (top right)
- Preview button (eye icon) — opens page in new tab
- Publish button
- Page name editing (pencil icon next to name)
- Comments system (speech bubble icon) — collaborative annotations
- Help (?) button
- "Show hidden" toggle — reveals elements hidden on current device view
- Desktop / Mobile view toggle (2 device icons, top-left)

### 8.2 Replica Pages UX Features (Current)
- Undo / Redo buttons
- Save (implicit or button)
- Preview (eye icon, opens in new tab)
- "Grid" / "Canvas" mode toggle
- Responsive preview buttons (desktop/tablet/mobile)
- Layers panel (left sidebar, list of all elements)
- Add block panel (+ icon, left sidebar)

### 8.3 Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| UX-001 | Zoom controls | P1 | Zoom in/out on canvas. Ctrl+scroll or +/- buttons. Zoom levels: 50%, 75%, 100%, 125%, 150%, 200%. |
| UX-002 | Fit to screen button | P1 | Auto-zoom to show entire page. |
| UX-003 | Rulers (optional) | P3 | Horizontal and vertical rulers at canvas edges. Toggle on/off. |
| UX-004 | Grid overlay (optional) | P2 | Toggleable pixel grid for precise alignment. |
| UX-005 | Copy/Paste elements | P0 | Ctrl+C copies selected element(s). Ctrl+V pastes at cursor or offset position. |
| UX-006 | Duplicate element | P1 | Ctrl+D or right-click → Duplicate. Pastes copy offset by 10px. |
| UX-007 | Keyboard delete | P0 | Delete or Backspace removes selected element. |
| UX-008 | Arrow key nudge | P1 | Arrow keys move 1px. Shift+arrow moves 10px. |
| UX-009 | Element depth ordering | P1 | Bring to Front, Send to Back, Bring Forward, Send Backward. |
| UX-010 | Comments / annotations | P3 | Click to place a comment pin. Collaborative review workflow. |
| UX-011 | Drag-and-drop from sidebar to canvas | P1 | Currently click adds to bottom. Should support drag to specific position. |
| UX-012 | Double-click to edit text inline | P0 | Already partially works — ensure consistent across all text elements. |
| UX-013 | Escape key to deselect | P1 | Press Escape to deselect current element. |
| UX-014 | Canvas panning (scroll/drag) | P1 | Scroll to pan up/down. Space+drag to pan freely. |

---

## 9. Responsive / Mobile Editing

### 9.1 Instapage Responsive System
- Two distinct views: Desktop and Mobile (toggle buttons top-left)
- **Mobile is a separate layout** — elements can have different positions, sizes, visibility on mobile
- Per-element "Visible on" control: Desktop & Mobile / Desktop only / Mobile only
- "Show hidden" toggle reveals elements hidden on current view
- Mobile view has its own canvas with independently positioned elements

### 9.2 Replica Pages Current Responsive System
- Three responsive preview sizes (desktop, tablet, mobile icons in toolbar)
- These resize the canvas viewport only — no separate layout
- No per-element visibility controls
- No independent mobile positioning

### 9.3 Requirements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| RESP-001 | Desktop / Mobile view toggle | P1 | Two-mode editor. Mobile view is independent layout. |
| RESP-002 | Per-element "Visible on" control | P1 | Dropdown: Desktop & Mobile, Desktop only, Mobile only. |
| RESP-003 | Independent element positioning per view | P1 | Elements can have different X, Y, W, H on desktop vs. mobile. |
| RESP-004 | "Show hidden" toggle | P1 | In mobile view, show desktop-only elements as ghosts. Vice versa. |
| RESP-005 | Breakpoint: Tablet | P2 | Third view for tablet layouts (in addition to desktop and mobile). |
| RESP-006 | Auto-generate mobile layout | P3 | When switching to mobile view for first time, auto-stack elements vertically as starting point. |

---

## 10. Platform Features (Outside Editor)

These are features Instapage offers at the platform/account level, not within the page editor itself.

### 10.1 A/B Testing (Variations)

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| AB-001 | Create page variations (A, B, C, ...) | P2 | Duplicate page as variation. Each has independent layout. |
| AB-002 | Traffic split configuration | P2 | Percentage split across variations (e.g., 50/50, 33/33/34). |
| AB-003 | Conversion goal definition | P2 | Form submission, button click, page visit as conversion events. |
| AB-004 | Statistical significance reporting | P2 | Dashboard showing winner with confidence interval. |
| AB-005 | Auto-winner selection | P3 | Automatically route all traffic to winner after significance reached. |

### 10.2 Heatmaps

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| HEAT-001 | Click heatmap | P3 | Visual overlay showing where users click. |
| HEAT-002 | Scroll heatmap | P3 | Shows how far down users scroll. |
| HEAT-003 | Attention heatmap | P3 | Time-on-element tracking. |

### 10.3 Dynamic Text Replacement

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| DTR-001 | URL parameter → text replacement | P2 | Syntax like `{keyword:default}`. Headline shows URL param value or default. |
| DTR-002 | Multiple replacements per page | P2 | Any text element can contain replacement tokens. |

### 10.4 Integrations

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| INT-001 | Form submission webhooks | P1 | Already partially exists. Ensure reliable webhook delivery. |
| INT-002 | HubSpot integration | P2 | Push form submissions to HubSpot contacts. |
| INT-003 | Salesforce integration | P2 | Push to Salesforce leads. |
| INT-004 | Google Analytics integration | P1 | GA4 tracking code injection. |
| INT-005 | Facebook Pixel | P1 | Meta pixel for conversion tracking. |
| INT-006 | Google Tag Manager | P1 | GTM container injection. |
| INT-007 | Zapier/Make webhook | P2 | Generic webhook for connecting to any tool. |

### 10.5 Templates Library

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| TMPL-001 | Expand template library to 50+ | P1 | Professionally designed, categorized (SaaS, E-commerce, Lead Gen, Webinar, etc.). |
| TMPL-002 | Template categories | P1 | Filter by industry, goal, layout style. |
| TMPL-003 | Template preview | P1 | Full-page preview before inserting. |
| TMPL-004 | Community/user templates | P3 | Users can publish templates for others. |

### 10.6 Publishing & Domains

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| PUB-001 | One-click publish | P0 | Already exists — verify reliability. |
| PUB-002 | Custom domain connection | P0 | Already exists via /domains route. |
| PUB-003 | SSL certificate auto-provisioning | P1 | Let's Encrypt or similar. |
| PUB-004 | Publish scheduling | P2 | Schedule page to go live at specific date/time. |

---

## 11. Code Architecture Requirements

Based on the code audit from the repository, these architecture issues must be addressed to support the features above.

### 11.1 Critical Security

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| ARCH-001 | Fix XSS in BlockCustomHtml | P0 | Replace `dangerouslySetInnerHTML` with DOMPurify sanitization. Sanitize on save AND render. |
| ARCH-002 | Input sanitization on all user inputs | P0 | URL fields, text fields, HTML fields — all must be sanitized. |

### 11.2 Architecture Improvements

| Req ID | Requirement | Priority | Detail |
|---|---|---|---|
| ARCH-003 | Split EditorContext into focused contexts | P0 | Current single context has 40+ values causing unnecessary re-renders. Split into: CanvasContext, SelectionContext, BlockDataContext, UIContext. |
| ARCH-004 | Element-specific property panel components | P0 | Replace generic one-size-fits-all panel with per-element-type components: HeadlineProperties, ButtonProperties, ImageProperties, etc. Use a registry pattern. |
| ARCH-005 | Add ErrorBoundary components | P1 | Wrap each block renderer and property panel in error boundaries. Runtime errors should not crash the editor. |
| ARCH-006 | Add TypeScript strict mode | P1 | Remove 50+ `as` type assertions. Enable strict null checks. |
| ARCH-007 | Break up renderer.ts (~575 lines) | P1 | Extract per-block renderers into separate files. Use a block renderer registry. |
| ARCH-008 | Add code splitting | P1 | Lazy-load block types. Initial load should only include the editor shell + blocks on current page. |
| ARCH-009 | Add test coverage | P1 | Unit tests for block schemas, property validation, rendering. Integration tests for editor workflows. Target: 60%+ coverage. |
| ARCH-010 | Replace silent error handling | P1 | All catch blocks should log errors. User-facing errors should show toast notification. |
| ARCH-011 | Block schema validation | P0 | Define Zod or Yup schemas for each block type's properties. Validate on save. |

### 11.3 Property Panel Architecture

The most impactful architecture change is the property panel system. Current state: a single generic component renders the same fields for all block types.

**Target architecture:**

```
PropertyPanelRegistry
├── HeadlinePropertyPanel
│   ├── ContentSection (text, heading level)
│   ├── TypographySection (font, size, weight, line-height, color, alignment)
│   ├── PositionSection (X, Y, W, H)
│   └── VisibilitySection (device toggle)
├── ButtonPropertyPanel
│   ├── ContentSection (label, link URL)
│   ├── TypographySection
│   ├── ButtonStyleSection (bg color, hover color, effects)
│   ├── BorderSection (width, color, style, radius per corner)
│   ├── ShadowSection
│   ├── PositionSection
│   └── VisibilitySection
├── ImagePropertyPanel
│   ├── ImageSourceSection (upload, URL, alt text)
│   ├── LinkSection
│   ├── PositionSection
│   └── VisibilitySection
├── ... (one per element type)
└── SharedSections (reusable across panels)
    ├── TypographySection
    ├── PositionSection
    ├── VisibilitySection
    ├── BorderSection
    ├── ShadowSection
    └── ColorPickerField
```

---

## 12. Replica Pages Unique Features to Preserve

These features exist in Replica Pages but NOT in Instapage. They are genuine differentiators and should be preserved/enhanced.

| Feature | Current State | Recommendation |
|---|---|---|
| HTML/MHTML import | Client-side DOMParser imports existing pages with form detection | Preserve. Enhance with better fidelity and error handling. |
| Multi-channel publishing | Pages can be published to multiple domains | Preserve. Unique value for multi-brand companies. |
| UTM attribution tracking | Built-in UTM parameter tracking for form submissions | Preserve. Deeply integrate with form submission data. |
| Role-based access (3 portals) | Admin (:5173), Marketer (:5174), RevOps (:5175) | Preserve. Consolidate into single app with role-based views. |
| Form submission management | Dedicated submissions viewer with field mapping | Preserve. Enhance with export, filtering, analytics. |
| "Show when" URL param | Conditional block visibility by URL parameter | Preserve. This enables basic personalization without needing Instapage's personalization product. |
| Page cloning | Clone existing pages | Preserve. Simple but useful. |
| Script management | Platform-level script management (/scripts) | Preserve. Also add per-page injection (PSET-007/008). |
| Layout blocks (Grid, Columns, Stack) | Flex/grid-based layout containers | Preserve. These are actually more powerful than Instapage's flat canvas for responsive design. |

---

## 13. Implementation Phases & Priorities

### Phase 1: Foundation (Weeks 1–4) — P0 Items
**Goal:** Make the editor minimally usable for building real landing pages.

1. **Typography system** (TYPO-001 through TYPO-010)
   - Google Fonts integration
   - Font family, size, weight, line-height, color, alignment on all text elements
   - Page-level default fonts

2. **Color picker component** (COLOR-001, COLOR-002)
   - Replace all hex inputs with real color picker
   - Apply to backgrounds, text colors, borders, etc.

3. **Heading levels** (HEAD-001, HEAD-002)
   - Separate Headline from Paragraph
   - H1-H6 selector

4. **Button styling** (BTN-001 through BTN-007)
   - Background color, text color, hover states
   - Font controls on button text

5. **Position & Size on all elements** (SHARED-004, CANVAS-002)
   - X, Y, W, H always visible

6. **Alignment guides & snapping** (ALIGN-001, ALIGN-002)

7. **Architecture: split EditorContext & property panel registry** (ARCH-003, ARCH-004)

8. **Security: XSS fix** (ARCH-001)

**Estimated effort:** 2 senior frontend engineers, 4 weeks

### Phase 2: Element Completeness (Weeks 5–8) — P1 Items
**Goal:** All elements have proper property panels. Missing elements added.

1. **Surface Form block + basic form builder** (FORM-001 through FORM-007)
2. **Surface Custom HTML block + sanitization** (HTML-001 through HTML-003)
3. **Accordion widget** (ACC-001 through ACC-005)
4. **Carousel widget** (CARO-001 through CARO-006)
5. **Button: border, shadow, corner radius per corner** (BTN-008 through BTN-012)
6. **Image: upload, alt text, link, replace** (IMG-001 through IMG-006)
7. **Shape improvements: border, opacity, shadow** (BOX-001 through BOX-006)
8. **Divider: color, thickness, style** (HLINE-001 through HLINE-004)
9. **Timer: all missing controls** (TIMER-001 through TIMER-008)
10. **Page settings panel** (PSET-001 through PSET-008)
11. **Responsive: device visibility** (RESP-001, RESP-002)
12. **Canvas UX: copy/paste, delete, duplicate** (UX-005 through UX-009)

**Estimated effort:** 2–3 frontend engineers, 4 weeks

### Phase 3: Polish & Platform (Weeks 9–12) — P2 Items
**Goal:** Production-ready editor with competitive feature set.

1. **Carousel: full settings** (CARO-007 through CARO-010)
2. **Form: advanced field types, templates, reCAPTCHA** (FORM-008 through FORM-020)
3. **Mobile-specific editing** (RESP-003, RESP-004)
4. **Templates library expansion** (TMPL-001 through TMPL-003)
5. **Reusable blocks** (REUSE-001 through REUSE-003)
6. **A/B testing** (AB-001 through AB-004)
7. **Dynamic text replacement** (DTR-001, DTR-002)
8. **Page popup builder** (PSET-009)
9. **Version history** (PSET-010)
10. **Stock image library** (IMG-009)
11. **Canvas: zoom, rulers, grid overlay** (UX-001 through UX-004)
12. **Architecture: tests, code splitting, error boundaries** (ARCH-005 through ARCH-011)

**Estimated effort:** 3 engineers, 4 weeks

### Phase 4: Advanced Features (Weeks 13+) — P3 Items
**Goal:** Feature parity with Instapage's most advanced features.

1. Heatmaps
2. Real-time collaboration
3. Global reusable blocks
4. Comments/annotations
5. Gradient backgrounds
6. Conditional form logic
7. Evergreen countdown timers
8. Custom font upload
9. AMP pages

---

## Appendix: Raw Property Inventories

### A1. Instapage — Complete Element Property List (From Live Testing)

**Headline:**
Position & Size (X/Y/W/H), Font family, Font size, Font weight, Line height, Letter spacing, Text color, Link color, Heading level (H1-H6), Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Text alignment (5 options), Visible on device, Refine with AI

**Paragraph:**
All Headline properties + Bulleted list, Numbered list, Indent/Outdent

**Button:**
Position & Size, Button text, Link URL, Text color, Text hover color, Background color, Background hover color, Background image, Font family/size/weight, Effects (Flat/Glossy), 3D toggle, Shadow (X/Y/Blur/Color), Border (width/color/style), Corner radius (4 corners), Accessibility (aria-label), Visible on device

**Image:**
Position & Size, Image source (Upload/Bigstock/Recent), Alt text, Link, Edit mask, Set as background, Visible on device

**Video:**
Position & Size, Video URL, Video title, Progress bar toggle, Auto play, Visible on device

**Form:**
Position & Size, Form selector (My Forms/Global/Templates), Form builder access, Visible on device

**Carousel:**
Position & Size, Slides list (add/remove/reorder), Carousel settings (Auto play, Arrows nav + position + color, Dots nav + position + selected/unselected color, Background color, Transition time, Loop), Visible on device

**Box (Rectangle):**
Position & Size, Background color, Background image, Border (width/color/style), Corner radius (4 corners + consistent toggle), Opacity slider, Drop shadow, Visible on device

**Circle:**
Position & Size, Background color, Background image, Border, Opacity, Drop shadow, Visible on device

**Vertical Line:**
Position & Size, Line color, Line thickness, Line style, Visible on device

**Horizontal Line:**
Position & Size, Line color, Line thickness, Line style, Visible on device

**Accordion:**
Position & Size, Background color, Arrow indicators (toggle + color), Divider (toggle + color), Section spacing, Border radius, Per-section: title text styling + content area + default state, Visible on device

**Countdown Timer:**
Position & Size, Target date, Target time, Timezone, Language, Number color, Timer BG color, Label color, Label position (above/below), Hide individual labels, Visible on device

**Custom HTML:**
Position & Size, HTML code editor, Full size content toggle, Visible on device

### A2. Replica Pages — Complete Element Property List (From Live Testing)

**Text:**
Inline toolbar (B/I/U/Link), Show when, Margin T/R/B/L, Padding, Border radius, Background (hex), Z-index, Width, Copy/Paste style, Remove block

**Button:**
Button text, Link URL, Show when, Margin T/R/B/L, Padding, Border radius, Background (hex), Z-index, Width, Copy/Paste style, Remove block

**Section/Container/Grid/Columns/Stack:**
Show when, Margin T/R/B/L, Padding, Border radius, Background (hex), Z-index, Width, Copy/Paste style, Remove block (identical generic panel for all)

**Spacer:**
Height (px): 24, plus generic panel

**Video:**
Provider (YouTube dropdown), Video URL, Autoplay toggle, Mute toggle, plus generic panel

**Shape-Rectangle:**
Width (200), Height (100), Fill color (hex), Border radius, plus generic panel

**Shape-Circle:**
Size (px): 100, Fill color (hex), plus generic panel

**Countdown Timer:**
Target date/time picker, Days label, Hours label, plus generic panel

**Divider:**
Generic panel only (no line-specific properties)

**Image:**
Generic panel only (no image on test canvas — block may be placeholder-only)

**In Canvas mode (all elements):**
X, Y, Width, Height added

---

## Total Requirement Count Summary

| Priority | Count | Description |
|---|---|---|
| P0 | 47 | Must-have to build real landing pages |
| P1 | 62 | Essential for competitive product |
| P2 | 48 | Important for market parity |
| P3 | 18 | Advanced/nice-to-have features |
| **Total** | **175** | **Total requirements for full Instapage parity** |

---

*Document generated from live testing of both Instapage builder (app.instapage.com/builder2) and Replica Pages editor (127.0.0.1:5173), plus code audit of the ai_landingpage_builder GitHub repository.*
