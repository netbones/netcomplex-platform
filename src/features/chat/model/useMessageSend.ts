'use client';

import type { Message, MessageType } from '@entities/chat';
import { apiPost } from '@api/shared';
import { sendTypingIndicator } from '@shared/lib';

interface SendMessageOptions {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  onMessageSent?: (message: Message) => void;
}

export function useMessageSend({
  conversationId,
  currentUserId,
  currentUserName,
  onMessageSent,
}: SendMessageOptions) {
  const sendMessage = async (
    content: string,
    type: MessageType = 'TEXT',
    mediaUrl?: string
  ): Promise<boolean> => {
    try {
      const { data: newMessage } = await apiPost<Message>('/api/messages', {
        conversationId,
        content,
        type,
        mediaUrl,
      });
      onMessageSent?.(newMessage);
      return true;
    } catch {
      return false;
    }
  };

  const sendTyping = async (isTyping: boolean) => {
    sendTypingIndicator(conversationId, {
      userId: currentUserId,
      userName: currentUserName,
      isTyping,
    });
  };

  return {
    sendMessage,
    sendTypingIndicator: sendTyping,
  };
}
