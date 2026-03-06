import { describe, it, expect } from 'vitest';
import { prefixSelectors, createScopedFragment, cloneScopedFragment, renderScopedStyleTag } from '../scoped-css.js';

describe('prefixSelectors', () => {
  const scopeId = 'is_test123';

  it('prefixes simple class selector', () => {
    const result = prefixSelectors('.hero { color: red; }', scopeId);
    expect(result).toContain(`[data-import-scope="${scopeId}"] .hero {`);
  });

  it('prefixes element selector', () => {
    const result = prefixSelectors('h1 { font-size: 32px; }', scopeId);
    expect(result).toContain(`[data-import-scope="${scopeId}"] h1 {`);
  });

  it('prefixes multiple selectors (comma-separated)', () => {
    const result = prefixSelectors('.a, .b { color: blue; }', scopeId);
    expect(result).toContain(`[data-import-scope="${scopeId}"] .a`);
    expect(result).toContain(`[data-import-scope="${scopeId}"] .b`);
  });

  it('replaces :root with scope selector', () => {
    const result = prefixSelectors(':root { --color: red; }', scopeId);
    expect(result).toContain(`[data-import-scope="${scopeId}"] {`);
    expect(result).not.toContain(':root');
  });

  it('replaces html/body with scope selector', () => {
    const result = prefixSelectors('body { margin: 0; }', scopeId);
    expect(result).toContain(`[data-import-scope="${scopeId}"] {`);
  });

  it('replaces body followed by descendant selector', () => {
    const result = prefixSelectors('body .content { padding: 10px; }', scopeId);
    expect(result).toContain(`[data-import-scope="${scopeId}"] .content {`);
  });

  it('does not prefix @keyframes content', () => {
    const css = '@keyframes fadeIn {\nfrom { opacity: 0; }\nto { opacity: 1; }\n}';
    const result = prefixSelectors(css, scopeId);
    expect(result).toContain('@keyframes fadeIn');
    expect(result).not.toContain(`[data-import-scope="${scopeId}"] from`);
    expect(result).not.toContain(`[data-import-scope="${scopeId}"] to`);
  });

  it('passes through @media wrapper without prefixing', () => {
    const css = '@media (max-width: 768px) {\n.hero { font-size: 20px; }\n}';
    const result = prefixSelectors(css, scopeId);
    expect(result).toContain('@media (max-width: 768px)');
    expect(result).toContain(`[data-import-scope="${scopeId}"] .hero {`);
  });

  it('preserves CSS properties and values', () => {
    const result = prefixSelectors('.card { background: linear-gradient(to right, #000, #fff); border-radius: 8px; }', scopeId);
    expect(result).toContain('linear-gradient');
    expect(result).toContain('border-radius: 8px');
  });
});

describe('createScopedFragment', () => {
  it('creates a fragment with unique scopeId and fragmentId', () => {
    const fragment = createScopedFragment('block_1', '.hero { color: red; }');
    expect(fragment.scopeId).toMatch(/^is_/);
    expect(fragment.fragmentId).toBeTruthy();
    expect(fragment.ownerBlockId).toBe('block_1');
    expect(fragment.cssText).toContain(`[data-import-scope="${fragment.scopeId}"]`);
  });
});

describe('cloneScopedFragment', () => {
  it('creates a new fragment with different scopeId', () => {
    const original = createScopedFragment('block_1', '.hero { color: red; }');
    const cloned = cloneScopedFragment(original, 'block_2');

    expect(cloned.scopeId).not.toBe(original.scopeId);
    expect(cloned.fragmentId).not.toBe(original.fragmentId);
    expect(cloned.ownerBlockId).toBe('block_2');
    expect(cloned.cssText).toContain(`[data-import-scope="${cloned.scopeId}"]`);
    expect(cloned.cssText).not.toContain(original.scopeId);
  });
});

describe('renderScopedStyleTag', () => {
  it('returns empty string for no fragments', () => {
    expect(renderScopedStyleTag([])).toBe('');
  });

  it('renders combined style tag', () => {
    const fragments = [
      createScopedFragment('block_1', '.a { color: red; }'),
      createScopedFragment('block_2', '.b { color: blue; }'),
    ];
    const result = renderScopedStyleTag(fragments);
    expect(result).toContain('<style data-import-styles="true">');
    expect(result).toContain('scope:');
    expect(result).toContain('</style>');
  });
});
