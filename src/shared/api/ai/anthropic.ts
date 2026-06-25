import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import type { AiProvider, AiCompletionResult, AiCompletionOptions } from './provider';
import { AI_MODELS } from './config';

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic' as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  isAvailable(): boolean {
    return true;
  }

  async complete(userPrompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult> {
    const response = await this.client.messages.create({
      // per RESEARCH.md §16: canonical Anthropic model
      model: AI_MODELS.ANTHROPIC,
      max_tokens: options?.maxTokens ?? 1000,
      temperature: options?.temperature ?? 0,
      system: options?.systemPrompt,
      messages: [{ role: 'user' as const, content: userPrompt }],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      text,
      provider: 'anthropic',
      tokensUsed: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
    };
  }
}
