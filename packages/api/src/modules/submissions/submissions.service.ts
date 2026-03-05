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
