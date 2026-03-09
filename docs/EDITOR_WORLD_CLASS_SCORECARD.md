# Editor World-Class Scorecard

Date: March 9, 2026
Owner: Product + Engineering
Status: Active gate for editor work

## Purpose

This scorecard defines hard pass/fail criteria for editor quality. Feature parity is not sufficient. A block is not complete unless it meets these interaction, trust, and performance gates.

## Global Rule

No editor feature ships as "done" if any P0 scorecard gate fails in staging.

## Pillars And Gates

### Pillar 1: Interaction Precision (P0)

1. Selection feedback appears within 50ms at p95.
2. Drag interaction remains smooth on pages with 100 blocks.
3. Resize updates visually during pointer movement without jitter.
4. Keyboard nudge responds in one frame for single and multi-select.

Pass criteria:
- No critical regressions in selection, drag, resize, and nudge flows.
- p95 drag/resize frame budget stays inside target in profiling runbook.

### Pillar 2: Responsiveness And Speed (P0)

1. Editor page load to interactive under 1500ms at p95 in staging baseline.
2. Autosave request latency under 1200ms at p95.
3. Undo and redo operation latency under 100ms at p95.
4. Inspector edits reflect on canvas under 100ms at p95 for high-frequency controls.

Pass criteria:
- All latency thresholds pass over the latest rolling 500 events.

### Pillar 3: Trust And Recovery (P0)

1. Autosave error rate under 1%.
2. Every edit path goes through undo/redo history.
3. Rollback to last published state is available when published state exists.
4. Editor crash does not lose persisted draft data.

Pass criteria:
- Zero known unrecoverable user states in regression suite.

### Pillar 4: Guardrails (P1)

1. Overlap and off-canvas warnings exist before publish.
2. Mobile conflict detection is visible before publish.
3. Empty or broken CTA/link targets are flagged.
4. Layout cleanup and alignment helpers are available for common flows.

Pass criteria:
- Warnings are actionable and deep-link to offending blocks.

### Pillar 5: Ergonomics (P1)

1. Inspector surfaces common actions first.
2. Unsupported controls are not shown for selected block type.
3. Inserted blocks have usable default styling.
4. Editing loop avoids repeated manual correction.

Pass criteria:
- Task-based UX runbook (hero, CTA, form, FAQ) passes without high-friction loops.

## Scorecard Metrics (Telemetry)

Required metrics captured in web app:

1. `editor_page_load_ms`
2. `editor_autosave_ms`
3. `editor_undo_ms`
4. `editor_redo_ms`
5. `editor_drag_ms`
6. `editor_save_error`
7. `editor_save_success`

Rolling window: last 500 events per metric key.

## Block Completion Contract

Each roadmap block must include:

1. Scope statement and dependency confirmation.
2. Automated tests for changed behavior.
3. Scorecard impact assessment (which gates improved or protected).
4. Regression checks for previously passed P0 gates.
5. Rollback plan.

## Block Order (5% increments)

1. Block 01: Baseline + scorecard + instrumentation
2. Block 02: Critical security hardening
3. Block 03: Typed schema foundation
4. Block 04: Mutation layer core
5. Block 05: Transactional history/undo
6. Block 06: Editor state refactor
7. Block 07: Inspector registry architecture
8. Block 08: Selection/keyboard model
9. Block 09: Drag/resize/snap system
10. Block 10: Performance and crash containment
11. Block 11: Typography and color system
12. Block 12: Text model migration
13. Block 13: Core element parity A
14. Block 14: Conversion element parity B
15. Block 15: Structural/layout parity
16. Block 16: True responsive editing
17. Block 17: Guardrails and prepublish QA
18. Block 18: AI workspace shell
19. Block 19: AI orchestrator and patch executor
20. Block 20: Hardening and launch readiness
