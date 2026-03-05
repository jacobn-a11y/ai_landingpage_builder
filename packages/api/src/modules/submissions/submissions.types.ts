/**
 * Canonical submission payload (PRD 7.5)
 */

export const CANONICAL_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'company',
  'title',
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export interface CanonicalSubmissionPayload {
  // Contact
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  // Custom & consent
  custom_fields?: Record<string, string>;
  consent_fields?: Record<string, boolean>;
  // Page context
  page_id: string;
  page_name?: string;
  page_slug?: string;
  page_url?: string;
  // UTM (utm_page required, derived from slug/name)
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  utm_page: string;
  // Context
  referrer?: string;
  landing_url?: string;
  timestamp?: string;
  user_agent?: string;
}
