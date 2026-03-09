# Editor Launch Runbook

Date: March 9, 2026
Branch: `codex/world-class-editor-roadmap`

## Purpose

Operational checklist for Block 20 launch readiness: regression suites, performance checks, rollout controls, and rollback procedure.

## 1) Preflight

1. Confirm branch: `git rev-parse --abbrev-ref HEAD` must be `codex/world-class-editor-roadmap`.
2. Install deps: `npm install` at repo root.
3. Ensure API + web test environments are green before editor-specific checks.

## 2) Regression Suites (Required)

Run in this order:

1. API security regression
```bash
npm run -w @replica-pages/api test -- src/lib/__tests__/sanitize-html.test.ts src/shared/__tests__/validate-url.test.ts
```

2. Web editor schema + AI + guardrails regression
```bash
npm run -w @replica-pages/web test -- \
  src/features/pages/editor/types.test.ts \
  src/features/pages/editor/ai-command-router.test.ts \
  src/features/pages/editor/quality/metrics.test.ts \
  src/features/pages/editor/quality/validator.test.ts \
  src/features/pages/editor/quality/launch-gates.test.ts \
  src/features/pages/editor/editor-components-smoke.test.tsx \
  src/lib/sanitize-html.test.ts
```

3. Editor build/test gate
```bash
npm run -w @replica-pages/web test -- src/features/pages/editor/types.test.ts src/features/pages/editor/ai-command-router.test.ts src/features/pages/editor/quality/metrics.test.ts src/features/pages/editor/quality/validator.test.ts src/features/pages/editor/quality/launch-gates.test.ts src/features/pages/editor/editor-components-smoke.test.tsx
```

## 3) Performance + Interaction Runbook (Required)

Run against staging build with realistic pages (>=100 blocks):

1. Open editor page and perform 10 cycles each of selection, drag, resize, nudge, undo/redo.
2. Inspect telemetry summary from local storage key `replica.editor_quality_metrics.v1`.
3. Validate p95 thresholds:
- `editor_page_load_ms <= 1500`
- `editor_autosave_ms <= 1200`
- `editor_undo_ms <= 100`
- `editor_redo_ms <= 100`
- save error rate <= 1%
4. Confirm publish dialog launch gates show PASS for all blocking gates.

Note:
- Full workspace `npm run -w @replica-pages/web lint` currently reports unrelated pre-existing type debt outside the editor roadmap scope. Do not use that as the editor launch blocker for this branch.

## 4) Publish Safety Checks (Required)

1. Add known invalid content (unsafe URL, empty button CTA, overlapping blocks).
2. Confirm guardrails surface issues in page settings panel.
3. Confirm publish button is blocked when launch blocking is enabled.
4. Resolve issues and confirm publish unblocks.

## 5) Rollout Controls

The following env flags are supported (web app):

- `VITE_EDITOR_ENFORCE_LAUNCH_BLOCKING` (default: `true`)
- `VITE_EDITOR_AI_WORKSPACE_ENABLED` (default: `true`)
- `VITE_EDITOR_SHOW_LAUNCH_GATES` (default: `true`)
- `VITE_EDITOR_SHOW_QUALITY_GUARDRAILS` (default: `true`)

Suggested staged rollout:

1. Internal: all flags enabled.
2. Beta: AI workspace optional (`VITE_EDITOR_AI_WORKSPACE_ENABLED=true`), blocking enabled.
3. Emergency fallback: disable blocking gate temporarily (`VITE_EDITOR_ENFORCE_LAUNCH_BLOCKING=false`) while keeping guardrails visible.

## 6) Rollback Plan

1. If launch-gate regressions appear, set `VITE_EDITOR_ENFORCE_LAUNCH_BLOCKING=false` while preserving warnings.
2. If AI workspace causes instability, set `VITE_EDITOR_AI_WORKSPACE_ENABLED=false`.
3. Re-run Section 2 regressions after hotfix.
4. Only re-enable flags after all blocking gates pass.

## 7) Release Exit Criteria

Launch is approved only when:

1. Regression suites in Section 2 are green.
2. Performance runbook thresholds are satisfied.
3. Launch gates show no blocking failures.
4. Rollback toggles are verified in staging.
