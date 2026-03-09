/**
 * Import-Safe Render Context for imported Tier A and B blocks.
 *
 * Neutralizes editor chrome styles from leaking into imported content,
 * isolates imported section styles from global editor resets,
 * and preserves normal editor behaviors (selection, drag, duplication, publishing).
 *
 * This is the canonical render environment for imported content in:
 * editor view, preview mode, published output.
 */

import React from 'react';

interface ImportSafeWrapperProps {
  scopeId: string;
  scopedCss?: string;
  children: React.ReactNode;
}

/**
 * Wraps imported blocks in a scoped container that:
 * - Sets data-import-scope for CSS scoping
 * - Defines stable baseline styles
 * - Prevents editor resets from affecting imported content
 */
export function ImportSafeWrapper({ scopeId, scopedCss, children }: ImportSafeWrapperProps) {
  return (
    <div
      data-import-scope={scopeId}
      className="import-safe-wrapper"
      style={{
        // Stable baseline
        boxSizing: 'border-box',
        // Prevent editor typography resets from affecting imported content
        all: 'revert',
        display: 'block',
      }}
    >
      {/* Inject scoped CSS */}
      {scopedCss && (
        <style dangerouslySetInnerHTML={{ __html: scopedCss }} />
      )}
      {children}
    </div>
  );
}

/**
 * Baseline CSS for import-safe wrapper.
 * Include this in the global editor stylesheet.
 */
export const IMPORT_SAFE_BASELINE_CSS = `
.import-safe-wrapper {
  box-sizing: border-box;
  line-height: normal;
  font-family: inherit;
  color: inherit;
}
.import-safe-wrapper *,
.import-safe-wrapper *::before,
.import-safe-wrapper *::after {
  box-sizing: border-box;
}
.import-safe-wrapper h1,
.import-safe-wrapper h2,
.import-safe-wrapper h3,
.import-safe-wrapper h4,
.import-safe-wrapper h5,
.import-safe-wrapper h6 {
  margin: revert;
  padding: revert;
  font-size: revert;
  font-weight: revert;
  line-height: revert;
}
.import-safe-wrapper p,
.import-safe-wrapper ul,
.import-safe-wrapper ol {
  margin: revert;
  padding: revert;
}
.import-safe-wrapper ul,
.import-safe-wrapper ol {
  list-style: revert;
}
.import-safe-wrapper a {
  color: revert;
  text-decoration: revert;
}
.import-safe-wrapper img {
  max-width: 100%;
  height: auto;
}
`;
