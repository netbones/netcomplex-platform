import 'server-only';

// Snapshot of provider pricing used for internal cost estimation.
// Update this file when provider pricing changes.
// Last verified: 2026-06-25
// Source: https://www.anthropic.com/pricing  https://openai.com/pricing

export const AI_PRICING_USD_PER_MILLION_TOKENS = {
  anthropic: {
    'claude-haiku-4-5': { input: 0.8, output: 4.0 },
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  },
  openai: {
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4o': { input: 5.0, output: 15.0 },
  },
} as const satisfies Record<string, Record<string, { input: number; output: number }>>;

export type AiProviderName = keyof typeof AI_PRICING_USD_PER_MILLION_TOKENS;

/**
 * Estimate the USD cost of a single AI call.
 * Returns 0 if the provider/model combination is unknown — never throws.
 * Result is an estimate only; do not use for invoicing.
 */
export function estimateCostUSD(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const providerRates = AI_PRICING_USD_PER_MILLION_TOKENS[provider as AiProviderName];
  if (!providerRates) return 0;
  const rates = (providerRates as Record<string, { input: number; output: number } | undefined>)[
    model
  ];
  if (!rates) return 0;
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

// Spot-check: Haiku at 1,000 input + 500 output tokens
// = (1000/1M × 0.80) + (500/1M × 4.00) = 0.000800 + 0.002000 = $0.002800
// Verify: estimateCostUSD('anthropic', 'claude-haiku-4-5', 1000, 500) === 0.00280
