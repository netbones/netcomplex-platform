'use client';

import { useState, useEffect } from 'react';
import { ChatWindow } from '@/components/chat/ChatWindow';

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  participants: { id: string; name: string; avatar: string | null }[];
}

const currentUserId = 'demo-user-id';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch(`/api/conversations?userId=${currentUserId}`);
        const data = await res.json();
        setConversations(data);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, []);

  return (
    <main className="min-h-screen bg-soralia-light">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-soralia-primary mb-8">Messages</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Conversations</h2>

            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No conversations yet</p>
                <button className="text-soralia-primary hover:underline">
                  Start a new conversation
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedConversation === conv.id
                        ? 'bg-soralia-light border border-soralia-primary'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium">
                      {conv.name ||
                        conv.participants.find(p => p.id !== currentUserId)?.name ||
                        'New Conversation'}
                    </p>
                    <p className="text-sm text-gray-500">{conv.participants.length} participants</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            {selectedConversation ? (
              <ChatWindow conversationId={selectedConversation} currentUserId={currentUserId} />
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
