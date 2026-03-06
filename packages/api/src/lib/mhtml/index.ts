/**
 * MHTML Import Pipeline — module re-exports.
 */

export { unpackMhtml, ImportError, type UnpackedMhtml, type ImportErrorCode } from './mhtml-unpacker.js';
export { sanitizeMhtml, sanitizeCss } from './sanitize-mhtml.js';
export { rewriteHtmlUrls, rewriteCssUrls, normalizeUrl } from './url-rewrite.js';
export { decodeQuotedPrintable, decodeQuotedPrintableText } from './quoted-printable.js';
export { renderAndCapture, DEFAULT_VIEWPORTS, type RenderResult, type RenderViewport } from './render-harness.js';
export { extractSnapshot, type PageSnapshot, type ElementSnapshot } from './extract-snapshot.js';
export { detectSections, type DetectedSection, type SectionType } from './section-detector.js';
export { detectLayout, detectResponsiveDeltas, type DetectedLayout, type LayoutType } from './layout-detector.js';
export { detectPatterns, type DetectedPattern, type PatternType } from './pattern-detector.js';
export { analyzeSpecialElements, type SpecialElementResult } from './special-elements.js';
export { buildBlocks, type BlockBuildResult, type ImportMeta } from './block-builder.js';
export {
  createScopedFragment, cloneScopedFragment, generateScopeId,
  prefixSelectors, renderScopedStyleTag, type ScopedStyleFragment,
} from './scoped-css.js';
export { validateFidelity, type FidelityReport, type FidelityScore } from './fidelity-validator.js';
