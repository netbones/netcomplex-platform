import 'server-only';

import { getTenantModule } from '../lib/modules/get-tenant-module';

/**
 * Canonical AI capability key - identifies a specific AI feature in the platform.
 * Each capability is independently toggleable per tenant via the ai-provider
 * module config.
 */
export type AiCapabilityKey =
  | 'ai.disputes.frivolityScreen'
  | 'ai.content.translation'
  | 'ai.content.moderation'
  | 'ai.maintenance.triage';

/** Runtime-iterable list of all AI capability keys. */
export const AI_CAPABILITY_KEYS = [
  'ai.disputes.frivolityScreen',
  'ai.content.translation',
  'ai.content.moderation',
  'ai.maintenance.triage',
] as const;

/** Shape of the ai-provider module's config JSON. */
export interface AiProviderModuleConfig {
  defaultProvider?: 'anthropic' | 'openai' | 'none';
  capabilities?: Partial<Record<AiCapabilityKey, boolean>>;
}

/**
 * Check whether a specific AI capability is enabled for a tenant.
 *
 * Returns true only when:
 *  1. The ai-provider module exists and is enabled for the tenant
 *  2. The module config explicitly sets this capability to true
 */
export async function isAiCapabilityEnabled(
  tenantId: string,
  capability: AiCapabilityKey
): Promise<boolean> {
  const module = await getTenantModule(tenantId, 'ai-provider');
  if (!module?.enabled) return false;
  const config = module.config as AiProviderModuleConfig | null;
  return config?.capabilities?.[capability] === true;
}
