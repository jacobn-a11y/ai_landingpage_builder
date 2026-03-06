/**
 * Scoped CSS — selector prefixing and per-page stylesheet management.
 *
 * For Tier A and B blocks, CSS selectors are rewritten to be scoped
 * under a unique [data-import-scope="..."] attribute.
 */

import { randomUUID } from 'crypto';

// --- Types ---

export interface ScopedStyleFragment {
  fragmentId: string;
  scopeId: string;
  ownerBlockId: string;
  cssText: string;
}

// --- Scope ID Generation ---

/**
 * Generate a unique scope ID for a block.
 */
export function generateScopeId(): string {
  return `is_${randomUUID().slice(0, 12)}`;
}

// --- CSS Selector Rewriting ---

/**
 * Prefix all CSS selectors in a stylesheet with a scope attribute selector.
 *
 * Given scopeId "is_abc123", transforms:
 *   .hero { color: red }
 * into:
 *   [data-import-scope="is_abc123"] .hero { color: red }
 *
 * Handles:
 * - Simple selectors: .class, #id, element
 * - Compound selectors: .a .b, .a > .b
 * - Multiple selectors: .a, .b { ... }
 * - Media queries: @media (...) { .a { ... } }
 * - Keyframes: @keyframes are left unprefixed (they're global but namespaced)
 */
export function prefixSelectors(css: string, scopeId: string): string {
  const scopeSelector = `[data-import-scope="${scopeId}"]`;

  // Track nesting for @media and other at-rules
  let result = '';
  let inKeyframes = false;
  let braceDepth = 0;

  // Process the CSS in chunks: split by rule boundaries
  // Simple regex-based approach that handles most common patterns
  const lines = css.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Track @keyframes blocks (don't prefix their content)
    if (/@keyframes\s/i.test(trimmed)) {
      inKeyframes = true;
      result += line + '\n';
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      continue;
    }

    if (inKeyframes) {
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      result += line + '\n';
      if (braceDepth <= 0) {
        inKeyframes = false;
        braceDepth = 0;
      }
      continue;
    }

    // Skip @-rules that aren't media queries (font-face, charset, etc.)
    if (/^@(?!media)/i.test(trimmed) && !trimmed.includes('{')) {
      result += line + '\n';
      continue;
    }

    // Handle @media queries — prefix selectors inside
    if (/^@media/i.test(trimmed)) {
      result += line + '\n';
      continue;
    }

    // Skip closing braces and empty lines
    if (trimmed === '}' || trimmed === '') {
      result += line + '\n';
      continue;
    }

    // Check if this line contains a selector (has { but isn't just a property)
    if (trimmed.includes('{') && !trimmed.startsWith('/*')) {
      const braceIdx = trimmed.indexOf('{');
      const selectorPart = trimmed.substring(0, braceIdx).trim();
      const rest = trimmed.substring(braceIdx);

      if (selectorPart) {
        // Split by comma for multiple selectors
        const selectors = selectorPart.split(',').map((s) => s.trim());
        const prefixed = selectors
          .map((sel) => {
            // Don't prefix :root, html, body — replace with scope selector
            if (/^(:root|html|body)$/i.test(sel)) {
              return scopeSelector;
            }
            if (/^(:root|html|body)\s/i.test(sel)) {
              return sel.replace(/^(:root|html|body)\s/i, `${scopeSelector} `);
            }
            return `${scopeSelector} ${sel}`;
          })
          .join(', ');

        result += `${prefixed} ${rest}\n`;
        continue;
      }
    }

    // Pass through other lines (properties, comments)
    result += line + '\n';
  }

  return result;
}

/**
 * Create a scoped style fragment for a block.
 */
export function createScopedFragment(
  ownerBlockId: string,
  css: string,
): ScopedStyleFragment {
  const scopeId = generateScopeId();
  const prefixedCss = prefixSelectors(css, scopeId);

  return {
    fragmentId: randomUUID(),
    scopeId,
    ownerBlockId,
    cssText: prefixedCss,
  };
}

/**
 * Clone a scoped fragment for block duplication (new scope ID).
 */
export function cloneScopedFragment(
  original: ScopedStyleFragment,
  newOwnerBlockId: string,
): ScopedStyleFragment {
  const newScopeId = generateScopeId();
  // Re-prefix with new scope ID
  const unprefixed = original.cssText.replace(
    new RegExp(`\\[data-import-scope="${original.scopeId}"\\]`, 'g'),
    `[data-import-scope="${newScopeId}"]`,
  );

  return {
    fragmentId: randomUUID(),
    scopeId: newScopeId,
    ownerBlockId: newOwnerBlockId,
    cssText: unprefixed,
  };
}

/**
 * Render scoped CSS fragments as a <style> tag string for injection.
 * Deterministic ordering by fragment creation order.
 */
export function renderScopedStyleTag(fragments: ScopedStyleFragment[]): string {
  if (fragments.length === 0) return '';
  const combined = fragments.map((f) => `/* scope: ${f.scopeId} */\n${f.cssText}`).join('\n');
  return `<style data-import-styles="true">\n${combined}\n</style>`;
}
