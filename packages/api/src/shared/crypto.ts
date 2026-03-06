import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY env must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv + authTag + ciphertext)
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(encoded: string): string {
  const key = getKey();
  const data = Buffer.from(encoded, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

/**
 * Try to decrypt; if it fails (e.g. legacy plain JSON), return the raw string.
 * This allows graceful migration from unencrypted to encrypted config.
 */
export function decryptOrFallback(value: string): string {
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}
