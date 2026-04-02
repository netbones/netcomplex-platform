'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export interface Message {
  id: string;
  content: string;
  type: string;
  mediaUrl?: string;
  createdAt: string;
  sender: { id: string; name: string; avatar: string | null };
}

export interface UseChatOptions {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
}

export function useChat({ conversationId, currentUserId, currentUserName }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  useEffect(() => {
    async function fetchMessages() {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await res.json();
      setMessages(data);
      setLoading(false);
    }
    fetchMessages();
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        payload => {
          const newMessage = payload.new;
          setMessages(prev => [
            ...prev,
            {
              id: newMessage.id,
              content: newMessage.content,
              type: newMessage.type,
              mediaUrl: newMessage.mediaUrl,
              createdAt: newMessage.createdAt,
              sender: { id: newMessage.senderId, name: '', avatar: null },
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Subscribe to presence
  useEffect(() => {
    const presenceChannel = supabase.channel(`presence:${conversationId}`, {
      config: { presence: { key: currentUserId } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user: { id: currentUserId, name: currentUserName, avatar: null },
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  }, [conversationId, currentUserId, currentUserName]);

  // Subscribe to typing indicators
  useEffect(() => {
    const typingChannel = supabase.channel(`typing:${conversationId}`);

    typingChannel
      .on('broadcast', { event: 'typing' }, payload => {
        const { userId, isTyping } = payload.payload;
        setTypingUsers(prev => {
          if (isTyping && userId !== currentUserId) {
            return prev.includes(userId) ? prev : [...prev, userId];
          } else if (!isTyping) {
            return prev.filter(id => id !== userId);
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [conversationId, currentUserId]);

  // Send message
  const sendMessage = useCallback(
    async (content: string, type: string = 'TEXT', mediaUrl?: string) => {
      sendTypingIndicator(false);

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content, type, mediaUrl }),
      });

      return res.ok;
    },
    [conversationId]
  );

  // Send typing indicator
  const sendTypingIndicator = useCallback(
    async (isTyping: boolean) => {
      const channel = supabase.channel(`typing:${conversationId}`);
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, userName: currentUserName, isTyping },
      });
    },
    [conversationId, currentUserId, currentUserName]
  );

  // Handle input change with typing indicator
  const handleInputChange = useCallback(
    (value: string, setValue: (v: string) => void) => {
      setValue(value);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      sendTypingIndicator(true);

      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 2000);
    },
    [sendTypingIndicator]
  );

  // Format typing users for display
  const formatTypingUsers = useCallback(() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return 'Someone is typing...';
    if (typingUsers.length === 2) return 'Two people are typing...';
    return 'Several people are typing...';
  }, [typingUsers]);

  return {
    messages,
    loading,
    onlineCount,
    typingUsers,
    messagesEndRef,
    sendMessage,
    handleInputChange,
    sendTypingIndicator,
    formatTypingUsers,
  };
}

// Direct chat hook - simplified for 1-on-1 conversations
export interface UseDirectChatOptions {
  recipientId: string;
  recipientName: string;
  currentUserId: string;
  currentUserName: string;
}

export function useDirectChat({
  recipientId,
  currentUserId,
  currentUserName,
}: UseDirectChatOptions) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chat = useChat({
    conversationId: conversationId || '',
    currentUserId,
    currentUserName,
  });

  // Initialize conversation on mount
  useEffect(() => {
    async function initChat() {
      const res = await fetch('/api/conversations/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: [currentUserId, recipientId] }),
      });
      const data = await res.json();
      if (data.conversation) {
        setConversationId(data.conversation.id);
      }
    }
    initChat();
  }, [currentUserId, recipientId]);

  return {
    ...chat,
    conversationId,
    isReady: !!conversationId,
  };
}
