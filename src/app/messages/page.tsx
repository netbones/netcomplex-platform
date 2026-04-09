'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth-client';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { usePageLoading } from '@/hooks/usePageLoading';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { createComponentLogger } from '@/lib/logging';

const log = createComponentLogger('messages-page');

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  participants: Array<{
    user: { id: string; name: string; avatar: string | null };
  }>;
  messages: Array<{ content: string; createdAt: string }>;
}

interface User {
  id: string;
  name: string;
  avatar: string | null;
  email: string;
}

type FilterType = 'all' | 'direct' | 'group';

export default function MessagesPage() {
  const { t } = useTranslation('common');
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatType, setNewChatType] = useState<'DIRECT' | 'GROUP'>('DIRECT');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

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
        const convData = await convRes.json();
        const usersData = await usersRes.json();
        setConversations(convData);
        setUsers(usersData.users || usersData);
      } catch (error) {
        log.error({}, 'Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUserId]);

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

  async function handleCreateConversation() {
    if (selectedUsers.length === 0) return;

    setCreating(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChatType === 'GROUP' ? newChatName : null,
          type: newChatType,
          participantIds: [currentUserId, ...selectedUsers],
        }),
      });

      if (res.ok) {
        const newConv = await res.json();
        setConversations([newConv, ...conversations]);
        setSelectedConversation(newConv.id);
        setShowNewChat(false);
        setNewChatName('');
        setSelectedUsers([]);
      }
    } catch (error) {
      log.error({}, 'Failed to create conversation', error);
    } finally {
      setCreating(false);
    }
  }

  function toggleUser(userId: string) {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  }

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

        {showNewChat && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewChat(false)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">New Conversation</h3>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNewChatType('DIRECT');
                      setNewChatName('');
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      newChatType === 'DIRECT'
                        ? 'bg-soralia-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Direct Message
                  </button>
                  <button
                    onClick={() => setNewChatType('GROUP')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                      newChatType === 'GROUP'
                        ? 'bg-soralia-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Group Chat
                  </button>
                </div>

                {newChatType === 'GROUP' && (
                  <input
                    type="text"
                    placeholder="Group name"
                    value={newChatName}
                    onChange={e => setNewChatName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
                  />
                )}

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {newChatType === 'DIRECT' ? 'Select person:' : 'Select participants:'}
                  </p>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {users
                      .filter(u => u.id !== currentUserId)
                      .map(user => (
                        <button
                          key={user.id}
                          onClick={() => toggleUser(user.id)}
                          disabled={
                            newChatType === 'DIRECT' &&
                            selectedUsers.length > 0 &&
                            !selectedUsers.includes(user.id)
                          }
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-left ${
                            selectedUsers.includes(user.id)
                              ? 'bg-soralia-light border border-soralia-primary'
                              : 'hover:bg-gray-50'
                          } ${newChatType === 'DIRECT' && selectedUsers.length > 0 && !selectedUsers.includes(user.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-soralia-primary/20 flex items-center justify-center">
                                <span className="text-sm text-soralia-primary font-medium">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          {selectedUsers.includes(user.id) && (
                            <svg
                              className="w-4 h-4 text-soralia-primary flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowNewChat(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateConversation}
                  disabled={
                    selectedUsers.length === 0 ||
                    (newChatType === 'GROUP' && !newChatName) ||
                    creating
                  }
                  className="flex-1 py-2 bg-soralia-primary text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ErrorBoundary>
  );
}
