import 'server-only';

/**
 * Canonical AI model identifiers used across provider implementations.
 * Centralized here to avoid hardcoding in individual providers.
 *
 * per R17: Model IDs are configuration, not code. Change here to switch
 * models across the entire platform without modifying provider files.
 */
export const AI_MODELS = {
  /** Anthropic: claude-haiku-4-5-20241022 (lightweight, fast) */
  ANTHROPIC: 'claude-haiku-4-5-20241022',
  /** OpenAI: gpt-4o-mini (cost-effective) */
  OPENAI: 'gpt-4o-mini',
  /** DeepSeek: deepseek-chat (compatible with OpenAI SDK) */
  DEEPSEEK: 'deepseek-chat',
} as const;

/** Type for model ID values */
export type ModelId = (typeof AI_MODELS)[keyof typeof AI_MODELS];
