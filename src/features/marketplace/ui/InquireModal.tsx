'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { ServiceListing } from '@entities/service';
import type { ConversationMessage } from '@entities/chat';
import { trpc, useSession } from '@api/client';
import { apiGet, apiPost } from '@api/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface InquireModalProps {
  listing: ServiceListing;
  isOpen: boolean;
  onClose: () => void;
}

export function InquireModal({ listing, isOpen, onClose }: InquireModalProps) {
  const { data: session } = useSession();
  const findOrCreate = trpc.chat.findOrCreateConversation.useMutation();
  const [chatView, setChatView] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUserId = session?.user?.id || '';
  const recipientId = listing.provider?.id || '';

  // Find or create conversation
  useEffect(() => {
    if (!chatView || !currentUserId || !recipientId) return;
    let cancelled = false;

    const initChat = async () => {
      setChatLoading(true);
      try {
        const data = await apiPost<{ conversation?: { id: string } }>('/api/conversations/find', {
          participantIds: [currentUserId, recipientId],
        });
        if (!cancelled && data?.conversation?.id) {
          setConversationId(data.conversation.id);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    };

    initChat();
    return () => {
      cancelled = true;
    };
  }, [chatView, currentUserId, recipientId]);

  // Fetch messages
  useEffect(() => {
    if (!conversationId) return;
    const fetchMessages = async () => {
      try {
        const data = await apiGet<ConversationMessage[]>('/api/messages', {
          conversationId,
        });
        setMessages(Array.isArray(data) ? data : []);
      } catch {
        // silent
      }
    };
    fetchMessages();
  }, [conversationId]);

  // Realtime messages
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
          setMessages(prev => [...prev, payload.new as ConversationMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatView) inputRef.current?.focus();
  }, [chatView]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !conversationId || sending) return;
    setSending(true);
    try {
      const newMsg = await apiPost<ConversationMessage>('/api/messages', {
        conversationId,
        content: input.trim(),
        type: 'TEXT',
      });
      setMessages(prev => [...prev, newMsg]);
      setInput('');
      inputRef.current?.focus();
    } catch {
      // silent
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

  const handleClose = useCallback(() => {
    setChatView(false);
    setConversationId(null);
    setMessages([]);
    setInput('');
    onClose();
  }, [onClose]);

  const handleBackFromChat = useCallback(() => {
    setChatView(false);
  }, []);

  const handleOpenChat = useCallback(() => {
    if (!session?.user?.id || !listing.provider?.id) return;
    setChatView(true);
  }, [session, listing.provider]);

  if (!isOpen) return null;

  return (
    <>
      <button
        className="fixed inset-0 bg-black/50 z-40 cursor-default"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)]">
        {chatView ? (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <button
                onClick={handleBackFromChat}
                className="p-2 text-gray-500 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Back"
              >
                <i className="fas fa-arrow-left text-lg" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-soralia-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-soralia-primary">
                    {(listing.provider?.name || 'P').charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  {listing.provider?.name || 'Provider'}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <i className="fas fa-times text-lg" />
              </button>
            </div>

            <div className="p-4 space-y-3 min-h-[250px] max-h-[50vh] overflow-y-auto">
              {chatLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-pulse text-gray-400">Loading...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Say hello to {listing.provider?.name}!</p>
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

            <div className="p-3 border-t border-gray-100">
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
                  className="px-4 py-2 bg-soralia-primary text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Inquire</h3>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <i className="fas fa-times text-lg" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-base font-medium text-gray-900">{listing.title}</h4>
                <p className="text-sm text-gray-500 mt-1">{listing.category}</p>
              </div>

              {listing.provider && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h5 className="text-sm font-medium text-gray-700">Provider Details</h5>
                  <p className="text-sm text-gray-900">{listing.provider.name}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    {listing.provider.email && (
                      <a
                        href={`mailto:${listing.provider.email}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-700 bg-indigo-50 rounded-full hover:bg-indigo-100 min-w-[44px] min-h-[44px]"
                      >
                        <i className="fas fa-envelope text-xs" />
                        Email
                      </a>
                    )}

                    {listing.provider.phone && (
                      <a
                        href={`tel:${listing.provider.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-green-50 rounded-full hover:bg-green-100 min-w-[44px] min-h-[44px]"
                      >
                        <i className="fas fa-phone text-xs" />
                        Call
                      </a>
                    )}

                    {session?.user?.id && listing.provider.id && (
                      <button
                        onClick={handleOpenChat}
                        disabled={findOrCreate.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-700 bg-blue-50 rounded-full hover:bg-blue-100 disabled:opacity-50 min-w-[44px] min-h-[44px]"
                      >
                        <i className="fas fa-comment text-xs" />
                        Chat
                      </button>
                    )}
                  </div>
                </div>
              )}

              {listing.price != null && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">Pricing</h5>
                  <p className="text-sm text-gray-900">
                    {listing.priceType} &mdash; {listing.price} {listing.currency}
                  </p>
                </div>
              )}

              {listing.serviceAreas?.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">Service Areas</h5>
                  <div className="flex flex-wrap gap-1">
                    {listing.serviceAreas.map(area => (
                      <span
                        key={area}
                        className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400">
                {listing.verified ? 'Verified provider' : 'This provider has not been verified'}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
