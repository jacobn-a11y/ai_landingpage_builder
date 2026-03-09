/**
 * Publishing types: targets, statuses, configs, and redirect rules.
 * publishConfig on Page: domainId?, targetType, path?, status, publishAt?, unpublishAt?
 */

export const PublishTargetType = {
  Demo: 'demo',
  Custom: 'custom',
  WebflowSubdomain: 'webflow_subdomain',
} as const;

export type PublishTargetType = (typeof PublishTargetType)[keyof typeof PublishTargetType];

export const PublishStatus = {
  Draft: 'draft',
  Published: 'published',
  Scheduled: 'scheduled',
} as const;

export type PublishStatus = (typeof PublishStatus)[keyof typeof PublishStatus];

export interface PublishConfig {
  domainId?: string;
  targetType?: PublishTargetType;
  path?: string;
  status?: PublishStatus;
  publishAt?: string; // ISO date
  unpublishAt?: string; // ISO date
  isPublished?: boolean;
  publishedAt?: string; // ISO date
  /** Webflow integration ID (references Integration table) */
  webflowIntegrationId?: string;
  /** Webflow subdomain, e.g. "mysite" -> mysite.webflow.io */
  webflowSubdomain?: string;
  /** Webflow site ID from API */
  webflowSiteId?: string;
  /** Webflow page ID (set after first publish) */
  webflowPageId?: string;
}

export interface RedirectRule {
  from: string;
  to: string;
  status: 301 | 302;
}

export interface ScheduleConfig {
  publishAt?: string;  // ISO date
  unpublishAt?: string; // ISO date
  targetType?: PublishTargetType;
  domainId?: string;
  path?: string;
  webflowIntegrationId?: string;
  webflowSubdomain?: string;
}
