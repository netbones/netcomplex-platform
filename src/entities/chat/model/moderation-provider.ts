import type { Message } from './types';

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

export interface ModerationProvider {
  review(message: Pick<Message, 'content' | 'type' | 'messageVersion'>): Promise<ModerationResult>;
  reportMessage(messageId: string, reportedByUserId: string, reason: string): Promise<void>;
}
