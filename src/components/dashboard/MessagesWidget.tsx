'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  participants: { id: string; name: string; avatar: string | null }[];
  lastMessage?: { content: string; createdAt: string };
  unreadCount?: number;
}

export function MessagesWidget() {
  const { t } = useTranslation('common');
  const { data: session } = authClient.useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function fetchConversations() {
      if (!session?.user?.id) return;
      try {
        const res = await fetch(`/api/conversations?userId=${session.user.id}`);
        const data = await res.json();
        setConversations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, [session?.user?.id]);

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-lg"></div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="mb-4">No conversations yet</p>
        <Link href="/messages" className="text-indigo-600 hover:underline">
          Start a new conversation
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {conversations.slice(0, 5).map(conv => {
        const otherParticipant = conv.participants.find(p => p.id !== session?.user?.id);
        return (
          <Link
            key={conv.id}
            href={`/messages?conversation=${conv.id}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              {otherParticipant?.avatar ? (
                <img
                  src={otherParticipant.avatar}
                  alt={otherParticipant.name || ''}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <i className="fas fa-user text-indigo-600"></i>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {conv.name || otherParticipant?.name || 'New Conversation'}
              </p>
              {conv.lastMessage && (
                <p className="text-sm text-gray-500 truncate">{conv.lastMessage.content}</p>
              )}
            </div>
            {conv.unreadCount && conv.unreadCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                {conv.unreadCount}
              </span>
            )}
          </Link>
        );
      })}
      {conversations.length > 5 && (
        <Link
          href="/messages"
          className="block text-center text-sm text-indigo-600 hover:underline py-2"
        >
          View all {conversations.length} conversations
        </Link>
      )}
    </div>
  );
}
