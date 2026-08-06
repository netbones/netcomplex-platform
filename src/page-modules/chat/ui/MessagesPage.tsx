'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@api/client';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import { usePageLoading } from '@shared/ui';
import Image from 'next/image';
import { useConversations } from '../model/useConversations';
import { useMessages } from '../model/useMessages';
import { ConversationList } from './ConversationList';
import { ConversationDetail } from './ConversationDetail';
import { CreateConversationModal } from '@features/chat';
import type { ConversationListItem } from '@entities/chat';
import type { Message } from '../model/useMessages';
import { apiPost } from '@/shared/api/http-client';

const log = createComponentLogger('MessagesPage');

interface MessagesPageProps {
  initialConversationId?: string;
}

export function MessagesPage({ initialConversationId }: MessagesPageProps) {
  const { t } = useTranslation('common');
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const currentUserId = session?.user?.id || '';
  const currentUserName = session?.user?.name || session?.user?.email || 'User';

  const { conversations, setConversations, users, loading } = useConversations(currentUserId);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    initialConversationId || null
  );
  const { messages, setMessages, messagesLoading } = useMessages(selectedConversation);
  const [showNewChat, setShowNewChat] = useState(false);
  const [typingUsers] = useState<string[]>([]);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Messages', href: '/messages' },
    ],
    { additionalLoading: loading || sessionLoading }
  );

  const activeConversation = conversations.find(c => c.id === selectedConversation);

  const handleCreateConversation = (newConv: ConversationListItem) => {
    setConversations([newConv, ...conversations]);
    setSelectedConversation(newConv.id);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || !selectedConversation) return;

    try {
      const { data } = await apiPost<Message>('/api/messages', {
        conversationId: selectedConversation,
        content: text,
        type: 'TEXT' as const,
      });
      setMessages(prev => [
        ...prev,
        {
          ...data,
          sender: { id: currentUserId, name: currentUserName, avatar: null },
        },
      ]);
    } catch (error) {
      log.error({}, 'Failed to send message', error);
    }
  };

  if (!isReady) {
    return LoadingComponent;
  }

  if (!currentUserId) {
    return (
      <main className="min-h-screen bg-soralia-light flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to view messages</p>
          <a href="/sign-in" className="text-soralia-primary hover:underline">
            Sign In
          </a>
        </div>
      </main>
    );
  }

  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-soralia-light">
        <div className="container mx-auto px-4 py-6 flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-100px)]">
          <Breadcrumbs
            items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.messages') }]}
          />

          <div className="flex items-center justify-between mb-4 mt-2 shrink-0">
            <h1 className="text-3xl font-bold text-soralia-primary flex items-center gap-3">
              <Image
                src="/platform/communication.svg"
                alt=""
                width={32}
                height={32}
                className="w-8 h-8"
              />
              Messages
            </h1>
          </div>

          <div className="flex bg-white rounded-2xl shadow-md border border-gray-150 overflow-hidden flex-1 min-h-[450px] max-h-[800px] mb-4">
            <ConversationList
              conversations={conversations}
              loading={loading}
              currentUserId={currentUserId}
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
              onNewConversation={() => setShowNewChat(true)}
            />

            <ConversationDetail
              conversation={activeConversation}
              messages={messages}
              messagesLoading={messagesLoading}
              currentUserId={currentUserId}
              typingUsers={typingUsers}
              onBack={() => setSelectedConversation(null)}
              onSend={handleSend}
              onNewConversation={() => setShowNewChat(true)}
            />
          </div>
        </div>

        {showNewChat && (
          <CreateConversationModal
            users={users}
            currentUserId={currentUserId}
            onClose={() => setShowNewChat(false)}
            onCreated={handleCreateConversation}
          />
        )}
      </main>
    </ErrorBoundary>
  );
}
