'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { usePresence, useTypingIndicator } from './useChatPresence';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Message {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  sender: { id: string; name: string; avatar: string | null };
}

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  participants: { id: string; name: string; avatar: string | null }[];
  messages: { content: string; createdAt: string }[];
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
}

export function ChatWindow({ conversationId, currentUserId, currentUserName }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { onlineUsers, userCount } = usePresence({
    channelId: conversationId,
    user: { id: currentUserId, name: currentUserName, avatar: null },
  });

  const { typingUsers, sendTypingIndicator } = useTypingIndicator(
    conversationId,
    currentUserId,
    currentUserName
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    async function fetchMessages() {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await res.json();
      setMessages(data);
      setLoading(false);
    }
    fetchMessages();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendTypingIndicator(true);

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    sendTypingIndicator(false);

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        senderId: currentUserId,
        content: newMessage,
      }),
    });

    if (res.ok) {
      setNewMessage('');
    }
  };

  const formatTypingUsers = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return 'Someone is typing...';
    if (typingUsers.length === 2) return 'Two people are typing...';
    return 'Several people are typing...';
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-lg shadow">
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-gray-600">{userCount} online</span>
        </div>
        <span className="text-xs text-gray-400">
          {Object.keys(onlineUsers)
            .filter(id => id !== currentUserId)
            .join(', ') || 'No others online'}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-center text-gray-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.sender.id === currentUserId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.sender.id === currentUserId
                    ? 'bg-soralia-primary text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm font-medium mb-1">{msg.sender.name}</p>
                <p>{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {formatTypingUsers() && (
        <div className="px-4 py-1 text-xs text-gray-500 italic">{formatTypingUsers()}</div>
      )}

      <div className="border-t p-4 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
        />
        <button
          onClick={handleSend}
          className="bg-soralia-primary text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
