import dns from 'node:dns';

const { resolveTxt, resolveCname, resolveNs } = dns.promises;

const CNAME_TARGET = process.env.CNAME_TARGET ?? 'cname.replicapages.io';

export function getCnameTarget(): string {
  return CNAME_TARGET;
}

export function getVerificationTxtName(hostname: string): string {
  return `_replica-verify.${hostname}`;
}

export interface VerificationResult {
  success: boolean;
  status: 'Active' | 'Error';
  error?: string;
  txtOk: boolean;
  cnameOk: boolean;
  isCloudflare?: boolean;
}

export async function verifyDomain(
  hostname: string,
  expectedTxtValue: string
): Promise<VerificationResult> {
  const txtName = getVerificationTxtName(hostname);
  let txtOk = false;
  let cnameOk = false;
  let isCloudflare = false;

  // 1. Check TXT record
  try {
    const txtRecords = await resolveTxt(txtName);
    const flattened = txtRecords.flat();
    txtOk = flattened.some((v) => v === expectedTxtValue || v === `"${expectedTxtValue}"`);
  } catch {
    txtOk = false;
  }

  // 2. Check CNAME record
  try {
    const cnameRecords = await resolveCname(hostname);
    const target = CNAME_TARGET.endsWith('.')
      ? CNAME_TARGET.slice(0, -1)
      : CNAME_TARGET;
    const normalized = cnameRecords.map((c) =>
      c.endsWith('.') ? c.slice(0, -1) : c
    );
    cnameOk = normalized.some((c) => c.toLowerCase() === target.toLowerCase());
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENODATA' || code === 'ENOTFOUND') {
      cnameOk = false;
    } else {
      cnameOk = false;
    }
  }

  // 3. Conflict detection: we cannot reliably distinguish A vs CNAME via standard resolve;
  // show generic CNAME/A conflict warning in UI when displaying records.

  // 4. Cloudflare detection: check NS records for hostname's zone
  try {
    const parts = hostname.split('.');
    const zone = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;
    const nsRecords = await resolveNs(zone);
    isCloudflare = nsRecords.some(
      (ns) => ns.toLowerCase().includes('cloudflare')
    );
  } catch {
    // Can't determine, assume false
  }

  const success = txtOk && cnameOk;

  const errors: string[] = [];
  if (!txtOk) {
    errors.push(
      `TXT record missing or incorrect: add _replica-verify.${hostname} = "${expectedTxtValue}"`
    );
  }
  if (!cnameOk) {
    errors.push(
      `CNAME record missing or incorrect: add ${hostname} -> ${CNAME_TARGET}`
    );
  }

  return {
    success,
    status: success ? 'Active' : 'Error',
    error: errors.length ? errors.join('; ') : undefined,
    txtOk,
    cnameOk,
    isCloudflare,
  };
}
