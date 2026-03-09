export type EditorMetricName =
  | 'editor_page_load_ms'
  | 'editor_autosave_ms'
  | 'editor_undo_ms'
  | 'editor_redo_ms'
  | 'editor_drag_ms'
  | 'editor_save_error'
  | 'editor_save_success';

export interface EditorMetricEvent {
  name: EditorMetricName;
  value?: number;
  at: number;
  tags?: Record<string, string | number | boolean>;
}

export interface WorldClassThresholds {
  pageLoadMsP95: number;
  autosaveMsP95: number;
  undoMsP95: number;
  redoMsP95: number;
  saveErrorRateMax: number;
}

export interface MetricSummary {
  counts: Record<EditorMetricName, number>;
  pageLoadP95Ms: number | null;
  autosaveP95Ms: number | null;
  undoP95Ms: number | null;
  redoP95Ms: number | null;
  saveErrorRate: number;
}

const STORAGE_KEY = 'replica.editor_quality_metrics.v1';
const MAX_EVENTS = 2000;

export const WORLD_CLASS_THRESHOLDS: WorldClassThresholds = {
  pageLoadMsP95: 1500,
  autosaveMsP95: 1200,
  undoMsP95: 100,
  redoMsP95: 100,
  saveErrorRateMax: 0.01,
};

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readRaw(): EditorMetricEvent[] {
  if (!hasWindow()) return [];
  try {
    const json = window.localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((event) =>
      event && typeof event === 'object' && typeof (event as EditorMetricEvent).name === 'string' && typeof (event as EditorMetricEvent).at === 'number'
    ) as EditorMetricEvent[];
  } catch {
    return [];
  }
}

function writeRaw(events: EditorMetricEvent[]): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // Ignore telemetry write failure.
  }
}

function percentile(values: number[], pct: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[idx];
}

function valuesByName(events: EditorMetricEvent[], name: EditorMetricName): number[] {
  return events
    .filter((e) => e.name === name && typeof e.value === 'number')
    .map((e) => e.value as number)
    .filter((v) => Number.isFinite(v) && v >= 0);
}

export function recordEditorMetric(
  name: EditorMetricName,
  value?: number,
  tags?: Record<string, string | number | boolean>
): void {
  const events = readRaw();
  events.push({
    name,
    at: Date.now(),
    ...(typeof value === 'number' ? { value } : {}),
    ...(tags ? { tags } : {}),
  });
  writeRaw(events);
}

export function getEditorMetricEvents(): EditorMetricEvent[] {
  return readRaw();
}

export function clearEditorMetricEvents(): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore clear failure.
  }
}

export function summarizeEditorMetrics(events: EditorMetricEvent[] = getEditorMetricEvents()): MetricSummary {
  const counts: Record<EditorMetricName, number> = {
    editor_page_load_ms: 0,
    editor_autosave_ms: 0,
    editor_undo_ms: 0,
    editor_redo_ms: 0,
    editor_drag_ms: 0,
    editor_save_error: 0,
    editor_save_success: 0,
  };

  events.forEach((event) => {
    counts[event.name] += 1;
  });

  const saveAttempts = counts.editor_save_success + counts.editor_save_error;
  const saveErrorRate = saveAttempts === 0 ? 0 : counts.editor_save_error / saveAttempts;

  return {
    counts,
    pageLoadP95Ms: percentile(valuesByName(events, 'editor_page_load_ms'), 95),
    autosaveP95Ms: percentile(valuesByName(events, 'editor_autosave_ms'), 95),
    undoP95Ms: percentile(valuesByName(events, 'editor_undo_ms'), 95),
    redoP95Ms: percentile(valuesByName(events, 'editor_redo_ms'), 95),
    saveErrorRate,
  };
}

export function evaluateWorldClassScorecard(
  summary: MetricSummary,
  thresholds: WorldClassThresholds = WORLD_CLASS_THRESHOLDS
): {
  pass: boolean;
  checks: {
    pageLoad: boolean;
    autosave: boolean;
    undo: boolean;
    redo: boolean;
    saveErrorRate: boolean;
  };
} {
  const checks = {
    pageLoad: summary.pageLoadP95Ms == null ? true : summary.pageLoadP95Ms <= thresholds.pageLoadMsP95,
    autosave: summary.autosaveP95Ms == null ? true : summary.autosaveP95Ms <= thresholds.autosaveMsP95,
    undo: summary.undoP95Ms == null ? true : summary.undoP95Ms <= thresholds.undoMsP95,
    redo: summary.redoP95Ms == null ? true : summary.redoP95Ms <= thresholds.redoMsP95,
    saveErrorRate: summary.saveErrorRate <= thresholds.saveErrorRateMax,
  };

  return {
    pass: checks.pageLoad && checks.autosave && checks.undo && checks.redo && checks.saveErrorRate,
    checks,
  };
}
