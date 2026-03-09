/**
 * Parse MHTML (Chrome "Save as Single File") to extract HTML content.
 * MHTML is multipart/related MIME; we extract the HTML part,
 * decode base64/quoted-printable, detect charset, and inline assets.
 */

/** Represents a single MIME part extracted from MHTML */
interface MimePart {
  headers: Record<string, string>;
  body: string;
  contentType: string;
  encoding: string;
  contentLocation: string;
  contentId: string;
  charset: string;
}

/** Result of MHTML parsing */
export interface MhtmlParseResult {
  html: string;
  assets: Map<string, string>; // location/cid -> data URI
}

/**
 * Decode base64 string to raw bytes, then to text with given charset.
 * Falls back to atob + latin1 if TextDecoder is unavailable.
 */
function decodeBase64(encoded: string, charset: string): string {
  const cleaned = encoded.replace(/\s/g, '');
  try {
    const binaryStr = atob(cleaned);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new TextDecoder(charset || 'utf-8').decode(bytes);
  } catch {
    // Fallback: treat as latin1
    try {
      return atob(cleaned);
    } catch {
      return encoded;
    }
  }
}

/**
 * Decode base64 to a data URI (for binary assets like images).
 */
function decodeBase64ToDataUri(encoded: string, contentType: string): string {
  const cleaned = encoded.replace(/\s/g, '');
  return `data:${contentType};base64,${cleaned}`;
}

/**
 * Decode quoted-printable encoding.
 * Handles soft line breaks (=\r\n) and =XX hex sequences.
 */
function decodeQuotedPrintable(text: string, charset: string): string {
  // Remove soft line breaks
  let decoded = text.replace(/=\r?\n/g, '');
  // Decode =XX hex sequences
  decoded = decoded.replace(/=([0-9A-Fa-f]{2})/g, (_match, hex: string) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // If charset is not utf-8/ascii, attempt re-decode via TextEncoder round-trip
  if (charset && !['utf-8', 'us-ascii', 'ascii', 'iso-8859-1'].includes(charset.toLowerCase())) {
    try {
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      return new TextDecoder(charset).decode(bytes);
    } catch {
      // Fall through with existing decoded string
    }
  }
  return decoded;
}

/**
 * Extract charset from a Content-Type header value.
 */
function extractCharset(contentType: string): string {
  const match = contentType.match(/charset=["']?([^"';\s]+)/i);
  return match ? match[1].trim() : 'utf-8';
}

/**
 * Parse a single MIME part: extract headers and body, decode as needed.
 */
function parseMimePart(raw: string): MimePart | null {
  // Find the blank line separating headers from body.
  // MHTML can use \r\n\r\n or \n\n
  let headerEnd = raw.indexOf('\r\n\r\n');
  let bodyStart = headerEnd + 4;
  if (headerEnd === -1) {
    headerEnd = raw.indexOf('\n\n');
    bodyStart = headerEnd + 2;
  }
  if (headerEnd === -1) return null;

  const headerBlock = raw.slice(0, headerEnd);
  const body = raw.slice(bodyStart);

  // Parse headers (handle continuation lines)
  const headers: Record<string, string> = {};
  const unfolded = headerBlock.replace(/\r?\n[ \t]+/g, ' ');
  for (const line of unfolded.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    headers[key] = value;
  }

  const contentType = headers['content-type'] ?? '';
  const encoding = (headers['content-transfer-encoding'] ?? '').toLowerCase().trim();
  const contentLocation = headers['content-location'] ?? '';
  const contentId = (headers['content-id'] ?? '').replace(/^<|>$/g, '');
  const charset = extractCharset(contentType);

  return {
    headers,
    body: body.trim(),
    contentType: contentType.split(';')[0].trim().toLowerCase(),
    encoding,
    contentLocation,
    contentId,
    charset,
  };
}

/**
 * Decode a MIME part's body based on its Content-Transfer-Encoding.
 */
function decodePartBody(part: MimePart): string {
  if (part.encoding === 'base64') {
    return decodeBase64(part.body, part.charset);
  }
  if (part.encoding === 'quoted-printable') {
    return decodeQuotedPrintable(part.body, part.charset);
  }
  // 7bit, 8bit, binary - return as-is
  return part.body;
}

/**
 * Check if a content type is a binary/image asset type.
 */
function isAssetType(contentType: string): boolean {
  return (
    contentType.startsWith('image/') ||
    contentType.startsWith('font/') ||
    contentType === 'application/octet-stream' ||
    contentType.startsWith('audio/') ||
    contentType.startsWith('video/')
  );
}

/**
 * Rewrite asset references in HTML to use inline data URIs.
 * Replaces src="..." and url(...) references that match known asset locations.
 */
function rewriteAssetReferences(html: string, assets: Map<string, string>): string {
  let result = html;
  for (const [location, dataUri] of assets) {
    if (!location) continue;
    // Replace in src/href attributes
    const escaped = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), dataUri);

    // Also try with cid: prefix
    if (!location.startsWith('cid:')) {
      const cidRef = `cid:${location}`;
      const cidEscaped = cidRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(cidEscaped, 'g'), dataUri);
    }
  }
  return result;
}

/**
 * Extract the MIME boundary from the MHTML headers.
 */
function extractBoundary(mhtmlText: string): string | null {
  const match = mhtmlText.match(/boundary="?([^";\r\n]+)"?/i);
  if (!match) return null;
  return match[1].trim().replace(/^["']|["']$/g, '');
}

/**
 * Parse MHTML and extract HTML with inlined assets.
 * Returns null if no HTML part is found.
 */
export function parseMhtml(mhtmlText: string): MhtmlParseResult | null {
  const boundary = extractBoundary(mhtmlText);
  if (!boundary) return null;

  const parts = mhtmlText.split(`--${boundary}`);
  const parsedParts: MimePart[] = [];

  for (const raw of parts) {
    // Skip preamble and closing boundary
    if (raw.trim() === '' || raw.trim() === '--') continue;
    const parsed = parseMimePart(raw);
    if (parsed) parsedParts.push(parsed);
  }

  if (parsedParts.length === 0) return null;

  // Collect asset parts as data URIs
  const assets = new Map<string, string>();
  let htmlPart: MimePart | null = null;

  for (const part of parsedParts) {
    if (!htmlPart && part.contentType === 'text/html') {
      htmlPart = part;
      continue;
    }

    if (isAssetType(part.contentType)) {
      const dataUri =
        part.encoding === 'base64'
          ? decodeBase64ToDataUri(part.body, part.contentType)
          : `data:${part.contentType};base64,${btoa(part.body)}`;

      if (part.contentLocation) {
        assets.set(part.contentLocation, dataUri);
      }
      if (part.contentId) {
        assets.set(`cid:${part.contentId}`, dataUri);
      }
    } else if (part.contentType === 'text/css') {
      // CSS parts: decode but don't inline as assets
      // They'll be referenced by <link> tags which we skip
    }
  }

  if (!htmlPart) {
    // Fallback: find first part that looks like HTML
    for (const part of parsedParts) {
      const body = decodePartBody(part);
      if (body.includes('<!') || body.includes('<html') || body.includes('<body')) {
        htmlPart = part;
        break;
      }
    }
  }

  if (!htmlPart) return null;

  let html = decodePartBody(htmlPart);
  html = rewriteAssetReferences(html, assets);

  return { html, assets };
}

/**
 * Simple extraction: returns just the HTML string (backward-compatible).
 */
export function extractHtmlFromMhtml(mhtmlText: string): string | null {
  const result = parseMhtml(mhtmlText);
  return result?.html ?? null;
}
