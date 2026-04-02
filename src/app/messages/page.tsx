'use client';

import { useState, useEffect } from 'react';
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

export default function MessagesPage() {
  const { t } = useTranslation('common');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Conversations</h2>

              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No conversations yet</p>
                  <button className="text-soralia-primary hover:underline">
                    Start a new conversation
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        selectedConversation === conv.id
                          ? 'bg-soralia-light border border-soralia-primary'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium">
                        {conv.name ||
                          conv.participants.find(p => p.user.id !== currentUserId)?.user.name ||
                          'New Conversation'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {conv.participants.length} participant
                        {conv.participants.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex -space-x-2 mt-1">
                        {conv.participants.slice(0, 3).map((p, i) => (
                          <div
                            key={p.user.id}
                            className="w-6 h-6 rounded-full border-2 border-white overflow-hidden"
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
                                <span className="text-xs text-soralia-primary font-medium">
                                  {p.user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                        {conv.participants.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white">
                            <span className="text-xs text-gray-600">
                              +{conv.participants.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
