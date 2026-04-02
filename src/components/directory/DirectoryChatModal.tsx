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
  mediaUrl?: string;
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const commonEmojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '👏', '🙏', '😊'];

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

  async function handleSend() {
    if ((!newMessage.trim() && !selectedImage) || !conversationId) return;

    const messageData = selectedImage
      ? { conversationId, content: 'Image', type: 'IMAGE', mediaUrl: selectedImage }
      : { conversationId, content: newMessage, type: 'TEXT' };

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData),
    });

    if (res.ok) {
      setNewMessage('');
      setSelectedImage(null);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  function insertEmoji(emoji: string) {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
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
                    {msg.type === 'IMAGE' && msg.mediaUrl ? (
                      <img
                        src={msg.mediaUrl}
                        alt="Shared"
                        className="rounded-lg max-w-full h-auto mt-1"
                      />
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
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

        <div className="border-t p-4 flex flex-col gap-2">
          {selectedImage && (
            <div className="relative">
              <img src={selectedImage} alt="Preview" className="h-20 rounded-lg object-cover" />
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
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  {commonEmojis.map(emoji => (
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
              onChange={e => setNewMessage(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-soralia-primary"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() && !selectedImage}
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
    </div>
  );
}
