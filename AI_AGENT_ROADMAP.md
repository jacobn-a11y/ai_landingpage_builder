# AI Landing Page Editor Agent — Implementation Roadmap

## Overview

20 blocks, each ~5% of total work, ordered by dependency.
Each block is self-contained and shippable. Later blocks depend on earlier ones.

**Current architecture baseline:**
- EditorContext.tsx (894 lines): monolithic React context with `useUndo`, flat block map, JSON-serialized autosave
- Block types: 5 layout + 14 content + 5 pattern + 1 form + 1 embed = 26 types
- UniversalProps: margin, padding, bg, border, opacity, shadow, visibility, width
- Per-block props: untyped `Record<string, unknown>` — no runtime validation
- Renderer: 583-line `renderer.ts` converts block tree → HTML string
- No AI code exists in codebase today

---

## Block 1: Typed Block Schema Registry (5%)

**Goal:** Replace `Record<string, unknown>` with Zod schemas for every block type.

**Files to create:**
- `packages/blocks/src/schemas/index.ts` — re-exports all schemas
- `packages/blocks/src/schemas/universal.ts` — `UniversalPropsSchema` (Zod version of `universal-props.ts`)
- `packages/blocks/src/schemas/layout.ts` — section, container, grid, columns, stack
- `packages/blocks/src/schemas/content.ts` — headline, paragraph, text, image, button, divider, spacer, video, shapes, countdown, table, accordion, carousel
- `packages/blocks/src/schemas/pattern.ts` — hero, features, testimonials, faq, logos
- `packages/blocks/src/schemas/form.ts` — form
- `packages/blocks/src/schemas/embed.ts` — customHtml

**Files to modify:**
- `packages/blocks/package.json` — add `zod` dependency
- `packages/blocks/src/block-types.ts` — export `BlockPropsMap` type derived from schemas
- `packages/web/src/features/pages/editor/block-registry.ts` — attach schema ref to each `BlockDefinition`

**Key decisions:**
- Each schema defines: required props, optional props with defaults, allowed value ranges
- `BlockPropsSchema = z.discriminatedUnion('type', [...allSchemas])`
- Export `validateBlockProps(type, props)` and `getDefaultProps(type)` utilities
- Responsive overrides: `overrides: z.record(breakpointSchema, partialPropsSchema).optional()`
- Schemas live in `packages/blocks` (shared between web and API)

**Verification:** Unit tests for each schema — valid props pass, invalid reject. Existing page fixtures parse without error.

---

## Block 2: Editor Store Decomposition — Document Store (5%)

**Goal:** Extract document state from EditorContext into a standalone Zustand store.

**Files to create:**
- `packages/web/src/features/pages/editor/stores/document-store.ts`
  - State: `content: EditorContentJson`, `scopedStyles`, `layoutMode`, `pageSettings`, `scripts`
  - Actions: `setContent`, `insertBlock`, `updateBlock`, `removeBlock`, `moveBlock`, `insertBlockFromLibrary`, `copyBlocks`, `pasteBlocks`, `groupBlocks`, scoped style mutations
  - Undo/redo: integrated via `temporal` middleware (replaces `use-undo`)

**Files to modify:**
- `packages/web/package.json` — add `zustand`, `zundo` (temporal middleware)
- `packages/web/src/features/pages/editor/EditorContext.tsx` — delegate document mutations to `useDocumentStore()`, keep context as thin facade

**Key decisions:**
- Zustand `temporal` middleware replaces `use-undo` for undo/redo with transaction grouping support
- Store actions validate props against Block 1 schemas before applying
- `applyMutation(mutation: EditorMutation)` — single entry point for all document changes (foundation for AI mutations)
- Mutations are serializable objects: `{ type: 'updateBlock', blockId, props }`, `{ type: 'insertBlock', ... }`, etc.
- EditorContext becomes a compatibility shim that reads from Zustand store — no breaking changes to existing components

**Verification:** All existing editor operations work identically. Undo/redo works. Autosave works.

---

## Block 3: Editor Store Decomposition — Selection, Viewport, Persistence (5%)

**Goal:** Extract remaining state slices and complete store migration.

**Files to create:**
- `packages/web/src/features/pages/editor/stores/selection-store.ts` — `selectedBlockIds`, click handlers, multi-select
- `packages/web/src/features/pages/editor/stores/viewport-store.ts` — `breakpoint`, `canvasWidth`, `previewMode`
- `packages/web/src/features/pages/editor/stores/persistence-store.ts` — autosave logic, dirty tracking, `saving`, `lastSaved`
- `packages/web/src/features/pages/editor/stores/overlay-store.ts` — `stickyBars`, `popups`, CRUD mutations
- `packages/web/src/features/pages/editor/stores/index.ts` — re-exports

**Files to modify:**
- `packages/web/src/features/pages/editor/EditorContext.tsx` — reduced to ~100 lines: provider that initializes stores, exposes combined hook `useEditor()` for backward compat
- All components currently using `useEditor()` — no changes needed (shim provides same API)

**Verification:** Full manual test of editor. Autosave, undo/redo, breakpoint switching, overlay editing, multi-select all work.

---

## Block 4: Mutation Engine Foundation (5%)

**Goal:** Formalize the mutation system that the AI agent will drive.

**Files to create:**
- `packages/web/src/features/pages/editor/mutations/types.ts`
  ```typescript
  type EditorMutation =
    | { type: 'insertBlock'; parentId: string; index: number; blockType: string; props?: Record<string, unknown> }
    | { type: 'updateBlockProps'; blockId: string; props: Record<string, unknown> }
    | { type: 'removeBlock'; blockId: string }
    | { type: 'moveBlock'; blockId: string; parentId: string; index: number }
    | { type: 'replaceText'; blockId: string; content: string }
    | { type: 'updatePageSettings'; settings: Partial<PageSettings> }
    | { type: 'duplicateBlock'; blockId: string }
    | { type: 'reorderChildren'; parentId: string; childIds: string[] }
    // ...
  ```
- `packages/web/src/features/pages/editor/mutations/apply-mutation.ts` — pure function: `(state, mutation) => newState`
- `packages/web/src/features/pages/editor/mutations/validate-mutation.ts` — checks mutation against schemas + structural constraints
- `packages/web/src/features/pages/editor/mutations/transaction.ts` — group multiple mutations into atomic transaction with single undo point

**Files to modify:**
- `packages/web/src/features/pages/editor/stores/document-store.ts` — route all actions through `applyMutation()`

**Verification:** Unit tests for every mutation type. Transaction grouping produces single undo step. Invalid mutations rejected with error.

---

## Block 5: Patch-Based Undo/Redo with Transaction IDs (5%)

**Goal:** Replace snapshot-based undo with JSON patch tracking for efficient history and AI traceability.

**Files to create:**
- `packages/web/src/features/pages/editor/mutations/patch-history.ts`
  - Record forward + inverse patches per mutation
  - Transaction IDs: `txn_{timestamp}_{random}` — group related patches
  - `undo()` reverts entire transaction
  - `redo()` re-applies entire transaction
  - History cap (configurable, default 100 transactions)
- `packages/web/src/features/pages/editor/mutations/diff.ts` — compute JSON patches between states

**Files to modify:**
- `packages/web/src/features/pages/editor/stores/document-store.ts` — replace `temporal` middleware with custom patch history
- `packages/web/package.json` — add `fast-json-patch` or similar

**Key decisions:**
- Each AI action gets a transaction ID → user can undo entire AI edit in one step
- Manual edits get individual transaction IDs
- Patches are serializable (foundation for collaborative editing later)

**Verification:** Undo/redo works for single edits and grouped transactions. AI transaction undo reverts all grouped changes.

---

## Block 6: Page Context Service (5%)

**Goal:** Build the service that gives the AI a compact, structured understanding of the current page.

**Files to create:**
- `packages/web/src/features/ai/page-context.ts`
  - `buildPageSummary(content: EditorContentJson): PageSummary`
  - Output: section count, section types (hero/features/testimonials/etc.), block count by type, text content index, color palette, font usage, image count
  - Compact token-efficient format for LLM context
- `packages/web/src/features/ai/section-map.ts`
  - `buildSectionMap(content): SectionMapEntry[]`
  - Each entry: `{ sectionId, label, blockCount, childTypes[], textSnippets[] }`
  - Supports referencing by ordinal ("the second section") or label ("the hero section")
- `packages/web/src/features/ai/block-summary.ts`
  - `summarizeBlock(block, depth): string` — one-line summary for LLM context
  - `summarizeTree(content): string` — indented tree view

**Verification:** Unit tests with fixture pages. Summary fits within ~2000 tokens for typical 5-section landing page.

---

## Block 7: Intent Router — Deterministic Layer (5%)

**Goal:** Classify user intents that don't need LLM calls.

**Files to create:**
- `packages/web/src/features/ai/intent/types.ts`
  ```typescript
  type Intent =
    | { type: 'editText'; blockId: string; newText: string }
    | { type: 'changeColor'; blockId: string; prop: string; value: string }
    | { type: 'changeFont'; blockId: string; fontFamily: string }
    | { type: 'resize'; blockId: string; prop: string; value: number }
    | { type: 'addSection'; sectionType: string; position: 'before' | 'after'; referenceId?: string }
    | { type: 'removeBlock'; blockId: string }
    | { type: 'duplicateBlock'; blockId: string }
    | { type: 'reorder'; blockId: string; direction: 'up' | 'down' }
    | { type: 'needsLLM'; userMessage: string; context: PageSummary }
    // ...
  ```
- `packages/web/src/features/ai/intent/deterministic-router.ts`
  - Pattern matchers: regex + keyword extraction
  - "Make the headline bigger" → `{ type: 'resize', blockId: selectedOrResolved, prop: 'fontSize', value: currentValue * 1.2 }`
  - "Change background to blue" → `{ type: 'changeColor', blockId, prop: 'backgroundColor', value: '#3B82F6' }`
  - "Delete this section" → `{ type: 'removeBlock', blockId }`
  - Color name → hex resolver
  - Relative size resolver ("bigger", "smaller", "much larger")
  - Falls through to `needsLLM` for anything not confidently matched

**Files to modify:**
- Nothing yet — this is pure logic, not wired to UI

**Verification:** Unit tests with 50+ intent phrases. Precision > 95% on deterministic matches. Uncertain inputs correctly fall through to `needsLLM`.

---

## Block 8: Claude API Integration — Server Endpoint (5%)

**Goal:** Set up the API layer for Claude calls with structured output.

**Files to create:**
- `packages/api/src/modules/ai/ai.routes.ts`
  - `POST /api/v1/ai/chat` — accepts `{ message, pageContext, conversationHistory, selectedBlockId? }`
  - Returns `{ response: string, mutations?: EditorMutation[], intent?: Intent }`
  - Streaming via SSE for long responses
- `packages/api/src/modules/ai/ai.service.ts`
  - Claude API client (Anthropic SDK)
  - System prompt with page context, block schemas, mutation format
  - Tool use: define tools for each mutation type
  - Response parsing: extract mutations from tool calls
  - Token budget management: truncate context to fit
- `packages/api/src/modules/ai/prompts.ts`
  - System prompt template
  - Schema descriptions for Claude (derived from Block 1 Zod schemas)
  - Few-shot examples for common edits

**Files to modify:**
- `packages/api/package.json` — add `@anthropic-ai/sdk`
- `packages/api/src/app.ts` — register AI routes
- `packages/api/src/shared/env.ts` — `ANTHROPIC_API_KEY`
- `.env.example` — add `ANTHROPIC_API_KEY`

**Key decisions:**
- Use Claude tool_use for structured mutation output (not free-form JSON parsing)
- Conversation history capped at last 10 exchanges (token budget)
- Rate limiting: per-user, per-workspace
- No streaming of mutations — only stream text responses, mutations arrive as complete batch

**Verification:** Integration test: send "Make the headline red" with page context → get back valid `updateBlockProps` mutation.

---

## Block 9: AI Chat UI — Sidebar Panel (5%)

**Goal:** Build the chat interface in the editor.

**Files to create:**
- `packages/web/src/features/ai/AIChatPanel.tsx`
  - Sliding panel (right side, alongside properties panel)
  - Message list with user/assistant bubbles
  - Input with send button + Enter to send
  - Streaming text display
  - Mutation preview cards: "Changed headline color to red" with undo button
  - Loading/thinking indicator
  - Context indicator: shows selected block or "whole page"
- `packages/web/src/features/ai/AIChatMessage.tsx` — individual message component
- `packages/web/src/features/ai/AIMutationCard.tsx` — mutation preview/undo card
- `packages/web/src/features/ai/stores/chat-store.ts`
  - Zustand store: `messages[]`, `isStreaming`, `conversationId`
  - Actions: `sendMessage`, `clearHistory`, `undoLastAIEdit`
- `packages/web/src/features/ai/hooks/useAIChat.ts`
  - Orchestrates: intent router → (deterministic | API call) → apply mutations → update chat

**Files to modify:**
- `packages/web/src/features/pages/editor/EditorLayout.tsx` (or equivalent) — add toggle for AI panel
- `packages/web/src/lib/api.ts` — add `ai.chat()` method

**Verification:** Can open panel, type message, see response. Deterministic intents resolve instantly without API call.

---

## Block 10: Mutation Execution — Wiring AI to Editor (5%)

**Goal:** Connect AI mutation output to the editor store with live preview.

**Files to create:**
- `packages/web/src/features/ai/mutation-executor.ts`
  - Takes `EditorMutation[]` from AI response
  - Validates each against schemas (Block 1)
  - Groups into transaction (Block 5)
  - Applies via document store
  - Returns execution report: `{ applied: number, rejected: number, errors: string[] }`
- `packages/web/src/features/ai/draft-transaction.ts`
  - Sandboxed preview: apply mutations to a draft copy of state
  - Show diff preview before committing
  - "Apply" / "Discard" controls
  - Auto-apply for low-risk mutations (text edits, color changes)
  - Require confirmation for structural changes (add/remove sections)

**Files to modify:**
- `packages/web/src/features/ai/hooks/useAIChat.ts` — wire mutation executor
- `packages/web/src/features/ai/AIMutationCard.tsx` — show preview, apply/discard buttons
- `packages/web/src/features/pages/editor/stores/document-store.ts` — expose `applyMutationBatch(mutations[], txnId)`

**Verification:** "Add a testimonials section after the hero" → preview shows section → confirm → section appears in editor with undo support.

---

## Block 11: Registry-Driven Inspector Architecture (5%)

**Goal:** Replace the monolithic PropertiesPanel with a registry-driven system extensible by AI.

**Files to create:**
- `packages/web/src/features/pages/editor/inspectors/inspector-registry.ts`
  - Maps block type → inspector component + schema
  - `registerInspector(type, component, schema)`
  - AI can query registry to know what's editable per block type
- `packages/web/src/features/pages/editor/inspectors/HeadlineInspector.tsx`
- `packages/web/src/features/pages/editor/inspectors/ImageInspector.tsx`
- `packages/web/src/features/pages/editor/inspectors/ButtonInspector.tsx`
- `packages/web/src/features/pages/editor/inspectors/SectionInspector.tsx`
- `packages/web/src/features/pages/editor/inspectors/ColumnsInspector.tsx`
- (one per block type — can be incremental)

**Files to modify:**
- `packages/web/src/features/pages/editor/PropertiesPanel.tsx` — replace switch/case with registry lookup

**Key decisions:**
- Each inspector declares its editable props via schema reference
- AI mutation engine uses same schema to know valid props and ranges
- Inspector components are lazy-loaded

**Verification:** All existing block types render correct inspector. Adding a new block type only requires registering inspector + schema.

---

## Block 12: Responsive Layout Model (5%)

**Goal:** Proper per-breakpoint layout data instead of ad-hoc overrides.

**Files to create:**
- `packages/blocks/src/schemas/layout-model.ts`
  ```typescript
  BlockLayout = {
    desktop: { columns?: number; gap?: number; direction?: 'row' | 'column'; wrap?: boolean; align?: string; justify?: string },
    tablet?: Partial<...>,  // inherits from desktop if not set
    mobile?: Partial<...>,  // inherits from tablet if not set
  }
  ```
- `packages/web/src/features/pages/editor/layout/responsive-resolver.ts`
  - `resolveLayout(blockLayout, breakpoint)` — cascading inheritance
  - Desktop → Tablet → Mobile fallback chain
- `packages/web/src/features/pages/editor/layout/LayoutControls.tsx`
  - Visual layout editor: column count, gap, direction, alignment
  - Per-breakpoint toggle

**Files to modify:**
- `packages/blocks/src/schemas/layout.ts` — add `layout: BlockLayoutSchema` to container block schemas
- `packages/web/src/features/pages/editor/BlockRenderer.tsx` — use resolved layout for rendering
- `packages/api/src/modules/serve/renderer.ts` — use resolved layout for published output

**Key decisions:**
- Replaces current `overrides` system for layout props specifically
- Existing `overrides` stays for visual props (colors, spacing, visibility)
- AI can say "make this 2 columns on mobile" → mutation targets `layout.mobile.columns`

**Verification:** Layout changes per breakpoint render correctly in editor and published output. Existing pages with overrides still work.

---

## Block 13: AI Content Generation — Text, Headlines, Copy (5%)

**Goal:** AI generates and rewrites text content.

**Files to create:**
- `packages/api/src/modules/ai/tools/text-generation.ts`
  - Claude tools: `rewrite_text`, `generate_headline`, `generate_paragraph`, `adjust_tone`
  - Inputs: current text, desired tone/length/style, page context
  - Output: replacement text as mutation
- `packages/api/src/modules/ai/tools/copy-suggestions.ts`
  - `suggest_cta` — button text suggestions based on page context
  - `suggest_meta` — SEO title/description
  - Returns multiple options, user picks

**Files to modify:**
- `packages/api/src/modules/ai/ai.service.ts` — register text tools
- `packages/api/src/modules/ai/prompts.ts` — add text generation examples
- `packages/web/src/features/ai/AIChatPanel.tsx` — render suggestion chips for multi-option responses

**Verification:** "Make the headline more compelling" → returns rewritten headline. "Suggest 3 CTA options" → shows 3 button text options.

---

## Block 14: AI Design Edits — Colors, Typography, Spacing (5%)

**Goal:** AI handles design-level changes across multiple blocks.

**Files to create:**
- `packages/api/src/modules/ai/tools/design-edits.ts`
  - `change_color_scheme` — applies cohesive palette across page
  - `change_typography` — updates font family/size/weight across sections
  - `adjust_spacing` — increases/decreases whitespace proportionally
  - Each returns batch of mutations affecting multiple blocks
- `packages/web/src/features/ai/design-presets.ts`
  - Color palette presets (warm, cool, corporate, playful, etc.)
  - Typography scale presets
  - Spacing density presets (compact, comfortable, spacious)

**Files to modify:**
- `packages/api/src/modules/ai/ai.service.ts` — register design tools
- `packages/web/src/features/ai/mutation-executor.ts` — batch mutation preview for design changes (show before/after)

**Verification:** "Make the page feel more corporate" → applies blue/gray palette + serif fonts + tighter spacing. Full transaction undoable.

---

## Block 15: AI Structural Edits — Add/Remove/Reorder Sections (5%)

**Goal:** AI can restructure the page.

**Files to create:**
- `packages/api/src/modules/ai/tools/structural-edits.ts`
  - `add_section` — generates complete section with children (hero, features, testimonials, CTA, etc.)
  - `remove_section` — with confirmation
  - `reorder_sections` — move sections up/down
  - `swap_layout` — change section from grid to stack, 2-col to 3-col, etc.
  - Section templates: pre-built block trees for common patterns
- `packages/api/src/modules/ai/section-templates.ts`
  - Hero variants (centered, split, image-bg)
  - Features (grid, alternating, icon-list)
  - Testimonials (cards, carousel-style, single-quote)
  - Pricing (2-col, 3-col)
  - CTA (simple, split)
  - FAQ (accordion-based)

**Files to modify:**
- `packages/api/src/modules/ai/ai.service.ts` — register structural tools
- `packages/api/src/modules/ai/prompts.ts` — structural edit examples

**Verification:** "Add a pricing section after features with 3 tiers" → generates complete pricing section. "Move testimonials above the CTA" → reorders correctly.

---

## Block 16: File Upload Analysis — Screenshots, Brand Docs (5%)

**Goal:** Accept inspiration files and extract design parameters.

**Files to create:**
- `packages/api/src/modules/ai/file-analysis.ts`
  - Accept: PNG, JPG, PDF (brand guidelines, competitor screenshots)
  - Claude vision API: analyze uploaded image
  - Extract: color palette, typography feel, spacing density, layout structure, content tone
  - Cache results per file hash (avoid re-analyzing same file)
  - Output: `InspirationProfile` — structured design parameters
- `packages/api/src/modules/ai/ai.routes.ts` — add `POST /api/v1/ai/analyze-file` endpoint
- `packages/web/src/features/ai/FileUploadZone.tsx`
  - Drag-and-drop or click to upload
  - Shows extraction progress
  - Displays extracted profile: color swatches, font suggestions, layout sketch

**Files to modify:**
- `packages/web/src/features/ai/AIChatPanel.tsx` — file upload button in chat input
- `packages/web/src/features/ai/stores/chat-store.ts` — store inspiration profiles per conversation
- `packages/api/src/modules/ai/ai.service.ts` — include inspiration profile in system prompt context

**Verification:** Upload competitor screenshot → "Apply this style to my page" → design mutations reflect extracted palette/typography.

---

## Block 17: Live Preview Sync and Diff Visualization (5%)

**Goal:** Real-time preview of AI changes with visual diff.

**Files to create:**
- `packages/web/src/features/ai/LivePreviewSync.tsx`
  - Side-by-side or overlay: before/after state
  - Highlight changed blocks with colored outlines
  - Animated transition between states
  - "Accept" / "Reject" per-section or whole-page
- `packages/web/src/features/ai/DiffOverlay.tsx`
  - Visual indicator on changed blocks in main canvas
  - Green = added, yellow = modified, red = removed (outline only)
  - Dismiss on accept/reject

**Files to modify:**
- `packages/web/src/features/pages/editor/BlockRenderer.tsx` — add diff overlay support (conditional border/highlight)
- `packages/web/src/features/ai/hooks/useAIChat.ts` — manage diff state during mutation preview

**Verification:** AI makes 5 changes → all 5 blocks highlighted → accept individual changes or all at once → highlights clear.

---

## Block 18: Guardrails, Safety, and Smart Defaults (5%)

**Goal:** Prevent AI from breaking pages or creating poor outputs.

**Files to create:**
- `packages/api/src/modules/ai/guardrails.ts`
  - **Structural guards**: max blocks per page (200), max nesting depth (6), min 1 section
  - **Style guards**: contrast ratio check (WCAG AA), font size min/max, no invisible text
  - **Content guards**: profanity filter, no PII generation, length limits
  - **Mobile safety**: prevent desktop-only changes that break mobile (Block 12 layout model)
  - **Publish-time checks**: validate all blocks have required props, no broken image refs, forms have valid schemas
- `packages/web/src/features/ai/smart-defaults.ts`
  - When AI adds a block, inherit: parent section's color scheme, page's font family, consistent spacing
  - Button: inherit page CTA color, reasonable padding
  - Image: placeholder with correct aspect ratio for context
- `packages/api/src/modules/ai/ai.service.ts` — add guardrail middleware in mutation pipeline

**Verification:** "Make all text 2px" → rejected, minimum enforced. "Add 500 buttons" → rejected, block limit. Contrast check flags white text on white bg.

---

## Block 19: Conversation Memory and Multi-Turn Context (5%)

**Goal:** AI remembers conversation context and builds on previous edits.

**Files to create:**
- `packages/web/src/features/ai/stores/conversation-store.ts`
  - Persist conversation per page (localStorage + optional server-side)
  - Track: messages, applied mutations, rejected mutations, inspiration profiles
  - Compact context for Claude: summarize older messages, keep recent in full
- `packages/api/src/modules/ai/context-builder.ts`
  - Build optimal context window: page summary + recent conversation + active inspiration
  - Token counting and truncation strategy
  - Priority: current page state > recent messages > older messages > inspiration
- `packages/web/src/features/ai/ConversationHistory.tsx`
  - List of past AI sessions per page
  - Resume conversation or start fresh
  - View mutation history with undo capability

**Files to modify:**
- `packages/api/src/modules/ai/ai.service.ts` — use context builder for every request
- `packages/web/src/features/ai/hooks/useAIChat.ts` — persist and restore conversations

**Verification:** Multi-turn: "Make headline red" → "Now make it italic too" → AI understands "it" refers to the headline. Context preserved across page reloads.

---

## Block 20: Polish, Edge Cases, and Performance (5%)

**Goal:** Production-readiness pass.

**Tasks:**
- **Error recovery**: AI API failures show friendly error + retry button, not broken state
- **Keyboard shortcuts**: Cmd+K opens AI chat, Escape closes
- **Loading states**: skeleton loaders, streaming text cursor
- **Rate limiting UX**: show limit with cooldown timer, not cryptic error
- **Performance**: debounce rapid AI requests, cancel in-flight on new message
- **Accessibility**: chat panel is keyboard navigable, screen reader friendly, ARIA labels
- **Mobile editor**: AI panel as bottom sheet on narrow viewports
- **Analytics hooks**: track AI usage (requests, acceptance rate, undo rate, feature usage)
- **Empty states**: first-time guidance, example prompts
- **Edge cases**: handle page with 0 blocks, locked blocks, read-only users, concurrent edits

**Files to modify:** Various — this is a hardening pass across all AI-related files.

**Verification:** Full end-to-end manual test. Error injection testing. Screen reader walkthrough. Performance profiling under load.

---

## Dependency Graph

```
Block 1 (Schemas) ─────────────────────────────────────────────────────┐
    │                                                                   │
Block 2 (Document Store) ──── Block 3 (Other Stores) ──────────────────┤
    │                                                                   │
Block 4 (Mutation Engine) ── Block 5 (Patch Undo) ─────────────────────┤
    │                                                                   │
Block 6 (Page Context) ──── Block 7 (Intent Router) ───────────────────┤
    │                                                                   │
Block 8 (Claude API) ──────────────────────────────────────────────────┤
    │                                                                   │
Block 9 (Chat UI) ──── Block 10 (Mutation Wiring) ─────────────────────┤
    │                                                                   │
    ├── Block 11 (Inspector Registry) ── Block 12 (Responsive Layout)  │
    │                                                                   │
    ├── Block 13 (Text Gen) ── Block 14 (Design) ── Block 15 (Structure)
    │                                                                   │
    ├── Block 16 (File Upload) ── Block 17 (Live Preview)              │
    │                                                                   │
    ├── Block 18 (Guardrails) ── Block 19 (Memory)                     │
    │                                                                   │
    └── Block 20 (Polish)                                               │
```

Blocks 11-19 can be partially parallelized once Blocks 1-10 are complete. Blocks 13-16 are independent of each other.
