'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ConversationListItem } from '@entities/chat';
import { apiGet } from '@shared/api';

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
      const data = await apiGet<ConversationListItem[]>(`/api/conversations`, { userId });
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
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
