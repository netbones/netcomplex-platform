'use client';

import { useState, useEffect } from 'react';
import { createComponentLogger } from '@shared/lib';
import type { ConversationListItem } from '@entities/chat';
import { apiGet } from '@/shared/api/http-client';

const log = createComponentLogger('useConversations');

export interface User {
  id: string;
  name: string;
  avatar: string | null;
  email: string;
}

export function useConversations(currentUserId: string) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;

    async function fetchData() {
      try {
        const [convRes, usersRes] = await Promise.all([
          apiGet<ConversationListItem[]>(`/api/conversations?userId=${currentUserId}`),
          apiGet<{ users?: User[] }>('/api/users?limit=50'),
        ]);
        setConversations(convRes.data ?? []);
        const unwrapped = usersRes.data;
        setUsers(unwrapped?.users ?? (Array.isArray(unwrapped) ? unwrapped : []));
      } catch (error) {
        log.error({}, 'Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUserId]);

  return { conversations, setConversations, users, loading };
}
