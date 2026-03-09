import { describe, expect, it } from 'vitest';
import { evaluateLaunchReadiness } from './launch-gates';
import type { MetricSummary } from './metrics';

function baseSummary(): MetricSummary {
  return {
    counts: {
      editor_page_load_ms: 10,
      editor_autosave_ms: 10,
      editor_undo_ms: 10,
      editor_redo_ms: 10,
      editor_drag_ms: 10,
      editor_save_error: 0,
      editor_save_success: 10,
    },
    pageLoadP95Ms: 1200,
    autosaveP95Ms: 800,
    undoP95Ms: 40,
    redoP95Ms: 45,
    saveErrorRate: 0,
  };
}

describe('launch gate evaluation', () => {
  it('passes when blocking gates pass', () => {
    const readiness = evaluateLaunchReadiness(baseSummary(), []);
    expect(readiness.pass).toBe(true);
    expect(readiness.gates.some((gate) => gate.blocking && !gate.pass)).toBe(false);
  });

  it('fails when blocking quality/security gates fail', () => {
    const readiness = evaluateLaunchReadiness(baseSummary(), [
      { id: 'btn-link-b1', severity: 'error', message: 'unsafe link', blockId: 'b1' },
    ]);
    expect(readiness.pass).toBe(false);
    expect(readiness.gates.find((gate) => gate.id === 'security')?.pass).toBe(false);
    expect(readiness.gates.find((gate) => gate.id === 'content')?.pass).toBe(false);
  });

  it('keeps launch pass when only non-blocking performance gate fails', () => {
    const slowSummary = {
      ...baseSummary(),
      pageLoadP95Ms: 4000,
      autosaveP95Ms: 3000,
      undoP95Ms: 300,
      redoP95Ms: 300,
    };
    const readiness = evaluateLaunchReadiness(slowSummary, []);
    expect(readiness.gates.find((gate) => gate.id === 'performance')?.pass).toBe(false);
    expect(readiness.pass).toBe(true);
  });
});
