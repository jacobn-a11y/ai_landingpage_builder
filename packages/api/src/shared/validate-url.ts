/**
 * Validates a webhook URL is safe to fetch (not targeting private/internal networks).
 * Prevents SSRF attacks by blocking private IP ranges and non-HTTP(S) schemes.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function isPrivateOrReservedIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  return false;
}

function isPrivateOrReservedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:')) return true; // Link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    return isPrivateOrReservedIpv4(mapped);
  }
  return false;
}

function isPrivateOrReservedIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateOrReservedIpv4(address);
  if (version === 6) return isPrivateOrReservedIpv6(address);
  return false;
}

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

  if (isPrivateOrReservedIp(hostname)) {
    return false;
  }

  // Block metadata endpoints (cloud providers)
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    return false;
  }

  return true;
}

/**
 * Strict URL validation for webhook delivery.
 * Includes DNS lookup checks to prevent hostnames resolving to private/internal IPs.
 */
export async function isSafeWebhookUrlStrict(urlString: string): Promise<boolean> {
  if (!isSafeWebhookUrl(urlString)) return false;

  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (isIP(host)) {
    return !isPrivateOrReservedIp(host);
  }

  try {
    const records = await lookup(host, { all: true, verbatim: true });
    if (!records.length) return false;
    return records.every((record) => !isPrivateOrReservedIp(record.address));
  } catch {
    return false;
  }
}
