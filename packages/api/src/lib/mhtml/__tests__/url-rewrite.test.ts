import { describe, it, expect } from 'vitest';
import { normalizeUrl, resolveUrl, rewriteHtmlUrls, rewriteCssUrls, rewriteCssImports } from '../url-rewrite.js';

describe('normalizeUrl', () => {
  it('removes fragment from absolute URL', () => {
    expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  it('lowercases scheme and host', () => {
    const result = normalizeUrl('HTTPS://Example.COM/Path');
    expect(result).toMatch(/^https:\/\/example\.com\/Path/);
  });

  it('handles relative URLs by removing fragment', () => {
    expect(normalizeUrl('images/photo.jpg#anchor')).toBe('images/photo.jpg');
  });

  it('returns invalid URLs as-is', () => {
    expect(normalizeUrl('not-a-url')).toBe('not-a-url');
  });
});

describe('resolveUrl', () => {
  it('resolves relative URL against base', () => {
    expect(resolveUrl('images/photo.jpg', 'https://example.com/page/')).toBe(
      'https://example.com/page/images/photo.jpg',
    );
  });

  it('returns absolute URLs unchanged', () => {
    expect(resolveUrl('https://cdn.com/img.png', 'https://example.com/')).toBe(
      'https://cdn.com/img.png',
    );
  });

  it('handles parent directory traversal', () => {
    expect(resolveUrl('../img.png', 'https://example.com/a/b/')).toBe(
      'https://example.com/a/img.png',
    );
  });
});

describe('rewriteHtmlUrls', () => {
  const urlMap = new Map([
    ['https://example.com/logo.png', '/api/v1/assets/ws1/abc123.png'],
    ['https://example.com/style.css', '/api/v1/assets/ws1/def456.css'],
    ['cid:image001@example.com', '/api/v1/assets/ws1/cid789.png'],
  ]);

  it('rewrites src attributes', () => {
    const html = '<img src="https://example.com/logo.png" />';
    const result = rewriteHtmlUrls(html, urlMap);
    expect(result).toContain('/api/v1/assets/ws1/abc123.png');
  });

  it('rewrites href attributes', () => {
    const html = '<link href="https://example.com/style.css" />';
    const result = rewriteHtmlUrls(html, urlMap);
    expect(result).toContain('/api/v1/assets/ws1/def456.css');
  });

  it('preserves unmatched URLs', () => {
    const html = '<img src="https://other.com/unknown.png" />';
    const result = rewriteHtmlUrls(html, urlMap);
    expect(result).toContain('https://other.com/unknown.png');
  });

  it('removes <base> tag and uses its href for resolution', () => {
    const map = new Map([
      ['https://example.com/images/photo.jpg', '/api/v1/assets/ws1/photo.jpg'],
    ]);
    const html = '<base href="https://example.com/"><img src="images/photo.jpg" />';
    const result = rewriteHtmlUrls(html, map);
    expect(result).not.toContain('<base');
    expect(result).toContain('/api/v1/assets/ws1/photo.jpg');
  });

  it('rewrites srcset attributes', () => {
    const map = new Map([
      ['https://example.com/small.jpg', '/assets/small.jpg'],
      ['https://example.com/large.jpg', '/assets/large.jpg'],
    ]);
    const html = '<img srcset="https://example.com/small.jpg 1x, https://example.com/large.jpg 2x" />';
    const result = rewriteHtmlUrls(html, map);
    expect(result).toContain('/assets/small.jpg 1x');
    expect(result).toContain('/assets/large.jpg 2x');
  });

  it('removes meta refresh tags', () => {
    const html = '<meta http-equiv="refresh" content="0;url=evil.com"><div>Content</div>';
    const result = rewriteHtmlUrls(html, new Map());
    expect(result).not.toContain('refresh');
    expect(result).toContain('Content');
  });

  it('rewrites cid: references', () => {
    const html = '<img src="cid:image001@example.com" />';
    const result = rewriteHtmlUrls(html, urlMap);
    expect(result).toContain('/api/v1/assets/ws1/cid789.png');
  });
});

describe('rewriteCssUrls', () => {
  it('rewrites url() references', () => {
    const map = new Map([['https://example.com/bg.jpg', '/assets/bg.jpg']]);
    const css = 'div { background: url("https://example.com/bg.jpg"); }';
    const result = rewriteCssUrls(css, map);
    expect(result).toContain('url("/assets/bg.jpg")');
  });

  it('preserves internal fragment references', () => {
    const css = 'div { fill: url(#gradient); }';
    const result = rewriteCssUrls(css, new Map());
    expect(result).toContain('url(#gradient)');
  });

  it('preserves data URIs', () => {
    const css = 'div { background: url(data:image/png;base64,abc); }';
    const result = rewriteCssUrls(css, new Map());
    expect(result).toContain('data:image/png;base64,abc');
  });
});

describe('rewriteCssImports', () => {
  it('rewrites @import url()', () => {
    const map = new Map([['https://example.com/base.css', '/assets/base.css']]);
    const css = '@import url("https://example.com/base.css");';
    const result = rewriteCssImports(css, map);
    expect(result).toContain('url("/assets/base.css")');
  });
});
