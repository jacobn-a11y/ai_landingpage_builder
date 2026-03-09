# Project Roadmap: AI Landing Page Editor Agent + Editor Parity

**Created**: 2026-03-09
**Based on**: Actual codebase review (not PRD assumptions)

---

## Current State Summary

**What exists and works today:**
- Monorepo: `packages/web` (React/Vite), `packages/api` (Express/Prisma), `packages/blocks` (shared types)
- 26 block types across 5 categories (layout, content, pattern, form, embed) — all rendering
- Monolithic `EditorContext` using React Context + `use-undo` (snapshot-based, in-memory only)
- Flat block tree: `Record<string, EditorBlock>` with `root` ID reference
- Props stored as untyped `Record<string, unknown>` per block
- `UniversalPropertiesSection` handles margin/padding/bg/border/radius/opacity/shadow/visibility for all blocks
- `PropertiesPanel` with inline block-specific property editors (not composable sections)
- `block-registry.ts` is minimal: just `BlockDefinition` with type/label/category/icon — no schemas, no renderers, no capabilities
- Canvas mode (absolute positioning) and Fluid mode (flow layout) both working
- Responsive: 3 breakpoints (1440/768/375) with `props.overrides[breakpoint]` system
- Undo/redo via `use-undo` library (full document snapshots, no transactions)
- Autosave with 5-second debounce
- Keyboard shortcuts (Ctrl+C/V/D/G/Z, arrows, delete)
- Multi-select, copy/paste, group, align, z-index
- Full MHTML/HTML import pipeline (7-stage)
- Publishing: demo domains, custom domains, Webflow (stub)
- Serving: server-side HTML rendering from contentJson
- Form handling: detection, mapping, submissions, delivery
- DnD via @dnd-kit
- Google Fonts loading
- Page settings: background, fonts, custom CSS, SEO, sticky bars, popups

**What does NOT exist:**
- No Zod or any schema validation on blocks/documents
- No mutation layer — direct `setState` calls mutate the full document
- No transaction grouping for undo (every `setState` = 1 undo entry)
- No document versioning or schema migrations
- No custom HTML sanitization (renders via `dangerouslySetInnerHTML`)
- No error boundaries on block renderers
- No inspector registry — property panels are inline in `PropertiesPanel.tsx`
- No block capabilities system
- No pre-publish validation
- No AI integration of any kind
- No color picker beyond basic hex inputs
- No version history / snapshots
- No persistent undo (lost on refresh)

---

## Roadmap: 20 Blocks × ~5% Each

### Block 1 — Typed Block Schemas & Registry Upgrade (5%)
**Dependencies: None**
**Why first:** Every subsequent block depends on typed schemas. The current `Record<string, unknown>` props and minimal `BlockDefinition` registry cannot support validation, mutations, AI editing, or composable inspectors.

**What exists today:**
- `block-types.ts`: `BlockType` union, `BaseBlock` with `id/type/children/props`
- `block-registry.ts`: `BlockDefinition` = `{ type, label, category, icon }` — no schemas, no capabilities
- `types.ts`: `EditorBlock` extends `BaseBlock` with optional `meta` (locked/hidden)
- `UniversalProps` interface in `universal-props.ts`
- Props are `Record<string, unknown>` everywhere

**Tasks:**
1. Install Zod in `packages/blocks`
2. Create typed prop interfaces for each of the 26 block types based on actual usage in `Block*.tsx` components (e.g., `ImageBlockProps = { src?: string; alt?: string; linkHref?: string; ... }`)
3. Create Zod schemas for each block type's props
4. Create Zod schema for `PageSettings`, `StickyBar`, `Popup`, `EditorContentJson`
5. Define `BlockCapability` enum: `Typography`, `Border`, `Shadow`, `Children`, `Visibility`, `LinkAction`, `Background`, `Position`
6. Extend `BlockDefinition` in the registry to include: `schema` (Zod), `defaultProps`, `capabilities: BlockCapability[]`
7. Populate capabilities for all 26 block types based on what controls they actually expose in `PropertiesPanel.tsx`
8. Create `ResponsiveLayout` type: `{ desktop: { x, y, w, h }; tablet?: ...; mobile?: ... }` and `DeviceVisibility` type: `{ desktop: boolean; tablet: boolean; mobile: boolean }`
9. Add `schemaVersion` field to `EditorContentJson` (default `1` for existing documents)
10. Unit tests for all Zod schemas — valid and invalid inputs

**Files to create/modify:**
- `packages/blocks/src/schemas/` — per-block Zod schemas
- `packages/blocks/src/capabilities.ts` — capability enum
- `packages/blocks/src/block-types.ts` — add typed prop interfaces
- `packages/web/src/features/pages/editor/block-registry.ts` — extend with schemas + capabilities
- `packages/web/src/features/pages/editor/types.ts` — add ResponsiveLayout, DeviceVisibility, schemaVersion

---

### Block 2 — Mutation Layer & Inverse Operations (5%)
**Dependencies: Block 1**
**Why second:** The current editor mutates state via direct `setState` on the full `EditorContentJson` object inside `EditorContext`. This must be replaced with structured mutations to enable: undo transaction grouping, AI-driven edits, validation before apply, and history tracking.

**What exists today:**
- `EditorContext.updateBlock(id, updates)` does `setContent(prev => { ...prev, blocks: { ...prev.blocks, [id]: { ...prev.blocks[id], ...updates } } })`
- `insertBlock`, `removeBlock`, `moveBlock` all follow same pattern
- Every call to `setState` from `use-undo` creates a new undo snapshot
- No validation before applying changes
- No inverse operation tracking

**Tasks:**
1. Define mutation types as discriminated union in `packages/blocks/src/mutations.ts`:
   - `UpdateBlockProps { blockId, propPatch }`
   - `UpdateBlockStyle { blockId, stylePatch }`
   - `UpdateBlockLayout { blockId, breakpoint, layoutPatch }`
   - `InsertBlock { parentId, index, block }`
   - `RemoveBlock { blockId }`
   - `MoveBlock { blockId, targetParentId, targetIndex }`
   - `GroupBlocks { blockIds }`
   - `UngroupBlock { groupId }`
   - `UpdatePageSettings { patch }`
   - `UpdateOverlay { type, id, patch }`
2. Build `applyMutation(document, mutation) → { newDocument, inverse }` — pure function
3. Each mutation computes its inverse (e.g., `InsertBlock` inverse = `RemoveBlock` with same ID)
4. Add Zod validation: validate mutated block props against block schema before returning
5. Add `Transaction` type: `{ id, label, mutations[], timestamp }` — groups related mutations
6. Build `applyTransaction(document, transaction) → { newDocument, inverseTransaction }`
7. Unit tests for every mutation type: apply, inverse, round-trip (apply → inverse → original state)
8. Edge case tests: remove block with children, move into own subtree, insert at invalid index

**Files to create:**
- `packages/blocks/src/mutations.ts` — mutation type definitions
- `packages/web/src/features/pages/editor/mutation-engine.ts` — apply/inverse logic
- Tests alongside

---

### Block 3 — State Architecture Refactor (5%)
**Dependencies: Block 2**
**Why:** Replace the monolithic `EditorContext` (~500 lines of state + callbacks) with focused stores. Wire everything through the mutation layer. This unblocks performant re-renders, AI editing, and clean undo.

**What exists today:**
- Single `EditorContext` using `use-undo` + multiple `useState` hooks
- ~30 functions exposed via context value
- All components re-render on any content change (no selector optimization)
- Undo is full document snapshots via `use-undo`

**Tasks:**
1. Install Zustand in `packages/web`
2. Create `DocumentStore`:
   - Holds `EditorContentJson`
   - `dispatch(mutation)` → runs through mutation engine from Block 2
   - `dispatchTransaction(transaction)` for batched edits
   - Exposes selectors: `getBlock(id)`, `getBlockProps(id)`, `getChildren(parentId)`, `getPageSettings()`
3. Create `HistoryStore`:
   - Stack of inverse transactions (replacing `use-undo`)
   - `undo()` applies inverse of last transaction
   - `redo()` re-applies forward
   - `canUndo`, `canRedo`
   - Transaction coalescing: rapid property changes (e.g., slider drag) merge into one entry
   - Text input debouncing: coalesce rapid keystrokes into meaningful undo steps
4. Create `SelectionStore`: `selectedBlockIds`, click/shift-click/marquee/escape logic
5. Create `ViewportStore`: `breakpoint`, `canvasWidth`, `previewMode`, `layoutMode`
6. Create `EditorUIStore`: expanded panel sections, active tabs, clipboard
7. Refactor `EditorProvider` to create and provide all stores
8. Keep `useEditor()` hook API surface compatible — delegate to stores internally so existing components don't break
9. Migrate all `updateBlock`/`insertBlock`/`removeBlock`/`moveBlock` calls to use `DocumentStore.dispatch()`
10. Wire autosave to subscribe to `DocumentStore` changes
11. Integration tests: full edit workflow through stores, undo/redo round-trips

**Files to create:**
- `packages/web/src/features/pages/editor/stores/document-store.ts`
- `packages/web/src/features/pages/editor/stores/history-store.ts`
- `packages/web/src/features/pages/editor/stores/selection-store.ts`
- `packages/web/src/features/pages/editor/stores/viewport-store.ts`
- `packages/web/src/features/pages/editor/stores/ui-store.ts`
- Modified: `EditorContext.tsx` (thin wrapper over stores)

---

### Block 4 — Document Validation & Migrations (5%)
**Dependencies: Block 1, Block 3**
**Why:** Existing pages have no schema version. New typed schemas will require migrations. Must handle gracefully to avoid breaking existing content.

**What exists today:**
- `toEditorContentJson()` does basic coercion (defaults for missing root/blocks/layoutMode)
- No version field on documents
- No validation on load or save
- API `PATCH /pages/:id` accepts `contentJson` as-is

**Tasks:**
1. Add `schemaVersion` to `EditorContentJson` (Block 1 defined the type; this wires it in)
2. Build `DocumentMigrator`:
   - Registry of migrations: `{ fromVersion, toVersion, migrate(doc) → doc }`
   - `migrate(doc)` runs all needed migrations sequentially
   - Returns validated document or throws with details
3. Write migration v0→v1: existing documents (no schemaVersion) → v1:
   - Add `schemaVersion: 1`
   - Normalize any missing block props to match Zod schemas (fill defaults)
   - Preserve all existing data (non-destructive)
4. Wire migration into `toEditorContentJson()` so legacy pages auto-migrate on load
5. Add Zod validation on document load — log warnings for invalid props, don't crash
6. Add validation on save: `PATCH /pages/:id` validates `contentJson` against schema before persisting
7. Add stricter validation on publish: reject documents with schema errors
8. Error UI: if a document fails migration, show an error state (not a blank/crashed editor)
9. Write tests: load legacy documents → migrate → validate → edit → save → reload

**Files to create:**
- `packages/web/src/features/pages/editor/migrations/migrator.ts`
- `packages/web/src/features/pages/editor/migrations/v0-to-v1.ts`
- `packages/api/src/modules/pages/validation.ts` — server-side validation

---

### Block 5 — Custom HTML Sanitization & Security (5%)
**Dependencies: Block 1**
**Why:** `BlockCustomHtml.tsx` currently renders user HTML via `dangerouslySetInnerHTML` with zero sanitization. This is a P0 security issue that must be fixed before exposing Custom HTML in any new surfaces.

**What exists today:**
- `BlockCustomHtml.tsx`: in preview mode, renders `<div dangerouslySetInnerHTML={{ __html: html }} />`
- `sanitize-mhtml.ts` exists in the import pipeline but only sanitizes imported MHTML, not user-authored custom HTML blocks
- No URL validation on image src, video src, button href, or form actions
- No sanitization on page-level script injection fields

**Tasks:**
1. Install DOMPurify in both `packages/web` and `packages/api`
2. Create `packages/web/src/lib/sanitize.ts`:
   - `sanitizeHtml(html: string, options?)` — strict allowlist of tags/attributes
   - `sanitizeUrl(url: string)` — reject `javascript:`, validate URL format
   - `sanitizeCss(css: string)` — strip dangerous CSS (expressions, url() to data:, etc.)
3. Create `packages/api/src/lib/sanitize.ts` — server-side mirror
4. Apply sanitization to `BlockCustomHtml`:
   - Sanitize on save (when user edits HTML in the code editor)
   - Sanitize on render (defense in depth)
   - Optionally render in sandboxed iframe for full isolation
5. Sanitize user-supplied URLs in all blocks:
   - Image: `src`, `linkHref`
   - Button: `href`
   - Video: `src`/`url`
   - Form: `submitUrl`, `redirectUrl`
6. Sanitize page-level fields:
   - `customCss` → `sanitizeCss()`
   - `seoMetaDescription`, `seoOgTitle` → escape HTML entities
   - Script injection fields → flag as "advanced/dangerous" in UI
7. Add server-side validation in API routes mirroring client-side rules
8. Security test suite: XSS vectors, script injection, `javascript:` URLs, CSS expression injection, event handler attributes

**Files to create/modify:**
- `packages/web/src/lib/sanitize.ts`
- `packages/api/src/lib/sanitize.ts`
- `packages/web/src/features/pages/editor/blocks/BlockCustomHtml.tsx` — apply sanitization
- `packages/api/src/modules/pages/pages.routes.ts` — add validation middleware

---

### Block 6 — Composable Inspector Sections & Panel Registry (5%)
**Dependencies: Block 1 (capabilities), Block 3 (stores)**
**Why:** The current `PropertiesPanel.tsx` has inline, per-block-type rendering logic in one large component. This must be decomposed into composable sections driven by the block registry and capabilities.

**What exists today:**
- `PropertiesPanel.tsx`: one component with a large switch/if-else for each block type
- `UniversalPropertiesSection.tsx`: renders margin/padding/bg/border/radius/opacity/shadow/visibility — applied to all blocks identically
- No concept of "this block supports typography but not border"
- Block-specific controls are inline JSX in PropertiesPanel, not separate components
- Color inputs are basic hex `<input type="text">`

**Tasks:**
1. Create reusable inspector section components (each reads/writes via `DocumentStore.dispatch`):
   - `PositionSizeSection` — x, y, w, h (canvas mode only)
   - `SpacingSection` — margin/padding with 4-side + linked toggle (extract from `UniversalPropertiesSection`)
   - `BorderSection` — width, color, style, per-corner radius (extract from `UniversalPropertiesSection`)
   - `BackgroundSection` — color picker (simple hex for now, upgraded in Block 7)
   - `TypographySection` — font family, size, weight, line height, letter spacing, color, alignment
   - `ShadowSection` — offsets, blur, spread, color (extract from `UniversalPropertiesSection`)
   - `VisibilitySection` — device visibility toggles (extract from `UniversalPropertiesSection`)
   - `OpacitySection` — opacity slider (extract from `UniversalPropertiesSection`)
   - `LinkActionSection` — URL, open new tab, aria-label
2. Create block-specific panel components:
   - `HeadlinePanel`, `ParagraphPanel`, `ButtonPanel`, `ImagePanel`, `VideoPanel`, `FormPanel`, `CountdownPanel`, `CarouselPanel`, `AccordionPanel`, `TablePanel`, `CustomHtmlPanel`, `ShapeRectanglePanel`, `ShapeCirclePanel`, `DividerPanel`, `SpacerPanel`
3. Each block panel composes: block-specific controls first, then shared sections based on capabilities from registry
4. Create `InspectorRegistry`: maps `BlockKind` → panel component (reads from extended `BlockDefinition`)
5. Refactor `PropertiesPanel.tsx` to look up registry → render resolved panel
6. Refactor `UniversalPropertiesSection` into the composable sections above (keep as backward compat wrapper initially)
7. Verify all existing property editing still works end-to-end

**Files to create:**
- `packages/web/src/features/pages/editor/inspector/sections/*.tsx` — shared sections
- `packages/web/src/features/pages/editor/inspector/panels/*.tsx` — per-block panels
- `packages/web/src/features/pages/editor/inspector/registry.ts`
- Modified: `PropertiesPanel.tsx` → thin lookup wrapper

---

### Block 7 — Color Picker, Typography System, & Design Token Foundation (5%)
**Dependencies: Block 6**
**Why:** The current editor uses raw hex text inputs for colors and has no real typography system. These are foundational controls used by nearly every block.

**What exists today:**
- Color inputs: plain `<input>` with hex string values
- Page-level font defaults: `fontFamily`, `headlineFontFamily`, `paragraphFontFamily`, `buttonFontFamily` + weights in `PageSettings`
- Per-block: `fontFamily`, `fontSize`, `fontWeight`, `color`, `textAlign` as loose props
- Google Fonts loaded via `loadGoogleFonts()` helper
- No color picker UI component
- No "recent colors" or saved colors

**Tasks:**
1. Build `ColorPicker` component:
   - Hue/saturation area + hue strip
   - Hex input field
   - RGB input fields
   - Alpha/opacity slider
   - Recent colors (session-scoped, stored in `EditorUIStore`)
   - Popover-triggered from a color swatch button
2. Replace all hex text inputs across inspector sections with `ColorPicker`
3. Build `FontSelector` component:
   - Searchable dropdown of Google Fonts + system fonts
   - Preview text in each font
   - Triggers `loadGoogleFonts()` on selection
4. Upgrade `TypographySection` (from Block 6) to use `FontSelector` and `ColorPicker`
5. Implement page typography defaults inheritance:
   - Headline blocks inherit `headlineFontFamily`/`headlineFontWeight` when no override set
   - Paragraph blocks inherit `paragraphFontFamily`/`paragraphFontWeight`
   - Button blocks inherit `buttonFontFamily`/`buttonFontWeight`
   - Inspector shows "Page default" label when inherited
6. Add `letterSpacing` and `lineHeight` controls to TypographySection
7. Upgrade `SpacingSection` (from Block 6): four-side controls with "link all" toggle, visual box model diagram

**Files to create:**
- `packages/web/src/features/pages/editor/inspector/components/ColorPicker.tsx`
- `packages/web/src/features/pages/editor/inspector/components/FontSelector.tsx`
- Modified: all inspector sections that use color/font inputs

---

### Block 8 — Canvas Interactions: Selection, Resize Handles, Snapping (5%)
**Dependencies: Block 3 (stores), Block 2 (mutations)**
**Why:** Canvas editing (freeform absolute positioning) needs production-quality selection, resize, and snapping. Currently selection works but resize handles and snap guides are basic or missing.

**What exists today:**
- Selection: click to select, `selectedBlockIds` state, shift+click multi-select via `toggleBlockSelection`
- Canvas mode: absolute positioning with x/y/w/h in block props
- Drag in canvas mode: arrow keys nudge (1px, 10px with Shift)
- DnD in fluid mode: @dnd-kit with `DraggableBlock`/`DroppableZone`
- Align actions: `alignBlocks('left'|'center'|'right'|'top'|'middle'|'bottom')` for canvas mode
- No visible resize handles in the UI
- No snap guides/lines
- No marquee (area) selection

**Tasks:**
1. Implement visible resize handles on selected blocks (canvas mode):
   - 8-handle resize (corners + midpoints)
   - Handle cursor changes (nw-resize, e-resize, etc.)
   - Live resize: update w/h via mutation as user drags
   - Proportional resize with Shift key
   - Minimum size constraints per block type
2. Implement snap guide system:
   - Calculate alignment opportunities with sibling blocks (edges + centers)
   - Canvas center lines (vertical + horizontal)
   - Draw visual guide lines during drag/resize
   - Snap threshold: 5px (configurable later)
   - Throttle guide computation for performance (max 60fps)
3. Implement marquee selection:
   - Click+drag on empty canvas area draws selection rectangle
   - All blocks within rectangle get selected
   - Combine with Shift for additive selection
4. Wire all drag/resize operations through mutation layer:
   - Each drag sequence = 1 transaction (coalesced for undo)
   - Each resize sequence = 1 transaction
5. Performance work:
   - Lightweight drag overlay (don't re-render all blocks during drag)
   - Memoize block rendering with `React.memo`
   - Selection-aware rerender boundaries

**Files to create/modify:**
- `packages/web/src/features/pages/editor/canvas/ResizeHandles.tsx`
- `packages/web/src/features/pages/editor/canvas/SnapGuides.tsx`
- `packages/web/src/features/pages/editor/canvas/MarqueeSelect.tsx`
- Modified: `EditorCanvas.tsx` — integrate handles, guides, marquee

---

### Block 9 — True Responsive Editing (5%)
**Dependencies: Block 1 (layout types), Block 3 (stores), Block 8 (canvas)**
**Why:** Current responsive support is preview-only with prop overrides. True responsive editing requires per-breakpoint layout data and auto-generated mobile layouts.

**What exists today:**
- 3 breakpoints with width toggle in toolbar
- `props.overrides[breakpoint]` system: per-breakpoint prop overrides merged on render
- `visibleOn: 'all' | 'desktop' | 'tablet' | 'mobile'` — simple visibility
- Breakpoint switching changes `canvasWidth` and which overrides apply
- No separate layout data per breakpoint (position is in props, not a layout model)
- No auto-generated mobile layout
- No mobile conflict detection

**Tasks:**
1. Implement per-breakpoint layout model:
   - Add `layout: ResponsiveLayout` to `EditorBlock` (from Block 1 types)
   - Desktop layout is authoritative; tablet/mobile override when present
   - Editing in mobile mode writes to `layout.mobile` only
   - Content/props shared; layout diverges per breakpoint
   - Migration: extract existing canvas x/y/w/h props into `layout.desktop`
2. Auto-generate mobile-first pass:
   - When switching to mobile for a section with no mobile layout: auto-stack blocks vertically
   - Preserve content hierarchy order
   - Apply sensible spacing (16-24px gaps)
   - Center or fit-to-width oversized elements
   - Store result in `layout.mobile`
3. Device visibility upgrade:
   - Replace `visibleOn` string with `DeviceVisibility` object per block
   - Migration: convert existing `visibleOn` values
   - Hidden blocks render as ghosts (30% opacity) with toggle
   - Visibility status in inspector
4. Mobile conflict detection:
   - Detect overlapping elements
   - Detect elements extending beyond mobile viewport
   - Detect text < 12px
   - Detect tap targets < 44px
   - Show warning badges in editor
5. Quick repair actions: reset mobile layout per block/section, reflow section, center in mobile
6. Published output: emit CSS media queries or responsive classes based on per-breakpoint layout

**Files to create/modify:**
- `packages/web/src/features/pages/editor/responsive/auto-layout.ts`
- `packages/web/src/features/pages/editor/responsive/conflict-detector.ts`
- `packages/web/src/features/pages/editor/responsive/repair-actions.ts`
- Modified: `BlockRenderer.tsx`, `EditorCanvas.tsx`, migration v1→v2

---

### Block 10 — Core Element Parity: Button, Image, Video, Form (5%)
**Dependencies: Block 6 (inspector), Block 7 (color/typography), Block 8 (canvas)**
**Why:** These are the elements marketers use most. Current implementations work but lack inspector polish and some controls.

**What exists today:**
- `BlockButton`: text, href, openNewTab, bgColor, hoverBgColor, textColor, ariaLabel — renders as `<a>` or `<button>`
- `BlockImage`: src, alt, linkHref, linkNewTab, objectFit, lazyLoad — basic rendering
- `BlockVideo`: url/src, autoplay, loop, mute, aspectRatio, provider detection — iframe embed
- `BlockForm`: formId + formBindings system, field types (text/email/phone/textarea/dropdown/checkbox/radio/hidden/number/date), submitText, successMessage, redirectUrl

**Tasks:**
1. **Button upgrades:**
   - Inline text editing on canvas (contentEditable)
   - Typography controls (font, size, weight) via TypographySection
   - Padding controls (4-side)
   - Border: width/color/style, per-corner radius
   - Shadow
   - Hover state preview in inspector
2. **Image upgrades:**
   - Upload button + drag-drop (connect to asset upload API)
   - Replace image action
   - Click action config (link URL, open behavior)
   - Fit mode selector (cover/contain/fill/none)
   - Opacity control
   - Border radius
3. **Video upgrades:**
   - Provider auto-detection UI feedback (YouTube/Vimeo/Wistia badge)
   - Poster image (thumbnail before play)
   - Title/caption
   - Controls toggle
   - Loop, start time
4. **Form upgrades:**
   - Ensure form block is prominently exposed in add panel
   - Field builder: visual add/remove/reorder with drag handles
   - Per-field: label, placeholder, required toggle, type selector
   - Submit button styling (use Button-like controls)
   - Success behavior toggle: inline message vs redirect
   - Form validation preview in edit mode
5. Wire all new controls through inspector panels from Block 6
6. Test each: add → configure → preview → publish → verify rendered output

---

### Block 11 — Secondary Element Parity: Carousel, Accordion, Countdown, Shapes (5%)
**Dependencies: Block 6, Block 7**
**Why:** These elements exist but their inspector controls and polish need work for parity.

**What exists today:**
- `BlockCountdown`: targetDate, labels (d/h/m/s), digitColor — functional timer
- `BlockAccordion`: sections array, expandOneOnly, arrowColor, dividerColor, sectionSpacing, title/content font/color
- `BlockCarousel`: slides array, autoPlay, autoPlayInterval, arrows, dots, backgroundColor, loop
- `BlockTable`: rows (2D string array), hasHeader flag
- `BlockShapeRectangle/Circle`: basic fill, border, opacity
- `BlockDivider`: orientation, color, thickness, style, width

**Tasks:**
1. **Countdown:** background color, label color, timezone, label position, digit font controls
2. **Accordion:** add/remove/reorder sections UX, rich content per item (allow nested blocks), chevron customization, per-corner radius, section spacing controls
3. **Carousel:** add/remove/reorder slides UX, per-slide background, timing control, transition style, responsive behavior
4. **Table:** add/remove rows and columns, cell editing, header row styling, border controls
5. **Shapes:** full color picker integration, shadow support, line thickness/style for divider-like shapes
6. **Divider:** color picker, style selector (solid/dashed/dotted), width percentage or fixed
7. Ensure all have sensible insertion defaults (Block 16 will polish further)
8. Responsive: ensure all support device visibility and breakpoint overrides

---

### Block 12 — Page Settings, Scripts, Sticky Sections, Popups (5%)
**Dependencies: Block 3 (stores), Block 4 (validation)**
**Why:** Page-level settings exist in data model but UI exposure is incomplete or scattered.

**What exists today:**
- `PageSettings` type: background (color/image/size), fonts (headline/paragraph/button families + weights), customCss, bodyClassName, faviconUrl, SEO fields
- Settings rendered in `PropertiesPanel` when nothing is selected
- `StickyBar`: top/bottom with own block tree, CRUD operations in EditorContext
- `Popup`: onLoad/delay/exitIntent triggers with own block tree
- `scripts`: header/footer script injection via separate `PageScriptsPanel`
- No UI for some SEO fields
- No sticky section UI polish
- Popup trigger configuration minimal

**Tasks:**
1. **Background settings:** color picker, image upload, size/repeat/position selectors
2. **Typography defaults panel:** headline/paragraph/button font family + weight selectors with preview
3. **Script injection panel:** head HTML, body start, body end, custom CSS, page JS — with syntax highlighting (CodeMirror or Monaco lightweight) and sanitization warnings
4. **Sticky sections:** mark any section as sticky top/bottom, visual indicator on canvas, proper CSS `position: sticky` in published output, z-index management
5. **SEO panel:** title, description, OG title, OG image (upload), favicon URL — preview card
6. **Popup builder:** trigger type config (delay seconds, scroll percentage, exit intent), popup content editing using block tree, backdrop settings
7. Consolidate all settings into structured `PageDocument.settings` (from Block 1 schema)
8. Validate all settings on save/publish (no broken URLs, CSS, scripts)

---

### Block 13 — Undo/Redo Hardening & Version History (5%)
**Dependencies: Block 2 (mutations), Block 3 (history store)**
**Why:** Current undo is snapshot-based via `use-undo` — inefficient, no transaction grouping, lost on refresh. Version history doesn't exist.

**What exists today:**
- `use-undo` library: `past[]`, `present`, `future[]` — full document snapshots
- Every `setState` call = 1 undo entry (drag = many entries, slider = many entries)
- Undo/redo via Ctrl+Z / Ctrl+Shift+Z
- In-memory only — lost on page refresh
- `rollbackToPublished()` exists — reverts to `lastPublishedContentJson`
- No version snapshots, no persistent history

**Tasks:**
1. Replace `use-undo` with `HistoryStore` (from Block 3) using inverse transactions
2. Transaction coalescing:
   - Drag/resize: start transaction on mousedown, commit on mouseup = 1 undo entry
   - Slider controls: coalesce rapid changes within 300ms
   - Text input: debounce into meaningful chunks (pause > 500ms = new entry)
   - Color picker: coalesce until picker closes
3. Verify undo restores both canvas state AND inspector-visible values
4. Add persistent version snapshots:
   - Add `PageVersion` model to Prisma: `{ id, pageId, name?, contentJson, createdAt }`
   - API: `POST /pages/:id/versions` (create), `GET /pages/:id/versions` (list), `POST /pages/:id/versions/:versionId/restore`
   - Auto-snapshot before publish
   - Manual "Save version" button in editor
5. Version history UI: sidebar panel showing versions with timestamps, preview on hover, restore action
6. Restore safety: restoring a version creates the current state as a new version first (never lose work)
7. Tests: undo/redo round-trips, coalescing behavior, version create/list/restore

---

### Block 14 — Pre-Publish Validation & Accessibility (5%)
**Dependencies: Block 1 (schemas), Block 5 (sanitization), Block 9 (responsive)**
**Why:** No validation exists before publish. Users can publish broken pages with overlapping mobile elements, missing alt text, unsanitized HTML, or broken links.

**What exists today:**
- Publish flow: `POST /:id/publish` — no validation, just copies contentJson to `lastPublishedContentJson`
- No accessibility checks
- No content quality checks
- No link validation

**Tasks:**
1. Build validation engine (`packages/web/src/features/pages/editor/validation/`):
   - Schema: all blocks valid per Zod schemas
   - Responsive: no off-screen mobile elements, no tiny touch targets
   - Accessibility: missing alt text on images, empty buttons, low contrast (basic heuristic)
   - Content: empty sections, forms without submit path, unconfigured countdowns
   - Links: malformed URLs, `javascript:` URLs
   - HTML: custom HTML blocks pass sanitization
   - SEO: missing title/description (warning, not blocking)
2. Severity levels: `error` (blocks publish), `warning` (allows publish with acknowledgment)
3. Pre-publish checklist UI:
   - Modal showing categorized issues
   - Each issue: description, severity, click-to-jump to affected block
   - "Publish anyway" for warnings-only
   - Block publish if errors exist
4. In-editor warnings: show warning badge on blocks with issues (subtle, non-intrusive)
5. Server-side validation mirror: API validates before `publishPage()` — reject if errors
6. Published output accessibility:
   - Semantic HTML: `<h1>`-`<h6>`, `<p>`, `<nav>`, `<main>`, `<footer>` where detectable
   - `aria-label` on buttons and links where set
   - `alt` on images
   - Keyboard-navigable forms

---

### Block 15 — Error Boundaries, Performance, Stability (5%)
**Dependencies: Block 1 (registry), Block 3 (stores)**
**Why:** One broken block can crash the entire editor. Large pages lag. These are P0 usability issues.

**What exists today:**
- No error boundaries on block renderers
- No lazy loading of block components
- `BlockRenderer` renders all blocks synchronously
- No memoization on block components
- Full document re-render on any edit (via context)

**Tasks:**
1. **Error boundaries:**
   - Create `BlockErrorBoundary` component wrapping each block in `BlockRenderer`
   - Fallback UI: shows block type, error message, "Remove block" button
   - Logs error details to console (future: error reporting)
2. **Lazy loading:**
   - `React.lazy` for infrequently used block renderers: table, carousel, accordion, customHtml, countdown
   - Suspense boundary with skeleton loading state
3. **Memoization:**
   - `React.memo` on all block components with shallow prop comparison
   - Zustand selector optimization: components subscribe to minimal state slices (e.g., `useDocumentStore(s => s.blocks[blockId])`)
   - Selection-aware boundaries: only re-render selected block's inspector on edit
4. **Canvas performance:**
   - Lightweight drag overlay: render a simplified copy during drag, not the full block
   - Throttle snap guide computation to 60fps max
   - For pages with 100+ blocks: virtualize off-screen sections (IntersectionObserver)
5. **Latency targets:**
   - Selection feedback: < 16ms
   - Drag: smooth 60fps with 100 elements
   - Inspector edit → canvas update: < 100ms
   - Typing in text blocks: no perceptible lag
6. Performance test: create a 100-block test page, measure interaction latencies

---

### Block 16 — Guardrails, Smart Defaults, & Frustration Prevention (5%)
**Dependencies: Block 6 (inspector), Block 8 (canvas), Block 9 (responsive)**
**Why:** Feature completeness without good defaults and guardrails = frustrated users. This is the "editor ergonomics" layer.

**Tasks:**
1. **Insertion defaults (every block looks good on drop):**
   - Button: 16px/32px padding, #2563eb bg, white text, 6px radius, 16px font
   - Headline: inherit page font, 36px, bold, dark text
   - Paragraph: inherit page font, 16px, normal, dark text
   - Image: 100% width, cover fit, "Add image" placeholder
   - Form: 3 fields with 16px spacing, styled submit button
   - Accordion: 3 items with polished styling
   - Carousel: 3 slides with starter content
   - Countdown: all labels shown, readable defaults
2. **Smart spacing:**
   - Section inserts with 64px vertical padding (landing page standard)
   - Duplicated blocks maintain spacing relationships
   - "Normalize spacing" action: equalize spacing in selected section
3. **Alignment tools (for multi-select):**
   - Align left/center/right/top/middle/bottom (extend existing `alignBlocks`)
   - Distribute horizontally / distribute vertically (equal spacing)
   - Center in parent section
4. **Overlap/bounds warnings:**
   - Detect and highlight overlapping blocks (canvas mode)
   - Detect blocks extending beyond canvas width
   - Detect text clipping (content taller than container)
   - Warning indicators on canvas (subtle orange outline)
5. **Section templates refresh:**
   - Update hero, features, CTA, testimonials, logos, FAQ patterns
   - Use good spacing, hierarchy, typography defaults
   - Responsive-ready (work on mobile without manual rework)
   - Fully editable (not locked structures)
6. **Empty state guidance:**
   - Forms: "Add fields to build your form" helper
   - Carousel: "Add slides" helper
   - Empty sections: "Drop elements here" helper

---

### Block 17 — AI Page Context Service (5%)
**Dependencies: Block 1 (schemas), Block 3 (stores), Block 4 (validation)**
**Why:** The AI agent needs to understand pages structurally without calling an LLM. This is the "page understanding layer" — pure local computation.

**Tasks:**
1. Build `PageContextService`:
   - Input: `EditorContentJson` (typed, validated from Block 1/4)
   - Output: `PageSummary` with:
     - Section tree: ordered list of top-level sections with block counts and types
     - Text inventory: all editable text strings with `{ blockId, field, value, sectionId }`
     - Style summary: fonts used, colors used, spacing patterns
     - Component census: count of each block type
     - Layout density: blocks per section, nesting depth
2. Build section purpose classifier (heuristic, no LLM):
   - Hero: first section containing headline + button/CTA
   - Social proof: sections with logos, badges, or "trusted by" text
   - Testimonials: sections with carousel or repeated quote-like structures
   - Pricing: sections containing price numbers or plan-related text
   - FAQ: sections with accordion blocks
   - CTA: sections with prominent buttons and conversion-oriented headlines
   - Features: sections with grid/columns of icon+text patterns
3. Build `ContextAssembler`:
   - Given user query + optional selected block ID → build minimal context
   - Include: target section + neighbors, relevant style tokens, global page goal
   - Never include full page for single-section queries
   - Output structured JSON, not rendered HTML
4. Build `PageSummaryCache`:
   - Compute summary once, cache in memory
   - Invalidate on any document mutation (subscribe to `DocumentStore`)
   - Lazy recompute on next AI request
5. Unit tests with sample pages of varying complexity

**Files to create:**
- `packages/web/src/features/ai/context/page-context-service.ts`
- `packages/web/src/features/ai/context/section-classifier.ts`
- `packages/web/src/features/ai/context/context-assembler.ts`
- `packages/web/src/features/ai/context/page-summary-cache.ts`

---

### Block 18 — AI Intent Router & Deterministic Handlers (5%)
**Dependencies: Block 17, Block 2 (mutations)**
**Why:** Many user requests can be handled without an LLM call. The intent router classifies requests and uses deterministic handlers where possible, saving API costs and latency.

**Tasks:**
1. Build `IntentClassifier`:
   - Input: user message string + optional selected block context
   - Output: `{ intent, confidence, extractedParams }`
   - Intent types:
     - `deterministic_command` — simple, unambiguous (no LLM needed)
     - `copy_edit` — text content changes (LLM for generation)
     - `style_edit` — color, font, spacing (may or may not need LLM)
     - `layout_edit` — reorder, spacing, alignment (often deterministic)
     - `component_insert` — add block/section (deterministic + optional LLM for content)
     - `component_remove` — remove block (deterministic)
     - `cross_section_rewrite` — broad content changes (LLM)
     - `inspiration_based` — reference image (LLM for analysis)
     - `navigation` — undo, redo, select section (deterministic)
   - Classification via keyword/pattern matching + simple NLP (no LLM call)
2. Build deterministic command handlers:
   - Spacing changes: "Increase hero padding by 16px" → parse target + property + value → `UpdateBlockProps` mutation
   - Reordering: "Move testimonials above pricing" → identify sections by purpose (from Block 17) → `MoveBlock` mutation
   - Duplication: "Duplicate this section" → clone block subtree → `InsertBlock` mutation
   - Visibility: "Hide on mobile" → `UpdateBlockProps` mutation on visibility
   - Undo: "Undo last change" → `HistoryStore.undo()`
   - Image swap: "Change this image to [url]" → `UpdateBlockProps` mutation
   - Simple style: "Make this text red" → `UpdateBlockProps` mutation
3. Build `ExecutionPlanner`:
   - Deterministic intents → execute immediately via mutations
   - LLM-needed intents → prepare context (via Block 17) and forward to Claude (Block 19)
   - Mixed intents → split into deterministic + LLM parts
4. Tests: classify a corpus of 50+ sample user messages, verify correct intent + params

**Files to create:**
- `packages/web/src/features/ai/router/intent-classifier.ts`
- `packages/web/src/features/ai/router/deterministic-handlers.ts`
- `packages/web/src/features/ai/router/execution-planner.ts`

---

### Block 19 — Claude Integration & Structured Edit Planning (5%)
**Dependencies: Block 17 (context), Block 18 (router), Block 2 (mutations)**
**Why:** For requests that genuinely need reasoning or generation (copy rewriting, design suggestions, inspiration analysis), call Claude with minimal context and get structured, mutation-compatible output.

**Tasks:**
1. **API integration:**
   - Add `ANTHROPIC_API_KEY` to environment config
   - Create `POST /api/ai/chat` endpoint — accepts `{ pageContext, userMessage, intent, selectedBlockId? }`
   - Server-side Claude API call (keeps API key secure)
   - Rate limiting: per-workspace, per-minute
   - Error handling: timeout, rate limit, model errors → graceful UI feedback
2. **Prompt templates** (server-side, versioned):
   - Copy generation: receives section text + audience/goal → returns `{ changes: [{ blockId, field, newValue }] }`
   - Style reasoning: receives section structure + style summary + request → returns `{ changes: [{ blockId, property, value, rationale }] }`
   - Edit planning: receives page summary + broad request → returns `{ steps: [{ description, changes[], confidence }] }`
   - Inspiration analysis: receives image description/tags + current page context → returns structured style/layout suggestions
3. **Structured output enforcement:**
   - All prompts request JSON output matching defined schemas
   - Validate Claude's response against Zod schemas before using
   - Reject/retry on invalid output (max 1 retry)
4. **PatchTranslator:**
   - Takes validated Claude output → converts to mutation operations (from Block 2)
   - Maps `blockId` references to actual block IDs (Claude uses section names, translator resolves)
   - Validates each mutation against block schemas
   - Rejects mutations that would create invalid state
5. **AISession manager:**
   - Ties to `pageId` + session start time
   - Tracks: all messages, all Claude calls, all resulting mutations
   - Supports per-request undo (revert all mutations from one AI request)
   - Supports full session rollback (revert everything AI did)
   - Session persisted to allow resuming

**Files to create:**
- `packages/api/src/modules/ai/ai.routes.ts`
- `packages/api/src/modules/ai/ai.service.ts`
- `packages/api/src/modules/ai/prompts/` — prompt templates
- `packages/api/src/modules/ai/schemas.ts` — response Zod schemas
- `packages/web/src/features/ai/session/ai-session.ts`
- `packages/web/src/features/ai/generation/patch-translator.ts`

---

### Block 20 — AI Workspace UI, File Uploads, Live Preview & Diff (5%)
**Dependencies: Block 19, Block 13 (undo/history), Block 15 (performance)**
**Why:** The user-facing AI editing experience. Everything comes together here.

**Tasks:**
1. **Workspace layout:**
   - New route: `/pages/:id/ai-edit`
   - Left panel: conversation + file upload area
   - Center: live landing page preview (reads from same `DocumentStore`)
   - Right panel: change log with section map + undo controls
   - "Edit with AI" button on the regular editor page
2. **Conversation UI:**
   - Message input with send
   - User/AI message history
   - AI shows structured change plan before applying (when in approval mode)
   - Accept / Reject / Modify controls per change or per batch
   - Loading/thinking states during Claude calls
   - Error states for failed requests
3. **File upload:**
   - Drag-drop zone for images, PDFs, documents
   - Upload to server asset storage
   - Inspiration image analysis: call Claude once to extract structured tags:
     - Typography feel (serif/sans/mono, weight pattern)
     - Spacing density (tight/normal/airy)
     - Color mood (warm/cool/neutral, primary accent)
     - Section patterns detected
     - CTA treatment style
   - Cache analysis for session reuse (don't re-analyze same file)
4. **Live preview sync:**
   - Preview component subscribes to `DocumentStore`
   - Patch-driven updates (no full re-render)
   - Highlight blocks changed by AI (subtle pulse or outline)
   - Section jump: click change log entry → scroll preview to that section
5. **Diff visualization:**
   - Copy diffs: show old→new text with highlights
   - Structural diffs: added/removed/moved blocks
   - Style diffs: property change summaries
   - "Changed by AI" markers on affected blocks in preview
6. **AI undo controls:**
   - Undo last patch operation
   - Undo last AI request (all patches from that request)
   - Revert section to pre-AI state
   - Revert entire AI session
   - Clear confirmation for destructive reverts
7. **Edit modes:**
   - Suggest only: show plan, don't apply anything
   - Apply after approval (default): show plan, apply on accept
   - Auto-apply safe edits: apply deterministic changes automatically, require approval for LLM-generated changes
8. **End-to-end tests:** open workspace → send request → see plan → approve → verify live changes → undo → verify revert

**Files to create:**
- `packages/web/src/features/ai/workspace/AIWorkspace.tsx` — main layout
- `packages/web/src/features/ai/workspace/ConversationPanel.tsx`
- `packages/web/src/features/ai/workspace/ChangeLogPanel.tsx`
- `packages/web/src/features/ai/workspace/FileUpload.tsx`
- `packages/web/src/features/ai/workspace/DiffView.tsx`
- `packages/web/src/features/ai/workspace/AIPreview.tsx`
- Route registration in app router

---

## Dependency Graph

```
Block 1 (Schemas & Registry)
│
├─► Block 2 (Mutation Layer)
│   │
│   ├─► Block 3 (State Refactor)
│   │   │
│   │   ├─► Block 4 (Validation & Migrations)
│   │   │
│   │   ├─► Block 6 (Inspector Sections)
│   │   │   │
│   │   │   └─► Block 7 (Color/Typography)
│   │   │       │
│   │   │       ├─► Block 10 (Core Elements)
│   │   │       └─► Block 11 (Secondary Elements)
│   │   │
│   │   ├─► Block 8 (Selection/Resize/Snap)
│   │   │   │
│   │   │   └─► Block 9 (Responsive Editing)
│   │   │
│   │   ├─► Block 12 (Page Settings)
│   │   ├─► Block 13 (Undo/History)
│   │   ├─► Block 15 (Performance)
│   │   │
│   │   └─► Block 17 (AI Context)
│   │       └─► Block 18 (AI Router)
│   │           └─► Block 19 (Claude Integration)
│   │               └─► Block 20 (AI Workspace UI)
│   │
│   └─► Block 18 (also depends on mutations)
│
├─► Block 5 (Security/Sanitization)
│   └─► Block 14 (Pre-Publish Validation)
│
├─► Block 16 (Guardrails) ◄── Block 6, 8, 9
└─► Block 14 (Validation) ◄── Block 1, 5, 9
```

## Parallel Execution Opportunities

- After Block 1: **Block 2 + Block 5** can run in parallel
- After Block 3: **Block 4 + Block 6 + Block 8 + Block 12 + Block 13 + Block 15** are largely independent
- After Block 6+7: **Block 10 + Block 11** can parallelize
- **AI track** (17→18→19→20) can start after Block 3 completes, running in parallel with element parity (10-12)

## Summary

| # | Block | Dependencies | Track |
|---|-------|-------------|-------|
| 1 | Schemas & Block Registry | — | Foundation |
| 2 | Mutation Layer | 1 | Foundation |
| 3 | State Architecture Refactor | 2 | Foundation |
| 4 | Document Validation & Migrations | 1, 3 | Foundation |
| 5 | Custom HTML Security | 1 | Security |
| 6 | Inspector Sections & Registry | 1, 3 | Editor UX |
| 7 | Color Picker & Typography | 6 | Editor UX |
| 8 | Selection, Resize, Snapping | 3, 2 | Canvas |
| 9 | True Responsive Editing | 1, 3, 8 | Canvas |
| 10 | Button/Image/Video/Form Parity | 6, 7, 8 | Element Parity |
| 11 | Carousel/Accordion/Countdown/Shapes | 6, 7 | Element Parity |
| 12 | Page Settings & Scripts | 3, 4 | Page Config |
| 13 | Undo/Redo & Version History | 2, 3 | Reliability |
| 14 | Pre-Publish Validation | 1, 5, 9 | Quality |
| 15 | Error Boundaries & Performance | 1, 3 | Reliability |
| 16 | Guardrails & Smart Defaults | 6, 8, 9 | Editor UX |
| 17 | AI Page Context Service | 1, 3, 4 | AI |
| 18 | AI Intent Router | 17, 2 | AI |
| 19 | Claude Integration | 17, 18, 2 | AI |
| 20 | AI Workspace UI | 19, 13, 15 | AI |
