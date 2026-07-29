import { z } from 'zod';
import { apiError, apiInternalError, apiSuccess, db } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { getAiProvider, isAiCapabilityEnabled, checkQuota, recordUsage } from '@api/server';
import type { AiCapabilityKey } from '@entities/tenant/server';
import { withTenant } from '@entities/tenant/server';
import { logError, supportedLanguages } from '@shared/lib';
import { AI_MODELS, rateLimitByUser } from '@api/server';

const translateRequestSchema = z.object({
  sourceLocale: z.enum(supportedLanguages),
  targetLocale: z.enum(supportedLanguages),
  content: z.string().min(1, 'Content is required'),
});

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  af: 'Afrikaans',
  xh: 'Xhosa',
  zu: 'Zulu',
};

export const maxDuration = 15;

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    // Rate limit by authenticated user to prevent per-user DoS
    const rateLimitResult = await rateLimitByUser(auth.data.userId, {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (rateLimitResult) return rateLimitResult;

    const parsed = translateRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
    }

    const { sourceLocale, targetLocale, content } = parsed.data;

    if (sourceLocale === targetLocale) {
      return apiError('VALIDATION_ERROR', 'Source and target locales must differ', 400);
    }

    const { tenantId } = await withTenant();
    const capability: AiCapabilityKey = 'ai.content.translation';

    // Step 1: Capability check
    if (!(await isAiCapabilityEnabled(tenantId, capability))) {
      return apiError(
        'FEATURE_DISABLED',
        'AI translation is not enabled for this community. Contact your administrator to enable the AI Provider module.',
        503
      );
    }

    // Step 2: Quota check
    const quota = await checkQuota(tenantId, capability, db);
    if (!quota.allowed) {
      return apiError(
        'FEATURE_DISABLED',
        `AI token quota exhausted for this month (${quota.remainingTokens} tokens remaining). Upgrade your plan or wait until the next billing period.`,
        429,
        { code: 'AI_QUOTA_EXHAUSTED', remainingTokens: quota.remainingTokens }
      );
    }

    // Step 3: Get provider
    const provider = await getAiProvider(tenantId);
    if (!provider.isAvailable()) {
      return apiError(
        'FEATURE_DISABLED',
        'AI translation is temporarily unavailable. The AI service may be down or the platform AI keys are not configured.',
        503
      );
    }

    const sourceName = LANGUAGE_NAMES[sourceLocale] || sourceLocale;
    const targetName = LANGUAGE_NAMES[targetLocale] || targetLocale;

    // Step 4: Call AI
    const start = Date.now();
    let result;
    let success = true;
    let errorCode: string | undefined;

    try {
      result = await provider.complete(content, {
        capability,
        systemPrompt: `You are a professional translator. Translate the following HTML content from ${sourceName} to ${targetName}. Preserve all HTML tags, attributes, and structure exactly as-is. Only translate the text content between tags. Do not modify, add, or remove any HTML elements. Return only the translated HTML, no explanations.`,
        maxTokens: 2000,
        temperature: 0.1,
      });
    } catch (err) {
      success = false;
      errorCode = err instanceof Error ? err.message.slice(0, 50) : 'UNKNOWN';
      result = { text: '', provider: 'null' as const, tokensUsed: 0 };
    }

    // Step 5: Record usage (ALWAYS — even on failure)
    await recordUsage(
      {
        tenantId,
        capability,
        userId: auth.data.userId,
        // translate has no document reference — omitting referenceId
        provider: result.provider,
        model: result.provider === 'anthropic' ? AI_MODELS.ANTHROPIC : AI_MODELS.OPENAI,
        inputTokens: estimateInputTokens(content),
        outputTokens: result.tokensUsed ?? 0,
        durationMs: Date.now() - start,
        success,
        errorCode,
      },
      db
    );

    // Step 6: Handle result
    if (!success) {
      logError(
        { component: 'translate-api', operation: 'POST', provider: provider.name },
        'AI translation call failed',
        errorCode
      );
      return apiError(
        'TRANSLATION_FAILED',
        'Translation service returned an error. You may retry.',
        502
      );
    }

    if (!result.text) {
      return apiError('TRANSLATION_FAILED', 'Translation returned empty result', 502);
    }

    return apiSuccess({
      content: result.text,
      sourceLocale,
      targetLocale,
      provider: result.provider,
    });
  } catch (error) {
    logError(
      { component: 'translate-api', operation: 'POST' },
      'Translation request failed',
      error
    );
    return apiInternalError();
  }
}

/** Rough token estimator — 20% buffer per SUPPLEMENTAL-2 R17 */
function estimateInputTokens(text: string): number {
  return Math.ceil(text.length * 0.27 * 1.2); // ~4 chars per token + 20% buffer
}
