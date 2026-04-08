'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  participants: Array<{
    user: { id: string; name: string; avatar: string | null };
  }>;
  messages: Array<{ content: string; createdAt: string }>;
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
        toast.error('Failed to fetch conversations');
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
        <Link href="/messages" className="text-soralia-primary hover:underline">
          Start a new conversation
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {conversations.slice(0, 5).map(conv => {
        const otherParticipants = conv.participants
          .filter(p => p.user.id !== session?.user?.id)
          .map(p => p.user);

        const displayName =
          conv.name || otherParticipants.map(p => p.name).join(', ') || 'New Conversation';
        const lastMessage = conv.messages?.[0];

        return (
          <Link
            key={conv.id}
            href={`/messages?conversation=${conv.id}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
          >
            <div className="flex -space-x-2">
              {otherParticipants.slice(0, 2).map((participant, i) => (
                <div
                  key={participant.id}
                  className="w-8 h-8 rounded-full bg-soralia-primary/20 flex items-center justify-center border-2 border-white"
                >
                  {participant.avatar ? (
                    <img
                      src={participant.avatar}
                      alt={participant.name || ''}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-soralia-primary font-medium">
                      {participant.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
              {otherParticipants.length > 2 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white">
                  <span className="text-xs text-gray-600">+{otherParticipants.length - 2}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{displayName}</p>
              {lastMessage && (
                <p className="text-sm text-gray-500 truncate">{lastMessage.content}</p>
              )}
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                conv.type === 'GROUP'
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-soralia-primary/10 text-soralia-primary'
              }`}
            >
              {conv.type === 'GROUP' ? 'Group' : 'Direct'}
            </span>
          </Link>
        );
      })}
      {conversations.length > 5 && (
        <Link
          href="/messages"
          className="block text-center text-sm text-soralia-primary hover:underline py-2"
        >
          View all {conversations.length} conversations
        </Link>
      )}
    </div>
  );
}
