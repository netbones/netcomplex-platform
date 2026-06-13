'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { authClient } from '@api/client';
import type { ConversationMessage } from '@entities/chat';
import { usePresence } from '@entities/chat';
import { OnlineIndicator } from '@entities/chat';
import { apiGet, apiPost } from '@api/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface DirectoryChatModalProps {
  recipientId: string;
  recipientName: string;
  onClose: () => void;
}

export function DirectoryChatModal({
  recipientId,
  recipientName,
  onClose,
}: DirectoryChatModalProps) {
  const { data: session } = authClient.useSession();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUserId = session?.user?.id || '';

  const { onlineUsers, isOnline } = usePresence(conversationId, currentUserId);
  const recipientOnline = onlineUsers.includes(recipientId);

  // Find or create conversation
  useEffect(() => {
    if (!currentUserId) return;

    const initConversation = async () => {
      try {
        const data = await apiPost<{ conversation?: { id: string } }>('/api/conversations/find', {
          participantIds: [currentUserId, recipientId],
        });
        if (data?.conversation?.id) {
          setConversationId(data.conversation.id);
        }
      } catch {
        // Silently fail - user will see empty state
      } finally {
        setLoading(false);
      }
    };

    initConversation();
  }, [currentUserId, recipientId]);

  // Fetch messages
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        const data = await apiGet<ConversationMessage[]>(`/api/messages`, { conversationId });
        setMessages(Array.isArray(data) ? data : []);
      } catch {
        // Silently fail
      }
    };

    fetchMessages();
  }, [conversationId]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        payload => {
          const newMessage = payload.new as ConversationMessage;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !conversationId || sending) return;

    setSending(true);
    try {
      const newMessage = await apiPost<ConversationMessage>('/api/messages', {
        conversationId,
        content: input.trim(),
        type: 'TEXT',
      });
      setMessages(prev => [...prev, newMessage]);
      setInput('');
      inputRef.current?.focus();
    } catch {
      // Silently fail
    } finally {
      setSending(false);
    }
  }, [input, conversationId, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-soralia-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-soralia-primary">
                {recipientName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{recipientName}</h3>
              {isOnline && recipientOnline && <OnlineIndicator count={1} showLabel={false} />}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Say hello to {recipientName}!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isOwn = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      isOwn ? 'bg-soralia-primary text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary text-sm"
              disabled={sending || !conversationId}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || !conversationId}
              className="px-4 py-2 bg-soralia-primary text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  );
}
