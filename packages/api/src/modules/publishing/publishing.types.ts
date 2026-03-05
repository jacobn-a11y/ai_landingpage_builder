/**
 * Publishing types for Phase 1.
 * publishConfig on Page: domainId?, targetType, path?, status, publishAt?, unpublishAt?
 */

export const PublishTargetType = {
  Demo: 'demo',
  Custom: 'custom',
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
}

export interface RedirectRule {
  from: string;
  to: string;
  status: 301 | 302;
}
