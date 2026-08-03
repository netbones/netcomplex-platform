'use client';

import { useState, useEffect } from 'react';
import { createComponentLogger } from '@shared/lib';
import { subscribeChatMessages } from '@shared/lib';
import { apiGet } from '@/shared/api/http-client';

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

// Shape a raw `Message` row from the Postgres `postgres_changes` INSERT
// payload into the `Message` interface expected by the chat UI. The raw row
// lacks the joined `sender` relation present in the `/api/messages` response,
// so fall back to a minimal sender object keyed by `senderId`. Callers that
// want full sender info can hydrate later — acceptance criterion for
// ADVISORY-037 P1.1 is "renders incoming messages without a manual refetch".
function shapeRealtimeRow(row: Record<string, unknown>): Message {
  const senderId = (row.senderId as string) ?? '';
  return {
    id: (row.id as string) ?? '',
    content: (row.content as string) ?? '',
    type: (row.type as string) ?? 'TEXT',
    messageVersion: (row.messageVersion as number) ?? 0,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    mediaUrl: (row.mediaUrl as string | null) ?? null,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? ''),
    sender: { id: senderId, name: 'Unknown', avatar: null },
  };
}

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Initial pull — load existing history for the conversation.
  useEffect(() => {
    if (!conversationId) return;

    async function fetchMessages() {
      setMessagesLoading(true);
      try {
        const { data } = await apiGet<Message[]>(`/api/messages?conversationId=${conversationId}`);
        setMessages(data ?? []);
      } catch (error) {
        log.error({}, 'Failed to fetch messages', error);
      } finally {
        setMessagesLoading(false);
      }
    }
    fetchMessages();
  }, [conversationId]);

  // Realtime subscription — push INSERT payloads into local state.
  // Dedupe by id in case both the initial fetch and the realtime payload land
  // for the same row (postgres_changes fires for INSERTs regardless of caller,
  // so a message sent from this tab via the POST API will arrive twice).
  useEffect(() => {
    if (!conversationId) return;
    return subscribeChatMessages(conversationId, msg => {
      const shaped = shapeRealtimeRow(msg);
      setMessages(prev => (prev.some(m => m.id === shaped.id) ? prev : [...prev, shaped]));
    });
  }, [conversationId]);

  return { messages, setMessages, messagesLoading };
}
