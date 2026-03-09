import {
  evaluateWorldClassScorecard,
  type MetricSummary,
  WORLD_CLASS_THRESHOLDS,
} from './metrics';
import type { QualityIssue } from './validator';

export interface LaunchGateStatus {
  id: string;
  label: string;
  blocking: boolean;
  pass: boolean;
  detail: string;
}

export interface LaunchReadiness {
  pass: boolean;
  gates: LaunchGateStatus[];
}

export function evaluateLaunchReadiness(
  summary: MetricSummary,
  qualityIssues: QualityIssue[]
): LaunchReadiness {
  const scorecard = evaluateWorldClassScorecard(summary, WORLD_CLASS_THRESHOLDS);
  const blockingQuality = qualityIssues.filter((issue) => issue.severity === 'error');
  const securityIssues = qualityIssues.filter((issue) =>
    issue.id.startsWith('html-unsafe-') ||
    issue.id.startsWith('btn-link-') ||
    issue.id.startsWith('form-redirect-unsafe-')
  );

  const gates: LaunchGateStatus[] = [
    {
      id: 'performance',
      label: 'Performance thresholds',
      blocking: false,
      pass: scorecard.checks.pageLoad && scorecard.checks.autosave && scorecard.checks.undo && scorecard.checks.redo,
      detail: `Load≤${WORLD_CLASS_THRESHOLDS.pageLoadMsP95}ms, autosave≤${WORLD_CLASS_THRESHOLDS.autosaveMsP95}ms, undo/redo≤${WORLD_CLASS_THRESHOLDS.undoMsP95}ms p95`,
    },
    {
      id: 'stability',
      label: 'Stability threshold',
      blocking: true,
      pass: scorecard.checks.saveErrorRate,
      detail: `Autosave error rate ≤ ${(WORLD_CLASS_THRESHOLDS.saveErrorRateMax * 100).toFixed(1)}%`,
    },
    {
      id: 'content',
      label: 'Blocking quality issues',
      blocking: true,
      pass: blockingQuality.length === 0,
      detail: blockingQuality.length === 0 ? 'No blocking editor issues detected.' : `${blockingQuality.length} blocking issue(s) remain.`,
    },
    {
      id: 'security',
      label: 'Security checks',
      blocking: true,
      pass: securityIssues.length === 0,
      detail: securityIssues.length === 0 ? 'No unsafe publish-time links/markup detected.' : `${securityIssues.length} security-related issue(s) detected.`,
    },
  ];

  const blockingFailed = gates.some((gate) => gate.blocking && !gate.pass);
  return {
    pass: !blockingFailed,
    gates,
  };
}
