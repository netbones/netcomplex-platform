'use client';

import { useMemo, useState } from 'react';
import { ParticipantAvatar, ParticipantAvatarStack } from '@entities/chat';
import type { ConversationListItem } from '@entities/chat';

type FilterType = 'all' | 'direct' | 'group';

interface ConversationListProps {
  conversations: ConversationListItem[];
  loading: boolean;
  currentUserId: string;
  selectedConversation: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationList({
  conversations,
  loading,
  currentUserId,
  selectedConversation,
  onSelectConversation,
  onNewConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

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

  return (
    <div
      className={`${
        selectedConversation ? 'hidden md:flex' : 'flex'
      } w-full md:w-80 lg:w-96 flex-col h-full bg-white shrink-0 border-r border-gray-100`}
    >
      <div className="p-4 border-b border-gray-50 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Conversations</h2>
          <button
            onClick={onNewConversation}
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
                onClick={onNewConversation}
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
              conv.name || otherParticipants.map(p => p.name).join(', ') || 'New Conversation';
            const lastMessage = conv.messages?.[0];

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
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
                    <p className="font-semibold text-sm text-gray-900 truncate">{displayName}</p>
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
  );
}
