'use client';

import { useState, useEffect } from 'react';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('useMessages');

export interface Message {
  id: string;
  content: string;
  type: string;
  messageVersion: number;
  payload: Record<string, unknown> | null;
  mediaUrl?: string | null;
  createdAt: string;
  sender: { id: string; name: string; avatar: string | null };
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    async function fetchMessages() {
      setMessagesLoading(true);
      try {
        const res = await fetch(`/api/messages?conversationId=${conversationId}`);
        if (!res.ok) throw new Error(`Messages API ${res.status}`);
        const data = await res.json();
        setMessages(data?.data ?? data);
      } catch (error) {
        log.error({}, 'Failed to fetch messages', error);
      } finally {
        setMessagesLoading(false);
      }
    }
    fetchMessages();
  }, [conversationId]);

  return { messages, setMessages, messagesLoading };
}
