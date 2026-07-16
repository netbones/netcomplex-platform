'use client';

import { useState, useEffect } from 'react';
import { createComponentLogger } from '@shared/lib';
import type { ConversationListItem } from '@entities/chat';

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
          fetch(`/api/conversations?userId=${currentUserId}`),
          fetch('/api/users?limit=50'),
        ]);
        if (!convRes.ok) throw new Error(`Conversations API ${convRes.status}`);
        if (!usersRes.ok) throw new Error(`Users API ${usersRes.status}`);
        const convData = await convRes.json();
        const usersData = await usersRes.json();
        setConversations(convData?.data ?? []);
        const unwrapped = usersData?.data ?? usersData;
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
