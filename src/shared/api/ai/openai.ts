import 'server-only';

import OpenAI from 'openai';
import type { AiProvider, AiCompletionResult, AiCompletionOptions } from './provider';
import { AI_MODELS } from './config';

/**
 * OpenAI provider — also serves as the DeepSeek provider via baseURL.
 * per G6: DeepSeek uses the OpenAI SDK with a different baseURL.
 */
export class OpenAiProvider implements AiProvider {
  readonly name: 'openai' | 'deepseek';
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.name = baseURL?.includes('deepseek') ? 'deepseek' : 'openai';
    this.client = new OpenAI({ apiKey, baseURL });
  }

  isAvailable(): boolean {
    return true;
  }

  async complete(userPrompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult> {
    const response = await this.client.chat.completions.create({
      // per RESEARCH.md §16: canonical model IDs
      model: this.name === 'deepseek' ? AI_MODELS.DEEPSEEK : AI_MODELS.OPENAI,
      max_tokens: options?.maxTokens ?? 1000,
      temperature: options?.temperature ?? 0,
      messages: [
        ...(options?.systemPrompt
          ? [{ role: 'system' as const, content: options.systemPrompt }]
          : []),
        { role: 'user' as const, content: userPrompt },
      ],
      ...(options?.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    });

    return {
      text: response.choices[0]?.message?.content ?? '',
      provider: this.name,
      tokensUsed: response.usage?.total_tokens ?? 0,
    };
  }
}
