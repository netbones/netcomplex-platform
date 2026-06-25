import 'server-only';

import { getTenantModule } from '@entities/tenant/server';

// ── Types ──────────────────────────────────────────────────────────────

export interface AiCompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
}

export interface AiCompletionResult {
  text: string;
  provider: 'anthropic' | 'openai' | 'deepseek' | 'null';
  tokensUsed?: number;
}

export interface AiProvider {
  readonly name: 'anthropic' | 'openai' | 'deepseek' | 'null';
  complete(userPrompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult>;
  isAvailable(): boolean;
}

// ── Pool-Backed Factory ─────────────────────────────────────────────────

import { NullProvider } from './null-provider';
import { AnthropicProvider } from './anthropic';
import { OpenAiProvider } from './openai';

/**
 * Platform pool configuration — reads platform-level env vars.
 * Never reads tenant settings. Keys are never logged or serialized.
 * per ADVISORY-017-SUPPLEMENTAL-2 §5: Platform pool only.
 * per D-G5: No tenant key lookup. No encryption. No Setting table reads.
 */
export function getPoolProviderConfig(): {
  defaultProvider: 'anthropic' | 'openai';
  anthropicKey: string;
  openaiKey: string;
} | null {
  const anthropicKey = process.env.PLATFORM_ANTHROPIC_KEY;
  const openaiKey = process.env.PLATFORM_OPENAI_KEY;

  if (!anthropicKey && !openaiKey) return null;

  const defaultKey = process.env.PLATFORM_AI_DEFAULT_PROVIDER ?? 'anthropic';
  const defaultProvider: 'anthropic' | 'openai' = defaultKey === 'openai' ? 'openai' : 'anthropic';

  return {
    defaultProvider,
    anthropicKey: anthropicKey ?? '',
    openaiKey: openaiKey ?? '',
  };
}

/**
 * Return the configured AiProvider for a tenant.
 *
 * Returns NullProvider when:
 *   - ai-provider module is absent or disabled for the tenant
 *   - No platform keys are configured
 *
 * Otherwise returns AnthropicProvider or OpenAiProvider based on
 * PLATFORM_AI_DEFAULT_PROVIDER (defaults to 'anthropic').
 */
export async function getAiProvider(tenantId: string): Promise<AiProvider> {
  const module = await getTenantModule(tenantId, 'ai-provider');
  if (!module?.enabled) return new NullProvider();

  const config = getPoolProviderConfig();
  if (!config) return new NullProvider();

  return config.defaultProvider === 'openai'
    ? new OpenAiProvider(config.openaiKey)
    : new AnthropicProvider(config.anthropicKey);
}
