'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ConversationListItem } from '@entities/chat';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('useConversationList');

interface UseConversationListOptions {
  userId: string;
  enabled?: boolean;
}

export function useConversationList({ userId, enabled = true }: UseConversationListOptions) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!userId || !enabled) return;

    try {
      const res = await fetch(`/api/conversations?userId=${userId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      log.error({}, 'Failed to fetch conversations', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const addConversation = useCallback((conversation: ConversationListItem) => {
    setConversations(prev => [conversation, ...prev]);
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    addConversation,
    refresh,
  };
}
