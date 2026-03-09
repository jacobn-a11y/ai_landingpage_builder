import { describe, expect, it } from 'vitest';
import { sanitizeCustomHtml, sanitizeHtml } from '../sanitize-html.js';

describe('api sanitize-html', () => {
  it('sanitizes rich text and strips executable content', () => {
    const input = `<p>Hello <strong>world</strong><script>alert(1)</script><a href="javascript:alert(1)">x</a></p>`;
    const output = sanitizeHtml(input);
    expect(output).toContain('<p>');
    expect(output).toContain('<strong>world</strong>');
    expect(output).not.toContain('<script');
    expect(output).toContain('href="#"');
  });

  it('sanitizes custom html dangerous attributes and url-bearing attrs', () => {
    const input = `
      <div onclick="alert(1)" style="color:red; expression(alert(1))">
        <img src="javascript:alert(1)" srcset="javascript:alert(2) 1x, https://safe.test/a.png 2x" onerror="alert(2)" />
        <a href="https://safe.test" target="_blank">safe</a>
        <form action="javascript:alert(3)"></form>
      </div>
    `;
    const output = sanitizeCustomHtml(input);
    expect(output).not.toContain('onclick=');
    expect(output).not.toContain('onerror=');
    expect(output).not.toContain('javascript:');
    expect(output).toContain('href="https://safe.test"');
    expect(output).toContain('rel="noopener noreferrer"');
    expect(output).not.toContain('expression(');
  });
});
