'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { usePageLoading } from '@/hooks/usePageLoading';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  participants: Array<{
    user: { id: string; name: string; avatar: string | null };
  }>;
  messages: Array<{ content: string; createdAt: string }>;
}

const currentUserId = 'demo-user-id';
const currentUserName = 'Demo User';

type FilterType = 'all' | 'direct' | 'group';

export default function MessagesPage() {
  const { t } = useTranslation('common');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Messages', href: '/messages' },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch(`/api/conversations?userId=${currentUserId}`);
        const data = await res.json();
        setConversations(data);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, []);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const otherParticipants = conv.participants
        .filter(p => p.user.id !== currentUserId)
        .map(p => p.user.name)
        .join(' ');

      const matchesSearch =
        searchQuery === '' ||
        (conv.name || otherParticipants).toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filter === 'all' ||
        (filter === 'group' && conv.type === 'GROUP') ||
        (filter === 'direct' && conv.type === 'DIRECT');

      return matchesSearch && matchesFilter;
    });
  }, [conversations, searchQuery, filter]);

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-soralia-light">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.messages') }]}
          />
          <h1 className="text-4xl font-bold text-soralia-primary mb-8">Messages</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-4 flex flex-col max-h-[600px]">
              <h2 className="text-lg font-semibold mb-4">Conversations</h2>

              <div className="mb-3 space-y-2">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-soralia-primary"
                />
                <div className="flex gap-1">
                  {(['all', 'direct', 'group'] as FilterType[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 text-xs rounded-full capitalize transition ${
                        filter === f
                          ? 'bg-soralia-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'direct' ? 'Direct' : 'Groups'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 -mr-2 pr-2">
                {loading ? (
                  <p className="text-gray-500">Loading...</p>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                    </p>
                    {!searchQuery && (
                      <button className="text-soralia-primary hover:underline">
                        Start a new conversation
                      </button>
                    )}
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        selectedConversation === conv.id
                          ? 'bg-soralia-light border border-soralia-primary'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium truncate">
                        {conv.name ||
                          conv.participants
                            .filter(p => p.user.id !== currentUserId)
                            .map(p => p.user.name)
                            .join(', ') ||
                          'New Conversation'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex -space-x-2">
                          {conv.participants.slice(0, 3).map(p => (
                            <div
                              key={p.user.id}
                              className="w-5 h-5 rounded-full border border-white overflow-hidden"
                              title={p.user.name}
                            >
                              {p.user.avatar ? (
                                <img
                                  src={p.user.avatar}
                                  alt={p.user.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-soralia-primary/20 flex items-center justify-center">
                                  <span className="text-[8px] text-soralia-primary font-medium">
                                    {p.user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                          {conv.participants.length > 3 && (
                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center border border-white">
                              <span className="text-[8px] text-gray-600">
                                +{conv.participants.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {conv.type === 'GROUP' ? 'Group' : 'Direct'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              {selectedConversation ? (
                <ChatWindow
                  conversationId={selectedConversation}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                />
              ) : (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500">Select a conversation to start messaging</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}
