'use client';

import { createClient } from '@supabase/supabase-js';
import type { Message, MessageType } from '@entities/chat';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('useMessageSend');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content, type, mediaUrl }),
      });

      if (!res.ok) {
        log.error({}, 'Failed to send message', await res.json());
        return false;
      }

      const newMessage: Message = await res.json();
      onMessageSent?.(newMessage);

      return true;
    } catch (err) {
      log.error({}, 'Failed to send message', err);
      return false;
    }
  };

  const sendTypingIndicator = async (isTyping: boolean) => {
    try {
      const channel = supabase.channel(`typing:${conversationId}`);
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, userName: currentUserName, isTyping },
      });
    } catch (err) {
      log.error({}, 'Failed to send typing indicator', err);
    }
  };

  return {
    sendMessage,
    sendTypingIndicator,
  };
}
