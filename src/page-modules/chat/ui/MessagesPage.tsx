'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authClient } from '@api/client';
import { Breadcrumbs, ErrorBoundary } from '@shared/ui';
import { usePageLoading } from '@shared/ui';
import { createComponentLogger } from '@shared/lib';
import {
  ChatMessage,
  OnlineIndicator,
  TypingIndicator,
  EmojiPickerButton,
  ParticipantAvatar,
  type ConversationListItem,
} from '@entities/chat';
import { CreateConversationModal } from '@features/chat';
import { COMMON_EMOJIS } from '@entities/chat';

const log = createComponentLogger('MessagesPage');

type FilterType = 'all' | 'direct' | 'group';

interface User {
  id: string;
  name: string;
  avatar: string | null;
  email: string;
}

interface MessagesPageProps {
  initialConversationId?: string;
}

export function MessagesPage({ initialConversationId }: MessagesPageProps) {
  const { t } = useTranslation('common');
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    initialConversationId || null
  );
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      content: string;
      type: string;
      mediaUrl?: string | null;
      createdAt: string;
      sender: { id: string; name: string; avatar: string | null };
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showNewChat, setShowNewChat] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const currentUserId = session?.user?.id || '';
  const currentUserName = session?.user?.name || session?.user?.email || 'User';

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Messages', href: '/messages' },
    ],
    { additionalLoading: loading || sessionLoading }
  );

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

  useEffect(() => {
    if (!selectedConversation) return;

    async function fetchMessages() {
      setMessagesLoading(true);
      try {
        const res = await fetch(`/api/messages?conversationId=${selectedConversation}`);
        if (!res.ok) throw new Error(`Messages API ${res.status}`);
        const data = await res.json();
        setMessages(data?.data ?? data);
      } catch (error) {
        log.error({}, 'Failed to fetch messages', error);
      } finally {
        setMessagesLoading(false);
      }
    }
    fetchMessages();
  }, [selectedConversation]);

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
  }, [conversations, searchQuery, filter, currentUserId]);

  const handleCreateConversation = (newConv: ConversationListItem) => {
    setConversations([newConv, ...conversations]);
    setSelectedConversation(newConv.id);
  };

  const handleInputChange = (value: string) => {
    setNewMessage(value);
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation) return;

    const messageData = selectedImage
      ? { content: 'Image', type: 'IMAGE' as const, mediaUrl: selectedImage }
      : { content: newMessage, type: 'TEXT' as const };

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation,
          ...messageData,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const sentMessage = json?.data ?? json;
        setMessages(prev => [
          ...prev,
          {
            ...sentMessage,
            sender: { id: currentUserId, name: currentUserName, avatar: null },
          },
        ]);
        setNewMessage('');
        setSelectedImage(null);
      }
    } catch (error) {
      log.error({}, 'Failed to send message', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
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
        <div className="container mx-auto px-4 py-8">
          <Breadcrumbs
            items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.messages') }]}
          />
          <h1 className="text-4xl font-bold text-soralia-primary mb-8">Messages</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-4 flex flex-col max-h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Conversations</h2>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="text-soralia-primary hover:text-indigo-700"
                  title="New conversation"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>

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
                      <button
                        onClick={() => setShowNewChat(true)}
                        className="text-soralia-primary hover:underline"
                      >
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
                            <ParticipantAvatar
                              key={p.user.id}
                              name={p.user.name || ''}
                              avatar={p.user.avatar}
                              size="sm"
                            />
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
                <div className="flex flex-col h-[500px] bg-white rounded-lg shadow">
                  <div className="border-b px-4 py-2 flex items-center justify-between">
                    <OnlineIndicator count={onlineCount} />
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messagesLoading ? (
                      <p className="text-center text-gray-500">Loading messages...</p>
                    ) : messages.length === 0 ? (
                      <p className="text-center text-gray-500">
                        No messages yet. Start the conversation!
                      </p>
                    ) : (
                      messages.map(msg => (
                        <ChatMessage
                          key={msg.id}
                          message={{
                            id: msg.id,
                            content: msg.content,
                            type: msg.type as 'TEXT' | 'IMAGE' | 'SYSTEM',
                            mediaUrl: msg.mediaUrl,
                            createdAt: msg.createdAt,
                            sender: msg.sender,
                          }}
                          isCurrentUser={msg.sender.id === currentUserId}
                        />
                      ))
                    )}
                  </div>

                  <TypingIndicator
                    message={typingUsers.length > 0 ? 'Someone is typing...' : null}
                  />

                  <div className="border-t p-4 flex flex-col gap-2">
                    {selectedImage && (
                      <div className="relative">
                        <img
                          src={selectedImage}
                          alt="Preview"
                          className="h-20 rounded-lg object-cover"
                        />
                        <button
                          onClick={() => setSelectedImage(null)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <label className="cursor-pointer p-2 text-gray-500 hover:text-soralia-primary">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-2 text-gray-500 hover:text-soralia-primary"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                            />
                          </svg>
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute bottom-full mb-1 left-0 bg-white border rounded-lg shadow-lg p-2 flex gap-1">
                            {COMMON_EMOJIS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => insertEmoji(emoji)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={e => handleInputChange(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() && !selectedImage}
                        className="bg-soralia-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500">Select a conversation to start messaging</p>
                </div>
              )}
            </div>
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
