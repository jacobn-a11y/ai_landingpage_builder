/**
 * Quoted-Printable decoder (RFC 2045).
 * Handles soft line breaks (=\r\n / =\n) and hex-encoded bytes (=XX).
 */

/**
 * Decode a quoted-printable encoded string to a Buffer.
 */
export function decodeQuotedPrintable(input: string): Buffer {
  // Remove soft line breaks (= followed by CRLF or LF)
  let normalized = input.replace(/=\r\n/g, '').replace(/=\n/g, '');

  const bytes: number[] = [];
  let i = 0;

  while (i < normalized.length) {
    if (normalized[i] === '=' && i + 2 < normalized.length) {
      const hex = normalized.substring(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 3;
        continue;
      }
    }
    bytes.push(normalized.charCodeAt(i));
    i++;
  }

  return Buffer.from(bytes);
}

/**
 * Decode a quoted-printable string to a UTF-8 string,
 * optionally handling a specified charset via iconv-lite.
 */
export async function decodeQuotedPrintableText(
  input: string,
  charset: string = 'utf-8',
): Promise<string> {
  const buffer = decodeQuotedPrintable(input);

  const normalizedCharset = charset.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalizedCharset === 'utf8' || normalizedCharset === 'utf-8' || normalizedCharset === '') {
    return buffer.toString('utf-8');
  }

  // Use iconv-lite for non-UTF-8 charsets
  const iconv = await import('iconv-lite');
  if (iconv.encodingExists(charset)) {
    return iconv.decode(buffer, charset);
  }

  // Fallback to UTF-8
  console.warn(`[mhtml] Unknown charset "${charset}", falling back to UTF-8`);
  return buffer.toString('utf-8');
}
