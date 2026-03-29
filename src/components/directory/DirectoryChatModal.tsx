'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

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

interface ChatModalProps {
  recipientId: string;
  recipientName: string;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
}

export function ChatModal({
  recipientId,
  recipientName,
  currentUserId,
  currentUserName,
  onClose,
}: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function initChat() {
      const res = await fetch('/api/conversations/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: [currentUserId, recipientId],
        }),
      });
      const data = await res.json();
      if (data.conversation) {
        setConversationId(data.conversation.id);
        const msgRes = await fetch(`/api/messages?conversationId=${data.conversation.id}`);
        const msgData = await msgRes.json();
        setMessages(msgData);
      }
      setLoading(false);
    }
    initChat();
  }, [currentUserId, recipientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('broadcast', { event: 'new-message' }, payload => {
        setMessages(prev => [...prev, payload.payload as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  async function handleSend() {
    if (!newMessage.trim() || !conversationId) return;

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
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-soralia-primary/20 flex items-center justify-center">
              <span className="text-soralia-primary font-semibold">
                {recipientName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Chat with {recipientName}</h3>
              <p className="text-xs text-gray-500">Direct message</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
          {loading ? (
            <p className="text-center text-gray-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
          ) : (
            <>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender.id === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      msg.sender.id === currentUserId
                        ? 'bg-soralia-primary text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">
                      {msg.sender.id === currentUserId ? 'You' : msg.sender.name}
                    </p>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="border-t p-4 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="bg-soralia-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  );
}
