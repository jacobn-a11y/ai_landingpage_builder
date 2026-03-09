import { describe, expect, it } from 'vitest';
import { sanitizeCustomHtml, sanitizeHtml } from './sanitize-html';

describe('web sanitize-html', () => {
  it('removes dangerous rich text content while keeping formatting', () => {
    const output = sanitizeHtml('<p>Hi <em>there</em><a href="javascript:alert(1)">x</a></p>');
    expect(output).toContain('<p>');
    expect(output).toContain('<em>there</em>');
    expect(output).not.toContain('javascript:');
    expect(output).toContain('href="#"');
  });

  it('strips unsafe custom html attributes and keeps safe url attrs', () => {
    const output = sanitizeCustomHtml(`
      <div onmouseover="alert(1)">
        <img src="https://cdn.example.com/a.png" onerror="alert(1)" />
        <a href="https://example.com" target="_blank">ok</a>
        <iframe src="https://www.youtube.com/embed/abc123"></iframe>
      </div>
    `);
    expect(output).not.toContain('onmouseover=');
    expect(output).not.toContain('onerror=');
    expect(output).toContain('href="https://example.com"');
    expect(output).toContain('rel="noopener noreferrer"');
    expect(output).toContain('sandbox="allow-scripts allow-same-origin allow-popups allow-forms"');
  });
});
