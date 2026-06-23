import { eq } from 'drizzle-orm';
import { z } from 'zod';

import {
  apiError,
  apiInternalError,
  apiSuccess,
  db,
  settings,
  getSessionAndRole,
} from '@api/server';
import { withTenant, SETTINGS_KEYS } from '@entities/tenant/server';
import { logError, supportedLanguages } from '@shared/lib';

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
    const auth = await getSessionAndRole(request);
    if (!auth) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const parsed = translateRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
    }

    const { sourceLocale, targetLocale, content } = parsed.data;

    if (sourceLocale === targetLocale) {
      return apiError('VALIDATION_ERROR', 'Source and target locales must differ', 400);
    }

    await withTenant();

    const [[apiKeySetting], [providerSetting]] = await Promise.all([
      db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, SETTINGS_KEYS.TRANSLATION_API_KEY))
        .limit(1),
      db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, SETTINGS_KEYS.TRANSLATION_PROVIDER))
        .limit(1),
    ]);

    const apiKey = apiKeySetting?.value as string | undefined;
    const provider = (providerSetting?.value as string | undefined) ?? 'openai';

    if (!apiKey) {
      return apiError(
        'TRANSLATION_NOT_CONFIGURED',
        'Machine translation is not configured for this tenant. Add a translation API key in tenant settings.',
        402
      );
    }

    const sourceName = LANGUAGE_NAMES[sourceLocale] || sourceLocale;
    const targetName = LANGUAGE_NAMES[targetLocale] || targetLocale;

    let translatedText: string;

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following HTML content from ${sourceName} to ${targetName}. Preserve all HTML tags, attributes, and structure exactly as-is. Only translate the text content between tags. Do not modify, add, or remove any HTML elements. Return only the translated HTML, no explanations.`,
            },
            { role: 'user', content },
          ],
          temperature: 0.1,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        logError(
          { component: 'translate-api', operation: 'POST', status: response.status },
          'OpenAI translation API error',
          errBody
        );
        return apiError('TRANSLATION_FAILED', 'Translation service returned an error', 502, {
          provider: 'openai',
          status: response.status,
        });
      }

      const json = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      translatedText = json.choices[0]?.message?.content ?? '';
    } else {
      return apiError(
        'TRANSLATION_NOT_CONFIGURED',
        `Unsupported translation provider: ${provider}`,
        400
      );
    }

    if (!translatedText) {
      return apiError('TRANSLATION_FAILED', 'Translation returned empty result', 502);
    }

    return apiSuccess({
      content: translatedText,
      sourceLocale,
      targetLocale,
      provider,
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
