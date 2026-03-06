/**
 * MHTML Unpacker — Stage 1 of the import pipeline.
 *
 * Parses MHTML multipart format, extracts all resources,
 * decodes encodings, stores assets, rewrites references, sanitizes.
 */

import { storeAsset, type StoredAsset } from '../asset-store.js';
import { decodeQuotedPrintable, decodeQuotedPrintableText } from './quoted-printable.js';
import { sanitizeMhtml, sanitizeCss } from './sanitize-mhtml.js';
import { rewriteHtmlUrls, rewriteCssUrls, normalizeUrl, type UrlMap } from './url-rewrite.js';

// --- Limits ---
const MAX_TOTAL_DECODED_BYTES = 500 * 1024 * 1024; // 500MB
const MAX_PART_DECODED_BYTES = 100 * 1024 * 1024;  // 100MB
const MAX_TOTAL_PARTS = 5000;
const MAX_TOTAL_CSS_BYTES = 10 * 1024 * 1024;      // 10MB
const MAX_TOTAL_ASSETS = 1000;

// --- Types ---

export interface MhtmlPart {
  headers: Map<string, string>;
  body: string;
  contentType: string;
  contentTransferEncoding: string;
  contentLocation?: string;
  contentId?: string;
  charset?: string;
}

export interface ExtractedAsset {
  originalUrl: string;
  storedUrl: string;
  mimeType: string;
  sizeBytes: number;
  assetId: string;
}

export interface ExtractedStylesheet {
  url: string;
  content: string;
}

export interface UnpackedMhtml {
  html: string;
  stylesheets: ExtractedStylesheet[];
  assets: ExtractedAsset[];
  metadata: {
    originalUrl?: string;
    title?: string;
    charset: string;
  };
  warnings: string[];
}

export type ImportErrorCode =
  | 'IMPORT_MHTML_MALFORMED'
  | 'IMPORT_NO_HTML_FOUND'
  | 'IMPORT_DECOMPRESSED_TOO_LARGE'
  | 'IMPORT_TOO_MANY_PARTS'
  | 'IMPORT_TOO_MANY_ASSETS'
  | 'MULTIPLE_HTML_PARTS'
  | 'CHARSET_CONFLICT';

export class ImportError extends Error {
  constructor(
    public code: ImportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

// --- Parser ---

/**
 * Extract the MIME boundary from the Content-Type header.
 */
function extractBoundary(contentTypeHeader: string): string | null {
  const match = contentTypeHeader.match(/boundary\s*=\s*"?([^";]+)"?/i);
  return match ? match[1] : null;
}

/**
 * Parse the top-level MIME headers from MHTML content.
 */
function parseTopHeaders(content: string): { headers: Map<string, string>; bodyStart: number } {
  const headers = new Map<string, string>();

  // Find the header/body separator
  let separatorIndex = content.indexOf('\r\n\r\n');
  let separatorLen = 4;
  if (separatorIndex === -1) {
    separatorIndex = content.indexOf('\n\n');
    separatorLen = 2;
  }
  if (separatorIndex === -1) {
    return { headers, bodyStart: 0 };
  }

  const headerSection = content.substring(0, separatorIndex);
  // Unfold continuation lines (lines starting with whitespace)
  const unfolded = headerSection.replace(/\r?\n[ \t]+/g, ' ');

  for (const line of unfolded.split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const name = line.substring(0, colonIdx).trim().toLowerCase();
      const value = line.substring(colonIdx + 1).trim();
      headers.set(name, value);
    }
  }

  return { headers, bodyStart: separatorIndex + separatorLen };
}

/**
 * Parse per-part headers.
 */
function parsePartHeaders(headerSection: string): Map<string, string> {
  const headers = new Map<string, string>();
  const unfolded = headerSection.replace(/\r?\n[ \t]+/g, ' ');

  for (const line of unfolded.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const name = line.substring(0, colonIdx).trim().toLowerCase();
      const value = line.substring(colonIdx + 1).trim();
      headers.set(name, value);
    }
  }

  return headers;
}

/**
 * Extract charset from a Content-Type header value.
 */
function extractCharset(contentType: string): string | undefined {
  const match = contentType.match(/charset\s*=\s*"?([^";,\s]+)"?/i);
  return match ? match[1] : undefined;
}

/**
 * Extract MIME type from a Content-Type header value.
 */
function extractMimeType(contentType: string): string {
  return contentType.split(';')[0].trim().toLowerCase();
}

/**
 * Split MHTML into parts using the boundary.
 */
function splitParts(body: string, boundary: string): MhtmlPart[] {
  const parts: MhtmlPart[] = [];
  const delimiter = `--${boundary}`;
  const endDelimiter = `--${boundary}--`;

  // Split by boundary
  const segments = body.split(delimiter);

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];

    // Skip the closing boundary
    if (segment.trimStart().startsWith('--')) continue;

    // Find header/body separator in this part
    let sepIdx = segment.indexOf('\r\n\r\n');
    let sepLen = 4;
    if (sepIdx === -1) {
      sepIdx = segment.indexOf('\n\n');
      sepLen = 2;
    }
    if (sepIdx === -1) continue;

    const headerSection = segment.substring(0, sepIdx);
    let partBody = segment.substring(sepIdx + sepLen);

    // Remove trailing CRLF before next boundary
    partBody = partBody.replace(/\r?\n$/, '');

    const headers = parsePartHeaders(headerSection);
    const contentType = headers.get('content-type') || 'application/octet-stream';
    const contentTransferEncoding = (headers.get('content-transfer-encoding') || '7bit').toLowerCase();
    const contentLocation = headers.get('content-location');
    const contentId = headers.get('content-id');
    const charset = extractCharset(contentType);

    parts.push({
      headers,
      body: partBody,
      contentType: extractMimeType(contentType),
      contentTransferEncoding,
      contentLocation: contentLocation ? normalizeUrl(contentLocation) : undefined,
      contentId: contentId ? contentId.replace(/^<|>$/g, '') : undefined,
      charset,
    });

    if (parts.length > MAX_TOTAL_PARTS) {
      throw new ImportError('IMPORT_TOO_MANY_PARTS', `MHTML contains more than ${MAX_TOTAL_PARTS} parts`);
    }
  }

  return parts;
}

/**
 * Decode a part body based on Content-Transfer-Encoding.
 */
async function decodePartBody(part: MhtmlPart): Promise<Buffer> {
  switch (part.contentTransferEncoding) {
    case 'base64':
      return Buffer.from(part.body.replace(/\s/g, ''), 'base64');

    case 'quoted-printable':
      return decodeQuotedPrintable(part.body);

    case '7bit':
    case '8bit':
    case 'binary':
    default:
      return Buffer.from(part.body, 'binary');
  }
}

/**
 * Decode a text part to string with charset handling.
 * Implements charset precedence: BOM > MIME header > HTML meta > UTF-8
 */
async function decodeTextPart(part: MhtmlPart): Promise<{ text: string; charset: string; warnings: string[] }> {
  const warnings: string[] = [];
  const buffer = await decodePartBody(part);

  // Check for BOM
  let bomCharset: string | undefined;
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    bomCharset = 'utf-8';
  } else if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    bomCharset = 'utf-16le';
  } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
    bomCharset = 'utf-16be';
  }

  // Determine charset by precedence
  const headerCharset = part.charset;
  const effectiveCharset = bomCharset || headerCharset || 'utf-8';

  if (bomCharset && headerCharset && bomCharset !== headerCharset.toLowerCase()) {
    warnings.push(`CHARSET_CONFLICT: BOM indicates ${bomCharset}, header says ${headerCharset}`);
  }

  // Decode with appropriate charset
  const normalizedCharset = effectiveCharset.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (normalizedCharset === 'utf-8' || normalizedCharset === 'utf8') {
    return { text: buffer.toString('utf-8'), charset: 'utf-8', warnings };
  }

  try {
    const iconv = await import('iconv-lite');
    if (iconv.encodingExists(effectiveCharset)) {
      return { text: iconv.decode(buffer, effectiveCharset), charset: effectiveCharset, warnings };
    }
  } catch {
    // iconv-lite not available or encoding unsupported
  }

  warnings.push(`Unknown charset "${effectiveCharset}", falling back to UTF-8`);
  return { text: buffer.toString('utf-8'), charset: 'utf-8', warnings };
}

/**
 * Check for HTML meta charset and compare with header charset.
 */
function extractMetaCharset(html: string): string | undefined {
  const match = html.match(/<meta[^>]+charset\s*=\s*["']?([^"';\s>]+)/i)
    || html.match(/<meta[^>]+content\s*=\s*["'][^"']*charset=([^"';\s]+)/i);
  return match ? match[1] : undefined;
}

/**
 * Classify a MIME type into a resource category.
 */
function classifyMimeType(mimeType: string): 'html' | 'css' | 'image' | 'font' | 'svg' | 'discard' | 'other' {
  if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') return 'html';
  if (mimeType === 'text/css') return 'css';
  if (mimeType.startsWith('image/svg')) return 'svg';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('font/') || mimeType === 'application/font-woff' ||
      mimeType === 'application/font-woff2' || mimeType === 'application/x-font-ttf' ||
      mimeType === 'application/vnd.ms-fontobject') return 'font';
  if (mimeType.startsWith('application/javascript') || mimeType === 'text/javascript' ||
      mimeType === 'application/x-javascript') return 'discard';
  return 'other';
}

/**
 * Extract the page title from HTML.
 */
function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : undefined;
}

// --- Main Entry Point ---

/**
 * Unpack an MHTML file: parse multipart, extract and store assets,
 * rewrite references, sanitize HTML.
 */
export async function unpackMhtml(
  mhtmlContent: string | Buffer,
  workspaceId: string,
  options: { mode?: 'primaryOnly' | 'failOnMultiple' } = {},
): Promise<UnpackedMhtml> {
  const content = typeof mhtmlContent === 'string'
    ? mhtmlContent
    : mhtmlContent.toString('binary');

  const warnings: string[] = [];

  // 1. Parse top-level headers
  const { headers: topHeaders, bodyStart } = parseTopHeaders(content);
  const topContentType = topHeaders.get('content-type') || '';
  const boundary = extractBoundary(topContentType);

  if (!boundary) {
    throw new ImportError('IMPORT_MHTML_MALFORMED', 'No MIME boundary found in Content-Type header');
  }

  const body = content.substring(bodyStart);

  // 2. Split into parts
  const parts = splitParts(body, boundary);
  if (parts.length === 0) {
    throw new ImportError('IMPORT_MHTML_MALFORMED', 'No MIME parts found');
  }

  // 3. Classify parts
  const htmlParts: MhtmlPart[] = [];
  const cssParts: MhtmlPart[] = [];
  const assetParts: MhtmlPart[] = [];

  for (const part of parts) {
    const category = classifyMimeType(part.contentType);
    switch (category) {
      case 'html':
        htmlParts.push(part);
        break;
      case 'css':
        cssParts.push(part);
        break;
      case 'image':
      case 'font':
      case 'svg':
      case 'other':
        assetParts.push(part);
        break;
      case 'discard':
        // JavaScript — skip
        break;
    }
  }

  // 4. Handle multiple HTML parts
  if (htmlParts.length === 0) {
    throw new ImportError('IMPORT_NO_HTML_FOUND', 'No HTML document found in MHTML');
  }
  if (htmlParts.length > 1) {
    if (options.mode === 'failOnMultiple') {
      throw new ImportError('MULTIPLE_HTML_PARTS', `Found ${htmlParts.length} HTML parts`);
    }
    warnings.push(`MULTIPLE_HTML_PARTS: Found ${htmlParts.length} HTML parts, using first as primary`);
  }

  const primaryHtml = htmlParts[0];

  // 5. Decode the primary HTML
  const { text: htmlText, charset, warnings: charsetWarnings } = await decodeTextPart(primaryHtml);
  warnings.push(...charsetWarnings);

  // Check HTML meta charset for conflicts
  const metaCharset = extractMetaCharset(htmlText);
  if (metaCharset && primaryHtml.charset && metaCharset.toLowerCase() !== primaryHtml.charset.toLowerCase()) {
    warnings.push(`CHARSET_CONFLICT: HTML meta says ${metaCharset}, MIME header says ${primaryHtml.charset}`);
  }

  // 6. Decode and store CSS parts
  const stylesheets: ExtractedStylesheet[] = [];
  let totalCssBytes = 0;

  for (const cssPart of cssParts) {
    const { text: cssText } = await decodeTextPart(cssPart);
    totalCssBytes += cssText.length;
    if (totalCssBytes > MAX_TOTAL_CSS_BYTES) {
      warnings.push('CSS size limit exceeded, skipping remaining stylesheets');
      break;
    }
    const { css: sanitizedCss, warnings: cssWarnings } = sanitizeCss(cssText);
    warnings.push(...cssWarnings);
    stylesheets.push({
      url: cssPart.contentLocation || '',
      content: sanitizedCss,
    });
  }

  // 7. Decode and store asset parts
  const assets: ExtractedAsset[] = [];
  const urlMap: UrlMap = new Map();
  let totalDecodedBytes = 0;

  for (const assetPart of assetParts) {
    if (assets.length >= MAX_TOTAL_ASSETS) {
      warnings.push(`Asset limit (${MAX_TOTAL_ASSETS}) reached, skipping remaining`);
      break;
    }

    const buffer = await decodePartBody(assetPart);
    totalDecodedBytes += buffer.length;

    if (buffer.length > MAX_PART_DECODED_BYTES) {
      warnings.push(`Skipping oversized part: ${buffer.length} bytes`);
      continue;
    }
    if (totalDecodedBytes > MAX_TOTAL_DECODED_BYTES) {
      throw new ImportError('IMPORT_DECOMPRESSED_TOO_LARGE', `Total decoded content exceeds ${MAX_TOTAL_DECODED_BYTES / 1024 / 1024}MB`);
    }

    try {
      const stored: StoredAsset = await storeAsset(workspaceId, buffer, assetPart.contentType);
      const asset: ExtractedAsset = {
        originalUrl: assetPart.contentLocation || '',
        storedUrl: stored.url,
        mimeType: assetPart.contentType,
        sizeBytes: buffer.length,
        assetId: stored.assetId,
      };
      assets.push(asset);

      // Build URL mapping for rewriting
      if (assetPart.contentLocation) {
        urlMap.set(assetPart.contentLocation, stored.url);
        urlMap.set(normalizeUrl(assetPart.contentLocation), stored.url);
      }
      if (assetPart.contentId) {
        urlMap.set(`cid:${assetPart.contentId}`, stored.url);
      }
    } catch (err) {
      warnings.push(`Failed to store asset: ${(err as Error).message}`);
    }
  }

  // Also add CSS parts to URL map (for <link> references)
  for (const cssPart of cssParts) {
    if (cssPart.contentLocation) {
      // CSS isn't stored as an asset; it's inlined. Map to empty to prevent broken links.
      urlMap.set(cssPart.contentLocation, '');
      urlMap.set(normalizeUrl(cssPart.contentLocation), '');
    }
  }

  // 8. Rewrite URLs in HTML
  const rewrittenHtml = rewriteHtmlUrls(htmlText, urlMap, primaryHtml.contentLocation);

  // 9. Rewrite URLs in CSS stylesheets
  for (const sheet of stylesheets) {
    sheet.content = rewriteCssUrls(sheet.content, urlMap, sheet.url);
  }

  // 10. Sanitize HTML
  const { html: sanitizedHtml, warnings: sanitizeWarnings } = sanitizeMhtml(rewrittenHtml);
  warnings.push(...sanitizeWarnings);

  // 11. Extract metadata
  const title = extractTitle(sanitizedHtml);

  return {
    html: sanitizedHtml,
    stylesheets,
    assets,
    metadata: {
      originalUrl: primaryHtml.contentLocation,
      title,
      charset,
    },
    warnings,
  };
}
