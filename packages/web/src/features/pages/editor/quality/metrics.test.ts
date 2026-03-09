import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearEditorMetricEvents,
  evaluateWorldClassScorecard,
  recordEditorMetric,
  summarizeEditorMetrics,
} from './metrics';

describe('editor quality metrics', () => {
  beforeEach(() => {
    clearEditorMetricEvents();
  });

  it('summarizes p95 latency and save error rate', () => {
    [200, 300, 400, 500, 600].forEach((ms) => {
      recordEditorMetric('editor_page_load_ms', ms);
    });
    [300, 350, 400].forEach((ms) => {
      recordEditorMetric('editor_autosave_ms', ms);
    });
    [25, 35].forEach((ms) => {
      recordEditorMetric('editor_undo_ms', ms);
      recordEditorMetric('editor_redo_ms', ms + 5);
    });
    recordEditorMetric('editor_save_success');
    recordEditorMetric('editor_save_success');
    recordEditorMetric('editor_save_error');

    const summary = summarizeEditorMetrics();
    expect(summary.pageLoadP95Ms).toBe(600);
    expect(summary.autosaveP95Ms).toBe(400);
    expect(summary.undoP95Ms).toBe(35);
    expect(summary.redoP95Ms).toBe(40);
    expect(summary.saveErrorRate).toBeCloseTo(1 / 3, 5);
  });

  it('evaluates pass/fail using thresholds', () => {
    const passing = evaluateWorldClassScorecard({
      counts: {
        editor_page_load_ms: 1,
        editor_autosave_ms: 1,
        editor_undo_ms: 1,
        editor_redo_ms: 1,
        editor_drag_ms: 0,
        editor_save_error: 0,
        editor_save_success: 1,
      },
      pageLoadP95Ms: 1000,
      autosaveP95Ms: 800,
      undoP95Ms: 40,
      redoP95Ms: 40,
      saveErrorRate: 0,
    });
    expect(passing.pass).toBe(true);

    const failing = evaluateWorldClassScorecard({
      counts: {
        editor_page_load_ms: 1,
        editor_autosave_ms: 1,
        editor_undo_ms: 1,
        editor_redo_ms: 1,
        editor_drag_ms: 0,
        editor_save_error: 1,
        editor_save_success: 0,
      },
      pageLoadP95Ms: 2500,
      autosaveP95Ms: 1600,
      undoP95Ms: 120,
      redoP95Ms: 130,
      saveErrorRate: 1,
    });
    expect(failing.pass).toBe(false);
    expect(failing.checks.pageLoad).toBe(false);
    expect(failing.checks.autosave).toBe(false);
    expect(failing.checks.undo).toBe(false);
    expect(failing.checks.redo).toBe(false);
    expect(failing.checks.saveErrorRate).toBe(false);
  });
});
