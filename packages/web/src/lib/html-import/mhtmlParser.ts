/**
 * Parse MHTML (Chrome "Save as Single File") to extract HTML content.
 * MHTML is multipart/related; we find the main HTML part.
 */
export function extractHtmlFromMhtml(mhtmlText: string): string | null {
  const boundaryMatch = mhtmlText.match(/boundary="?([^";\s]+)"?/i);
  if (!boundaryMatch) return null;

  const boundary = boundaryMatch[1].trim().replace(/^["']|["']$/g, '');
  const parts = mhtmlText.split(`--${boundary}`);

  for (const part of parts) {
    const headerEnd = part.indexOf('\n\n');
    if (headerEnd === -1) continue;

    const headers = part.slice(0, headerEnd).toLowerCase();
    const body = part.slice(headerEnd + 2).trim();

    const isHtml =
      headers.includes('content-type: text/html') ||
      headers.includes('content-type: text/html;');

    if (isHtml && body.length > 0) {
      return body;
    }
  }

  // Fallback: find first part that looks like HTML
  for (const part of parts) {
    const headerEnd = part.indexOf('\n\n');
    if (headerEnd === -1) continue;
    const body = part.slice(headerEnd + 2).trim();
    if (body.startsWith('<!') || body.startsWith('<html')) {
      return body;
    }
  }

  return null;
}
