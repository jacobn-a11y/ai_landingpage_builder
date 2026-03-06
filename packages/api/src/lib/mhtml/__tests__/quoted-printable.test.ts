import { describe, it, expect } from 'vitest';
import { decodeQuotedPrintable, decodeQuotedPrintableText } from '../quoted-printable.js';

describe('decodeQuotedPrintable', () => {
  it('decodes plain ASCII text unchanged', () => {
    const result = decodeQuotedPrintable('Hello World');
    expect(result.toString('utf-8')).toBe('Hello World');
  });

  it('decodes hex-encoded bytes', () => {
    // =C3=A9 is é in UTF-8
    const result = decodeQuotedPrintable('caf=C3=A9');
    expect(result.toString('utf-8')).toBe('café');
  });

  it('removes soft line breaks (=\\r\\n)', () => {
    const result = decodeQuotedPrintable('Hello=\r\n World');
    expect(result.toString('utf-8')).toBe('Hello World');
  });

  it('removes soft line breaks (=\\n)', () => {
    const result = decodeQuotedPrintable('Hello=\n World');
    expect(result.toString('utf-8')).toBe('Hello World');
  });

  it('handles mixed encoded and plain content', () => {
    const result = decodeQuotedPrintable('=3Cdiv=3EHello=3C/div=3E');
    expect(result.toString('utf-8')).toBe('<div>Hello</div>');
  });

  it('passes through equals sign followed by non-hex', () => {
    const result = decodeQuotedPrintable('a=ZZb');
    expect(result.toString('utf-8')).toBe('a=ZZb');
  });
});

describe('decodeQuotedPrintableText', () => {
  it('decodes UTF-8 content', async () => {
    const result = await decodeQuotedPrintableText('caf=C3=A9', 'utf-8');
    expect(result).toBe('café');
  });

  it('defaults to UTF-8 for empty charset', async () => {
    const result = await decodeQuotedPrintableText('Hello', '');
    expect(result).toBe('Hello');
  });
});
