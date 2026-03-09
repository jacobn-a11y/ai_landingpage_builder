import dns from 'node:dns';

const { resolveTxt, resolveCname, resolve4 } = dns.promises;

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
  hasConflictingA: boolean;
}

export async function verifyDomain(
  hostname: string,
  expectedTxtValue: string
): Promise<VerificationResult> {
  const txtName = getVerificationTxtName(hostname);
  let txtOk = false;
  let cnameOk = false;
  let hasConflictingA = false;

  // 1. Check TXT record
  try {
    const txtRecords = await resolveTxt(txtName);
    const flattened = txtRecords.flat();
    txtOk = flattened.some(
      (v) => v === expectedTxtValue || v === `"${expectedTxtValue}"`
    );
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
    cnameOk = normalized.some(
      (c) => c.toLowerCase() === target.toLowerCase()
    );
  } catch {
    cnameOk = false;
  }

  // 3. Conflict detection: check for A records that block CNAME
  if (!cnameOk) {
    try {
      const aRecords = await resolve4(hostname);
      hasConflictingA = aRecords.length > 0;
    } catch {
      hasConflictingA = false;
    }
  }

  const success = txtOk && cnameOk;

  const errors: string[] = [];
  if (!txtOk) {
    errors.push(
      `TXT record missing or incorrect: add ${txtName} = "${expectedTxtValue}"`
    );
  }
  if (hasConflictingA) {
    errors.push(
      `A record detected on ${hostname} — remove it before adding a CNAME`
    );
  } else if (!cnameOk) {
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
    hasConflictingA,
  };
}
