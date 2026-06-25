import 'server-only';

import type { AiProvider, AiCompletionResult } from './provider';

export class NullProvider implements AiProvider {
  readonly name = 'null' as const;

  isAvailable(): boolean {
    return false;
  }

  async complete(): Promise<AiCompletionResult> {
    return { text: '', provider: 'null', tokensUsed: 0 };
  }
}
