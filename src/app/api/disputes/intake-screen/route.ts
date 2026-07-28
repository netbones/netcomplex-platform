import { apiError, apiInternalError, apiSuccess, db } from '@api/server';
import { getAiProvider, isAiCapabilityEnabled, checkQuota, recordUsage } from '@api/server';
import type { AiCapabilityKey } from '@entities/tenant/server';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { AI_MODELS, rateLimitByUser } from '@api/server';
import { intakeScreenRequestSchema, sanitizeDescriptionForAi } from '@entities/dispute/server';
import { parseIntakeScreenOutput } from '@/shared/lib/dispute/intake-screen-output';
import { requireAuth } from '@/shared/api/auth-utils';

const CAPABILITY: AiCapabilityKey = 'ai.disputes.frivolityScreen';

const INTAKE_SYSTEM_PROMPT = `You are a community dispute intake assistant for a residential community management platform. Assess the following dispute description and return valid JSON. Follow these rules:

1. toneScore: 0 (calm/factual) to 10 (highly emotional/personal attacks)
2. issueClarity: 0 (vague) to 10 (specific, identifiable issue with dates/behaviors)
3. likelyFrivolous: true only if no actionable grievance is identifiable (no specific rule, damage, or obligation mentioned)
4. suggestedCategory: one of "NOISE","PETS","PARKING","BOUNDARIES","COMMON_PROPERTY","LEVY_DISPUTE","RULE_ENFORCEMENT","GOVERNANCE","CONDUCT","DAMAGE","OTHER"
5. deEscalationTip: a constructive, single-sentence tip IF toneScore >= 7; otherwise null. Never use inflammatory or accusatory language. Frame tips around focusing on specific dates, behaviors, and applicable rules.

Return ONLY the JSON object, no markdown, no explanation.`;

export const maxDuration = 15;

export async function POST(request: Request) {
  try {
    // ── 0. Auth ─────────────────────────────────────────────────────
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    // ── 1. Rate limit ───────────────────────────────────────────────
    const rateLimitResult = await rateLimitByUser(auth.data.userId, {
      windowMs: 60_000,
      maxRequests: 5,
    });
    if (rateLimitResult) return rateLimitResult;

    // ── 2. Input validation ─────────────────────────────────────────
    const parsed = intakeScreenRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
    }

    const { description, disputeId } = parsed.data;

    // ── 3. Tenant context ───────────────────────────────────────────
    const { tenantId } = await withTenant();

    // ── 4. Capability check ─────────────────────────────────────────
    if (!(await isAiCapabilityEnabled(tenantId, CAPABILITY))) {
      return apiError(
        'FEATURE_DISABLED',
        'AI intake screening is not enabled for this community.',
        503
      );
    }

    // ── 5. Quota check ──────────────────────────────────────────────
    const quota = await checkQuota(tenantId, CAPABILITY, db);
    if (!quota.allowed) {
      return apiError(
        'FEATURE_DISABLED',
        `AI token quota exhausted (${quota.remainingTokens} remaining). Upgrade or wait until next billing period.`,
        429,
        { code: 'AI_QUOTA_EXHAUSTED', remainingTokens: quota.remainingTokens }
      );
    }

    // ── 6. Get provider ─────────────────────────────────────────────
    const provider = await getAiProvider(tenantId);
    if (!provider.isAvailable()) {
      return apiError('FEATURE_DISABLED', 'AI service temporarily unavailable.', 503);
    }

    // ── 7. Sanitise description (POPIA — strip PII before leaving server) ──
    const sanitised = sanitizeDescriptionForAi(description);

    // ── 8. Call AI ──────────────────────────────────────────────────
    const start = Date.now();
    let result: { text: string; provider: string; tokensUsed: number };
    let success = true;
    let errorCode: string | undefined;

    try {
      const completion = await provider.complete(sanitised, {
        capability: CAPABILITY,
        systemPrompt: INTAKE_SYSTEM_PROMPT,
        maxTokens: 500,
        temperature: 0,
        jsonMode: true,
      });
      result = {
        text: completion.text,
        provider: completion.provider,
        tokensUsed: completion.tokensUsed ?? 0,
      };
    } catch (err) {
      success = false;
      errorCode = err instanceof Error ? err.message.slice(0, 50) : 'UNKNOWN';
      result = { text: '', provider: provider.name, tokensUsed: 0 };
    }

    // ── 9. Record usage (ALWAYS — even on failure) ──────────────────
    const modelId = mapProviderToModel(provider.name);

    await recordUsage(
      {
        tenantId,
        capability: CAPABILITY,
        userId: auth.data.userId,
        referenceId: disputeId,
        provider: result.provider,
        model: modelId,
        inputTokens: estimateInputTokens(sanitised),
        outputTokens: result.tokensUsed ?? 0,
        durationMs: Date.now() - start,
        success,
        errorCode,
      },
      db
    );

    // ── 10. Handle result ───────────────────────────────────────────
    if (!success) {
      logError(
        { component: 'disputes-intake', operation: 'POST', provider: provider.name },
        'AI frivolity screening call failed',
        errorCode
      );
      return apiError(
        'FEATURE_DISABLED',
        'AI screening temporarily unavailable — you may proceed without it.',
        503
      );
    }

    if (!result.text) {
      // Empty response → return safe defaults (never block the user)
      return apiSuccess({
        toneScore: 0,
        issueClarity: 5,
        likelyFrivolous: false,
        suggestedCategory: 'OTHER',
        deEscalationTip: null,
      });
    }

    // Parse and validate AI output with safe-default fallback
    const output = parseIntakeScreenOutput(result.text);

    return apiSuccess({
      toneScore: clamp(output.toneScore, 0, 10),
      issueClarity: clamp(output.issueClarity, 0, 10),
      likelyFrivolous: Boolean(output.likelyFrivolous),
      suggestedCategory: output.suggestedCategory ?? 'OTHER',
      deEscalationTip: output.deEscalationTip ?? null,
    });
  } catch (error) {
    logError(
      { component: 'disputes-intake', operation: 'POST' },
      'Intake screen request failed',
      error
    );
    return apiInternalError();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Rough token estimator — matches translate/route.ts pattern */
function estimateInputTokens(text: string): number {
  return Math.ceil(text.length * 0.27 * 1.2);
}

/** Clamp a value between min and max */
function clamp(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Map provider name to canonical model ID */
function mapProviderToModel(name: string): string {
  if (name === 'anthropic') return AI_MODELS.ANTHROPIC;
  if (name === 'openai') return AI_MODELS.OPENAI;
  return AI_MODELS.DEEPSEEK;
}
