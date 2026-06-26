/**
 * Canonical output parser for AI intake screen responses.
 * Wraps JSON.parse() + Zod validation in try/catch, returning safe defaults on any failure.
 *
 * per AI-SPEC §3: AI response is advisory-only — never persisted.
 * Safe defaults ensure the intake wizard never blocks on malformed AI output.
 */
import { intakeScreenOutputSchema, type IntakeScreenOutput } from '@entities/dispute/server';

export { intakeScreenOutputSchema };
export type { IntakeScreenOutput };

const SAFE_DEFAULTS = {
  toneScore: 0,
  issueClarity: 5,
  likelyFrivolous: false,
  suggestedCategory: 'OTHER',
  deEscalationTip: null,
} as const;

/**
 * Parse raw AI response text into a validated IntakeScreenOutput.
 * Returns safe defaults on JSON parse failure or Zod validation failure.
 *
 * @param raw - Raw text from AI provider.complete() result
 */
export function parseIntakeScreenOutput(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    const result = intakeScreenOutputSchema.parse(parsed);
    return result;
  } catch {
    return { ...SAFE_DEFAULTS };
  }
}
