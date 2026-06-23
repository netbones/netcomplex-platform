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
  TypingIndicator,
  ParticipantAvatar,
  ParticipantAvatarStack,
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
      messageVersion: number;
      payload: Record<string, unknown> | null;
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
  const [typingUsers] = useState<string[]>([]);
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
        <div className="container mx-auto px-4 py-6 flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-100px)]">
          <Breadcrumbs
            items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.messages') }]}
          />

          <div className="flex items-center justify-between mb-4 mt-2 shrink-0">
            <h1 className="text-3xl font-bold text-soralia-primary flex items-center gap-3">
              <img src="/platform/communication.svg" alt="" className="w-8 h-8" />
              Messages
            </h1>
          </div>

          <div className="flex bg-white rounded-2xl shadow-md border border-gray-150 overflow-hidden flex-1 min-h-[450px] max-h-[800px] mb-4">
            {/* Conversations List (Left Panel) */}
            <div
              className={`${
                selectedConversation ? 'hidden md:flex' : 'flex'
              } w-full md:w-80 lg:w-96 flex-col h-full bg-white shrink-0 border-r border-gray-100`}
            >
              <div className="p-4 border-b border-gray-50 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">Conversations</h2>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                    title="New conversation"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50"
                  />
                  <div className="flex gap-1">
                    {(['all', 'direct', 'group'] as FilterType[]).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 text-xs rounded-full capitalize transition font-medium ${
                          filter === f
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                        }`}
                      >
                        {f === 'all' ? 'All' : f === 'direct' ? 'Direct' : 'Groups'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conversations Scroll Area */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                  <div className="flex flex-col gap-2 p-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                        <div className="w-10 h-10 bg-gray-250 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-250 rounded w-2/3" />
                          <div className="h-3 bg-gray-250 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <p className="text-gray-500 mb-4 text-sm">
                      {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setShowNewChat(true)}
                        className="text-indigo-600 hover:underline text-sm font-semibold"
                      >
                        Start a new conversation
                      </button>
                    )}
                  </div>
                ) : (
                  filteredConversations.map(conv => {
                    const isSelected = selectedConversation === conv.id;
                    const otherParticipants = conv.participants
                      .filter(p => p.user.id !== currentUserId)
                      .map(p => p.user);
                    const displayName =
                      conv.name ||
                      otherParticipants.map(p => p.name).join(', ') ||
                      'New Conversation';
                    const lastMessage = conv.messages?.[0];

                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                          isSelected
                            ? 'bg-indigo-50/70 border-l-4 border-indigo-600 pl-2 text-indigo-955 font-semibold shadow-sm'
                            : 'hover:bg-gray-50/70 border-l-4 border-transparent pl-2 text-gray-700'
                        }`}
                      >
                        <div className="flex shrink-0">
                          {conv.type === 'GROUP' ? (
                            <ParticipantAvatarStack participants={otherParticipants} max={3} />
                          ) : (
                            <ParticipantAvatar
                              name={otherParticipants[0]?.name || ''}
                              avatar={otherParticipants[0]?.avatar}
                              size="md"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-gray-900 truncate">
                              {displayName}
                            </p>
                            <span className="text-[10px] text-gray-400 capitalize shrink-0 font-medium">
                              {conv.type === 'GROUP' ? 'Group' : 'Direct'}
                            </span>
                          </div>
                          {lastMessage && (
                            <p className="text-xs text-gray-500 truncate mt-0.5 font-normal">
                              {lastMessage.content}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Active Conversation Detail Panel (Right Panel) */}
            <div
              className={`${
                !selectedConversation ? 'hidden md:flex' : 'flex'
              } flex-1 flex-col h-full bg-gray-50/30`}
            >
              {selectedConversation ? (
                (() => {
                  const activeConv = conversations.find(c => c.id === selectedConversation);
                  const otherParticipants = activeConv
                    ? activeConv.participants
                        .filter(p => p.user.id !== currentUserId)
                        .map(p => p.user)
                    : [];
                  const isDirectChat = activeConv?.type === 'DIRECT';
                  const firstOtherParticipant = otherParticipants[0];
                  const otherParticipantName = firstOtherParticipant?.name || 'User';
                  const otherParticipantAvatar = firstOtherParticipant?.avatar;
                  const profileLink = firstOtherParticipant
                    ? `/resident/${firstOtherParticipant.id}`
                    : '#';

                  return (
                    <div className="flex flex-col h-full bg-white relative">
                      {/* Active Chat Header */}
                      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Mobile Back Button */}
                          <button
                            onClick={() => setSelectedConversation(null)}
                            className="md:hidden p-1.5 -ml-1 text-gray-505 hover:text-gray-900 transition hover:bg-gray-100 rounded-lg"
                          >
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                              />
                            </svg>
                          </button>

                          <div className="flex items-center gap-3 min-w-0">
                            {isDirectChat && firstOtherParticipant ? (
                              <Link
                                href={profileLink}
                                className="flex items-center gap-3 hover:opacity-85 transition min-w-0"
                              >
                                <ParticipantAvatar
                                  name={otherParticipantName}
                                  avatar={otherParticipantAvatar}
                                  size="md"
                                />
                                <div className="min-w-0">
                                  <h3 className="font-bold text-gray-950 truncate flex items-center gap-1">
                                    {otherParticipantName}
                                    <span
                                      className="text-blue-500 text-xs"
                                      title="Verified Resident"
                                    >
                                      ✓
                                    </span>
                                  </h3>
                                  <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Active now
                                  </p>
                                </div>
                              </Link>
                            ) : (
                              <>
                                <ParticipantAvatarStack participants={otherParticipants} max={4} />
                                <div className="min-w-0">
                                  <h3 className="font-bold text-gray-950 truncate">
                                    {activeConv?.name || 'Group Conversation'}
                                  </h3>
                                  <p className="text-[10px] text-gray-400">
                                    {otherParticipants.length + 1} participants
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Top Right Header View Profile Button */}
                        {isDirectChat && firstOtherParticipant && (
                          <Link
                            href={profileLink}
                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-full font-semibold hover:bg-gray-50 transition text-gray-700 hover:border-gray-300"
                          >
                            View Profile
                          </Link>
                        )}
                      </div>

                      {/* Messages Scrollable Panel */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                        {/* Welcome Profile Card */}
                        {isDirectChat && firstOtherParticipant && (
                          <div className="flex flex-col items-center justify-center text-center py-10 border-b border-gray-50 mb-6 bg-gradient-to-b from-gray-50/50 to-transparent rounded-2xl px-4">
                            <div className="w-16 h-16 relative mb-4">
                              {otherParticipantAvatar ? (
                                <img
                                  src={otherParticipantAvatar}
                                  alt={otherParticipantName}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center border-2 border-white shadow-sm">
                                  <span className="text-indigo-600 text-xl font-bold">
                                    {otherParticipantName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1 justify-center">
                              {otherParticipantName}
                              <span className="text-blue-500 text-sm" title="Verified Resident">
                                ✓
                              </span>
                            </h3>
                            <p className="text-xs text-gray-505 mt-0.5">
                              @{otherParticipantName.toLowerCase().replace(/\s+/g, '')}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">Soralia Resident</p>
                            <Link
                              href={profileLink}
                              className="mt-4 px-4 py-2 bg-black hover:bg-gray-900 text-white text-xs font-semibold rounded-full transition shadow-sm"
                            >
                              View Profile
                            </Link>
                          </div>
                        )}
                        {!isDirectChat && otherParticipants.length > 0 && (
                          <div className="flex flex-col items-center justify-center text-center py-8 border-b border-gray-50 mb-6 bg-gradient-to-b from-gray-50/50 to-transparent rounded-2xl px-4">
                            <div className="mb-4">
                              <ParticipantAvatarStack participants={otherParticipants} max={5} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {activeConv?.name || 'Group Conversation'}
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {otherParticipants.length + 1} participants
                            </p>
                          </div>
                        )}
                        {messagesLoading ? (
                          <p className="text-center text-gray-400 py-8 text-sm">
                            Loading messages...
                          </p>
                        ) : messages.length === 0 ? (
                          <p className="text-center text-gray-400 py-8 text-sm">
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
                                messageVersion: msg.messageVersion ?? 1,
                                payload: msg.payload ?? null,
                                mediaUrl: msg.mediaUrl,
                                createdAt: msg.createdAt,
                                sender: msg.sender,
                              }}
                              isCurrentUser={msg.sender.id === currentUserId}
                              showSenderName={!isDirectChat}
                            />
                          ))
                        )}
                      </div>

                      {/* Typing Indicator */}
                      <TypingIndicator
                        message={typingUsers.length > 0 ? 'Someone is typing...' : null}
                      />

                      {/* Message Input Panel */}
                      <div className="border-t border-gray-100 p-4 shrink-0 bg-white">
                        {selectedImage && (
                          <div className="relative inline-block mb-3 bg-gray-50 p-1.5 rounded-xl border border-gray-150">
                            <img
                              src={selectedImage}
                              alt="Preview"
                              className="h-20 max-w-[120px] rounded-lg object-cover"
                            />
                            <button
                              onClick={() => setSelectedImage(null)}
                              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow hover:bg-red-600 transition"
                            >
                              ×
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          {/* Image Attachment Button */}
                          <label className="cursor-pointer p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition shrink-0">
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

                          {/* Emoji Button */}
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition"
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
                                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </button>
                            {showEmojiPicker && (
                              <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-100 rounded-xl shadow-lg p-2.5 flex gap-1.5 z-20">
                                {COMMON_EMOJIS.map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => insertEmoji(emoji)}
                                    className="p-1.5 hover:bg-gray-50 rounded-lg text-lg transition duration-150"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Text input bar */}
                          <div className="flex-1 relative flex items-center">
                            <input
                              type="text"
                              value={newMessage}
                              onChange={e => handleInputChange(e.target.value)}
                              onKeyPress={e => e.key === 'Enter' && handleSend()}
                              placeholder="Type a message..."
                              className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white focus:border-indigo-500 focus:ring-0 focus:outline-none transition-all duration-200 text-sm px-4 py-2.5 rounded-full border border-gray-100"
                            />
                          </div>

                          {/* Send Button */}
                          <button
                            onClick={handleSend}
                            disabled={!newMessage.trim() && !selectedImage}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-sm shadow-indigo-100"
                          >
                            <svg
                              className="w-4 h-4 transform rotate-45"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
                  <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-indigo-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Select a conversation</h3>
                  <p className="text-sm text-gray-500 max-w-xs">
                    Choose from your existing conversations or start a new one to begin messaging.
                  </p>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
                  >
                    New Conversation
                  </button>
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
