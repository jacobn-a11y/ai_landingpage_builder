export const DomainStatus = {
  Draft: 'Draft',
  PendingDNS: 'PendingDNS',
  Verifying: 'Verifying',
  Active: 'Active',
  Error: 'Error',
} as const;

export type DomainStatus = (typeof DomainStatus)[keyof typeof DomainStatus];

export const EmbedPolicy = {
  Allow: 'allow',
  Deny: 'deny',
} as const;

export type EmbedPolicy = (typeof EmbedPolicy)[keyof typeof EmbedPolicy];

export interface SecurityHeaders {
  hstsEnabled?: boolean;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | null;
}

export const VALID_X_FRAME_OPTIONS = ['DENY', 'SAMEORIGIN', null] as const;
