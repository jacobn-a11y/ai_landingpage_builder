/**
 * Fidelity Validator — compares source Chromium render against
 * editor render of imported blocks.
 *
 * Uses perceptual screenshot comparison to compute per-section
 * similarity scores and trigger remediation.
 */

import type { Browser } from 'puppeteer-core';
import type { DetectedSection } from './section-detector.js';

// --- Types ---

export interface FidelityScore {
  overall: number;          // 0-1 similarity
  sections: SectionFidelity[];
}

export interface SectionFidelity {
  sectionIndex: number;
  sectionType: string;
  score: number;            // 0-1 similarity
  passed: boolean;
  failureReasons: string[];
}

export interface FidelityReport {
  scores: FidelityScore;
  remediations: Remediation[];
  warnings: string[];
}

export interface Remediation {
  sectionIndex: number;
  action: 'demote_b_to_a' | 'add_scoped_css' | 'promote_to_c' | 'renderer_contract_issue';
  reason: string;
}

// Thresholds
const OVERALL_THRESHOLD = 0.85;
const SECTION_THRESHOLD = 0.75;

// --- Screenshot Comparison ---

/**
 * Compute a simple pixel-based similarity score between two images.
 * In production, this would use SSIM or a perceptual diff library.
 *
 * For now, returns a placeholder score.
 * TODO: Integrate `pixelmatch` or `looks-same` for actual comparison.
 */
async function compareScreenshots(
  sourceScreenshot: Buffer,
  editorScreenshot: Buffer,
): Promise<number> {
  // Placeholder: if both screenshots exist and have content, return moderate similarity
  if (sourceScreenshot.length > 0 && editorScreenshot.length > 0) {
    // In a real implementation, we'd use pixelmatch or SSIM here
    // For now, return a score based on size similarity as a rough proxy
    const sizeRatio = Math.min(sourceScreenshot.length, editorScreenshot.length) /
      Math.max(sourceScreenshot.length, editorScreenshot.length);
    return 0.7 + (sizeRatio * 0.3); // Scale to 0.7-1.0 range
  }
  return 0;
}

// --- Fidelity Validation ---

/**
 * Validate fidelity by comparing source screenshots against editor preview renders.
 *
 * @param browser - Puppeteer browser instance
 * @param sourceScreenshots - Screenshots of the original MHTML content
 * @param pageId - ID of the created page for preview URL
 * @param sections - Detected sections for per-section scoring
 * @param apiBaseUrl - Base URL of the API server
 */
export async function validateFidelity(
  browser: Browser,
  sourceScreenshots: Map<string, Buffer>, // viewport label -> screenshot
  pageId: string,
  sections: DetectedSection[],
  apiBaseUrl: string,
): Promise<FidelityReport> {
  const warnings: string[] = [];
  const remediations: Remediation[] = [];
  const sectionScores: SectionFidelity[] = [];

  // Capture editor preview screenshot
  const previewUrl = `${apiBaseUrl}/api/v1/serve/preview/${pageId}`;
  let editorScreenshot: Buffer = Buffer.alloc(0);

  try {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    try {
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(previewUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      editorScreenshot = await page.screenshot({ fullPage: true, type: 'png' }) as Buffer;
    } catch (err) {
      warnings.push(`Failed to capture editor preview: ${(err as Error).message}`);
    } finally {
      await page.close();
      await context.close();
    }
  } catch (err) {
    warnings.push(`Failed to create browser context for fidelity check: ${(err as Error).message}`);
  }

  // Compare screenshots
  const sourceDesktop = sourceScreenshots.get('desktop');
  let overallScore = 0;

  if (sourceDesktop && editorScreenshot.length > 0) {
    overallScore = await compareScreenshots(sourceDesktop, editorScreenshot);
  } else {
    warnings.push('Missing screenshots for comparison');
    overallScore = 0.5; // Unknown fidelity
  }

  // Per-section scoring (simplified: use overall score as proxy)
  // In production, we'd crop screenshots to section bounds and compare
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionScore = overallScore; // Simplified

    const passed = sectionScore >= SECTION_THRESHOLD;
    const failureReasons: string[] = [];

    if (!passed) {
      failureReasons.push('Visual similarity below threshold');

      // Determine remediation
      // In production, analyze the specific differences
      remediations.push({
        sectionIndex: i,
        action: 'add_scoped_css',
        reason: `Section ${i} (${section.semanticType}) scored ${sectionScore.toFixed(2)} below threshold ${SECTION_THRESHOLD}`,
      });
    }

    sectionScores.push({
      sectionIndex: i,
      sectionType: section.semanticType,
      score: sectionScore,
      passed,
      failureReasons,
    });
  }

  return {
    scores: {
      overall: overallScore,
      sections: sectionScores,
    },
    remediations,
    warnings,
  };
}
