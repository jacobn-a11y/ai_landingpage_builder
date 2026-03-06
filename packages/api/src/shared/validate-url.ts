/**
 * Validates a webhook URL is safe to fetch (not targeting private/internal networks).
 * Prevents SSRF attacks by blocking private IP ranges and non-HTTP(S) schemes.
 */
export function isSafeWebhookUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost variants
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
    return false;
  }

  // Block private IP ranges
  const parts = hostname.split('.').map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    const [a, b] = parts;
    if (a === 10) return false;                          // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return false;   // 172.16.0.0/12
    if (a === 192 && b === 168) return false;             // 192.168.0.0/16
    if (a === 169 && b === 254) return false;             // 169.254.0.0/16 (link-local)
    if (a === 0) return false;                            // 0.0.0.0/8
    if (a === 127) return false;                          // 127.0.0.0/8
  }

  // Block metadata endpoints (cloud providers)
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    return false;
  }

  return true;
}
