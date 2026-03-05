export const INTEGRATION_TYPES = ['zapier', 'salesforce', 'webflow'] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export interface ZapierConfig {
  webhookUrl: string;
}
