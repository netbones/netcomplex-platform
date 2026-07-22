'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ChatMessage,
  TypingIndicator,
  ParticipantAvatar,
  ParticipantAvatarStack,
} from '@entities/chat';
import type { ConversationListItem } from '@entities/chat';
import type { Message } from '../model/useMessages';
import { MessageInput } from './MessageInput';

interface ConversationDetailProps {
  conversation: ConversationListItem | undefined;
  messages: Message[];
  messagesLoading: boolean;
  currentUserId: string;
  currentUserName: string;
  typingUsers: string[];
  onBack: () => void;
  onSend: (text: string) => void;
  onNewConversation: () => void;
}

export function ConversationDetail({
  conversation,
  messages,
  messagesLoading,
  currentUserId,
  currentUserName,
  typingUsers,
  onBack,
  onSend,
  onNewConversation,
}: ConversationDetailProps) {
  if (!conversation) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30`}
      >
        <div className="w-20 h-20 relative mb-4">
          <Image src="/platform/info/chatting.svg" alt="" fill className="object-contain" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Select a conversation</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Choose from your existing conversations or start a new one to begin messaging.
        </p>
        <button
          onClick={onNewConversation}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
        >
          New Conversation
        </button>
      </div>
    );
  }

  const otherParticipants = conversation.participants
    .filter(p => p.user.id !== currentUserId)
    .map(p => p.user);
  const isDirectChat = conversation.type === 'DIRECT';
  const firstOtherParticipant = otherParticipants[0];
  const otherParticipantName = firstOtherParticipant?.name || 'User';
  const otherParticipantAvatar = firstOtherParticipant?.avatar;
  const profileLink = firstOtherParticipant ? `/resident/${firstOtherParticipant.id}` : '#';

  return (
    <div
      className={`flex-1 flex-col h-full bg-gray-50/30 ${conversation ? 'flex' : 'hidden md:flex'}`}
    >
      <div className="flex flex-col h-full bg-white relative">
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-gray-505 hover:text-gray-900 transition hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      <span className="text-blue-500 text-xs" title="Verified Resident">
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
                      {conversation.name || 'Group Conversation'}
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      {otherParticipants.length + 1} participants
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {isDirectChat && firstOtherParticipant && (
            <Link
              href={profileLink}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-full font-semibold hover:bg-gray-50 transition text-gray-700 hover:border-gray-300"
            >
              View Profile
            </Link>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
          {isDirectChat && firstOtherParticipant ? (
            <div className="flex flex-col items-center justify-center text-center py-10 border-b border-gray-50 mb-6 bg-gradient-to-b from-gray-50/50 to-transparent rounded-2xl px-4">
              <div className="w-16 h-16 relative mb-4">
                {otherParticipantAvatar ? (
                  <Image
                    src={otherParticipantAvatar}
                    alt={otherParticipantName}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                    unoptimized
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
          ) : otherParticipants.length > 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 border-b border-gray-50 mb-6 bg-gradient-to-b from-gray-50/50 to-transparent rounded-2xl px-4">
              <div className="mb-4">
                <ParticipantAvatarStack participants={otherParticipants} max={5} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {conversation.name || 'Group Conversation'}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">
                {otherParticipants.length + 1} participants
              </p>
            </div>
          ) : null}

          {messagesLoading ? (
            <p className="text-center text-gray-400 py-8 text-sm">Loading messages...</p>
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

        <TypingIndicator message={typingUsers.length > 0 ? 'Someone is typing...' : null} />

        <MessageInput onSend={onSend} />
      </div>
    </div>
  );
}
