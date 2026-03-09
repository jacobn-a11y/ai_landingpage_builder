import { describe, it, expect } from 'vitest';
import { sanitizeMhtml, sanitizeCss } from '../sanitize-mhtml.js';

describe('sanitizeMhtml', () => {
  it('strips <script> tags with content', () => {
    const { html, warnings } = sanitizeMhtml('<div>Hello</div><script>alert("xss")</script><p>World</p>');
    expect(html).not.toContain('script');
    expect(html).not.toContain('alert');
    expect(html).toContain('<div>Hello</div>');
    expect(html).toContain('<p>World</p>');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('strips <iframe> tags with content', () => {
    const { html } = sanitizeMhtml('<iframe src="evil.com">content</iframe>');
    expect(html).not.toContain('iframe');
  });

  it('strips <object> and <embed> tags', () => {
    const { html } = sanitizeMhtml('<object data="x.swf"></object><embed src="y.swf"/>');
    expect(html).not.toContain('object');
    expect(html).not.toContain('embed');
  });

  it('strips <base> tags but keeps children text nearby', () => {
    const { html } = sanitizeMhtml('<base href="https://example.com">');
    expect(html).not.toContain('base');
  });

  it('removes meta refresh', () => {
    const { html } = sanitizeMhtml('<meta http-equiv="refresh" content="0;url=evil.com">');
    expect(html).not.toContain('refresh');
  });

  it('removes vbscript: URLs from src attributes', () => {
    const { html, warnings } = sanitizeMhtml('<img src="vbscript:MsgBox" />');
    expect(html).not.toContain('vbscript:');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('removes javascript: URLs in href', () => {
    const { html, warnings } = sanitizeMhtml('<a href="javascript:alert(1)">Link</a>');
    expect(html).not.toContain('javascript:');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('sanitizes dangerous CSS patterns in <style> tags', () => {
    const { html } = sanitizeMhtml('<style>div { behavior: url(xss.htc); }</style>');
    expect(html).toContain('/* sanitized */');
    expect(html).not.toContain('behavior');
  });

  it('sanitizes CSS expression() in inline styles', () => {
    const { html } = sanitizeMhtml('<div style="width: expression(alert(1))">Hi</div>');
    expect(html).not.toContain('expression');
  });

  it('removes external @import in styles', () => {
    const { html } = sanitizeMhtml('<style>@import url("https://evil.com/steal.css");</style>');
    expect(html).toContain('/* external @import removed */');
  });

  it('preserves safe HTML structure', () => {
    const input = '<div class="hero"><h1>Welcome</h1><p>Hello world</p><img src="photo.jpg" alt="Photo" /></div>';
    const { html } = sanitizeMhtml(input);
    expect(html).toContain('<h1>Welcome</h1>');
    expect(html).toContain('photo.jpg');
  });
});

describe('sanitizeCss', () => {
  it('removes expression() from CSS', () => {
    const { css } = sanitizeCss('div { width: expression(document.body.clientWidth); }');
    expect(css).not.toContain('expression');
    expect(css).toContain('/* sanitized */');
  });

  it('removes -moz-binding', () => {
    const { css } = sanitizeCss('div { -moz-binding: url(xbl.xml); }');
    expect(css).toContain('/* sanitized */');
  });

  it('removes external @import', () => {
    const { css } = sanitizeCss('@import url("https://example.com/styles.css");');
    expect(css).toContain('/* external @import removed */');
  });

  it('preserves safe CSS', () => {
    const input = '.hero { color: red; font-size: 24px; background: linear-gradient(to right, #000, #fff); }';
    const { css, warnings } = sanitizeCss(input);
    expect(css).toBe(input);
    expect(warnings).toHaveLength(0);
  });
});
