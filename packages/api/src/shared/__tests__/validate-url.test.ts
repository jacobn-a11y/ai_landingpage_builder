import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}));

import { lookup } from 'node:dns/promises';
import { isSafeWebhookUrl, isSafeWebhookUrlStrict } from '../validate-url.js';

describe('validate-url', () => {
  const lookupMock = vi.mocked(lookup);

  beforeEach(() => {
    lookupMock.mockReset();
  });

  it('blocks obvious unsafe urls synchronously', () => {
    expect(isSafeWebhookUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeWebhookUrl('http://127.0.0.1/hook')).toBe(false);
    expect(isSafeWebhookUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isSafeWebhookUrl('https://example.com/hook')).toBe(true);
  });

  it('blocks hostnames that resolve to private addresses', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }]);
    await expect(isSafeWebhookUrlStrict('https://webhook.example.com/hook')).resolves.toBe(false);
  });

  it('accepts hostnames that resolve to public addresses', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]);
    await expect(isSafeWebhookUrlStrict('https://webhook.example.com/hook')).resolves.toBe(true);
  });
});
