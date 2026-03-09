import { prisma } from '../../shared/db.js';
import type { CanonicalSubmissionPayload } from './submissions.types.js';

export interface ValidateResult {
  ok: boolean;
  error?: string;
  payload?: CanonicalSubmissionPayload;
  page?: { id: string; workspaceId: string; name: string; slug: string; publishConfig: unknown };
}

/**
 * Validate and normalize the submission payload.
 * - page_id must exist and be published (has lastPublishedContentJson)
 * - email is required
 * - utm_page is required (derived from page slug/name if missing)
 */
export async function validateAndNormalizePayload(
  raw: Record<string, unknown>
): Promise<ValidateResult> {
  const pageId = raw.page_id as string | undefined;
  if (!pageId || typeof pageId !== 'string') {
    return { ok: false, error: 'page_id is required' };
  }

  const page = await prisma.page.findFirst({
    where: { id: pageId },
    select: { id: true, workspaceId: true, name: true, slug: true, lastPublishedContentJson: true, publishConfig: true },
  });

  if (!page) {
    return { ok: false, error: 'Page not found' };
  }

  const isPublished = page.lastPublishedContentJson != null;
  if (!isPublished) {
    return { ok: false, error: 'Page is not published' };
  }

  const email = (raw.email as string)?.trim();
  if (!email) {
    return { ok: false, error: 'email is required' };
  }

  const utmPage =
    (raw.utm_page as string)?.trim() ||
    page.name ||
    page.slug ||
    'unknown';

  const payload: CanonicalSubmissionPayload = {
    first_name: (raw.first_name as string)?.trim(),
    last_name: (raw.last_name as string)?.trim(),
    email,
    phone: (raw.phone as string)?.trim(),
    company: (raw.company as string)?.trim(),
    title: (raw.title as string)?.trim(),
    custom_fields: raw.custom_fields as Record<string, string> | undefined,
    consent_fields: raw.consent_fields as Record<string, boolean> | undefined,
    page_id: page.id,
    page_name: page.name,
    page_slug: page.slug,
    page_url: (raw.page_url as string)?.trim(),
    utm_source: (raw.utm_source as string)?.trim(),
    utm_medium: (raw.utm_medium as string)?.trim(),
    utm_campaign: (raw.utm_campaign as string)?.trim(),
    utm_term: (raw.utm_term as string)?.trim(),
    utm_content: (raw.utm_content as string)?.trim(),
    utm_page: utmPage,
    referrer: (raw.referrer as string)?.trim(),
    landing_url: (raw.landing_url as string)?.trim(),
    timestamp: (raw.timestamp as string) || new Date().toISOString(),
    user_agent: (raw.user_agent as string)?.trim(),
  };

  return {
    ok: true,
    payload,
    page: { ...page, publishConfig: page.publishConfig },
  };
}

/**
 * Build submission payload from form field values using field mappings.
 */
export function buildSubmissionPayload(
  formValues: Record<string, string | boolean>,
  fieldMappings: Record<string, string>,
  pageContext: { pageId: string; pageName: string; pageSlug: string },
  utmContext: Record<string, string>,
  meta: { referrer?: string; landingUrl?: string; userAgent?: string }
): CanonicalSubmissionPayload {
  const reverseMap: Record<string, string> = {};
  for (const [canonical, formField] of Object.entries(fieldMappings)) {
    reverseMap[formField] = canonical;
  }

  const payload: CanonicalSubmissionPayload = {
    page_id: pageContext.pageId,
    page_name: pageContext.pageName,
    page_slug: pageContext.pageSlug,
    utm_page: utmContext.utm_page || pageContext.pageSlug || pageContext.pageName || 'unknown',
    email: '',
    timestamp: new Date().toISOString(),
  };

  for (const [formField, value] of Object.entries(formValues)) {
    const canonical = reverseMap[formField] || formField;
    if (typeof value === 'boolean') {
      if (!payload.consent_fields) payload.consent_fields = {};
      payload.consent_fields[canonical] = value;
    } else if (CANONICAL_CONTACT_FIELDS.includes(canonical)) {
      (payload as unknown as Record<string, string>)[canonical] = String(value);
    } else {
      if (!payload.custom_fields) payload.custom_fields = {};
      payload.custom_fields[canonical] = String(value);
    }
  }

  if (!payload.email) {
    payload.email = (formValues.email as string) || (formValues.Email as string) || '';
  }

  Object.assign(payload, utmContext);
  if (meta.referrer) payload.referrer = meta.referrer;
  if (meta.landingUrl) payload.landing_url = meta.landingUrl;
  if (meta.userAgent) payload.user_agent = meta.userAgent;

  return payload;
}

const CANONICAL_CONTACT_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'company',
  'title',
];

// ── Query helpers ──────────────────────────────────────────────────

export interface ListSubmissionsOpts {
  workspaceId: string;
  pageId?: string;
  from?: string; // ISO date
  to?: string;   // ISO date
  page?: number;  // 1-based
  limit?: number; // max 200
}

export async function listSubmissions(opts: ListSubmissionsOpts) {
  const { workspaceId, pageId, from, to } = opts;
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { workspaceId };
  if (pageId) where.pageId = pageId;
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to);
    where.createdAt = createdAt;
  }

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: { page: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.submission.count({ where }),
  ]);

  return { submissions, total, page, limit };
}

export async function getSubmission(id: string, workspaceId: string) {
  return prisma.submission.findFirst({
    where: { id, workspaceId },
    include: { page: { select: { id: true, name: true, slug: true } } },
  });
}

// ── CSV export ─────────────────────────────────────────────────────

const CSV_HEADER_FIELDS = [
  'id', 'created_at', 'page_name', 'page_slug',
  'first_name', 'last_name', 'email', 'phone', 'company', 'title',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_page',
  'page_url', 'referrer', 'landing_url', 'user_agent',
  'delivery_status',
];

export async function exportToCsv(opts: Omit<ListSubmissionsOpts, 'page' | 'limit'>): Promise<string> {
  const where: Record<string, unknown> = { workspaceId: opts.workspaceId };
  if (opts.pageId) where.pageId = opts.pageId;
  if (opts.from || opts.to) {
    const createdAt: Record<string, Date> = {};
    if (opts.from) createdAt.gte = new Date(opts.from);
    if (opts.to) createdAt.lte = new Date(opts.to);
    where.createdAt = createdAt;
  }

  const submissions = await prisma.submission.findMany({
    where,
    include: { page: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10_000,
  });

  // Collect all custom field keys across submissions
  const customKeys = new Set<string>();
  const consentKeys = new Set<string>();
  for (const s of submissions) {
    const p = s.payloadJson as Record<string, unknown>;
    if (p.custom_fields && typeof p.custom_fields === 'object') {
      for (const k of Object.keys(p.custom_fields as object)) customKeys.add(k);
    }
    if (p.consent_fields && typeof p.consent_fields === 'object') {
      for (const k of Object.keys(p.consent_fields as object)) consentKeys.add(k);
    }
  }

  const sortedCustom = [...customKeys].sort();
  const sortedConsent = [...consentKeys].sort();
  const allHeaders = [
    ...CSV_HEADER_FIELDS,
    ...sortedCustom.map((k) => `custom_${k}`),
    ...sortedConsent.map((k) => `consent_${k}`),
  ];

  const rows: string[] = [allHeaders.map(escapeCsv).join(',')];

  for (const s of submissions) {
    const p = s.payloadJson as Record<string, unknown>;
    const custom = (p.custom_fields as Record<string, string>) || {};
    const consent = (p.consent_fields as Record<string, boolean>) || {};

    const vals: string[] = [
      s.id,
      s.createdAt.toISOString(),
      s.page?.name ?? '',
      s.page?.slug ?? '',
      str(p.first_name), str(p.last_name), str(p.email), str(p.phone),
      str(p.company), str(p.title),
      str(p.utm_source), str(p.utm_medium), str(p.utm_campaign),
      str(p.utm_term), str(p.utm_content), str(p.utm_page),
      str(p.page_url), str(p.referrer), str(p.landing_url), str(p.user_agent),
      s.deliveryStatus ?? '',
      ...sortedCustom.map((k) => custom[k] ?? ''),
      ...sortedConsent.map((k) => consent[k] != null ? String(consent[k]) : ''),
    ];
    rows.push(vals.map(escapeCsv).join(','));
  }

  return rows.join('\n');
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v != null ? String(v) : '';
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
