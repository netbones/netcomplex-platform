'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import type { ServiceListing } from '@entities/service';
import type { ConversationMessage } from '@entities/chat';
import { EmojiPickerButton } from '@entities/chat';
import { trpc, useSession } from '@api/client';
import { apiGet, apiPost } from '@api/shared';
import { subscribeChatMessages } from '@shared/lib';

import {
  ArrowLeft,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  Mic,
  Phone,
  Square,
  X,
} from 'lucide-react';

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
  const [recording, setRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
    return subscribeChatMessages(conversationId, msg => {
      setMessages(prev => [...prev, msg as unknown as ConversationMessage]);
    });
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

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          if (!conversationId) return;
          try {
            const newMsg = await apiPost<ConversationMessage>('/api/messages', {
              conversationId,
              content: '',
              type: 'VOICE',
              mediaUrl: reader.result as string,
            });
            setMessages(prev => [...prev, newMsg]);
          } catch {
            // silent
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setRecording(true);
    } catch {
      // mic denied or unavailable
    }
  }, [conversationId]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

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
                <ArrowLeft className="text-lg" />
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
                <X className="text-lg" />
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
                  const isType = (msg as { type?: string }).type;
                  const mediaUrl = (msg as { mediaUrl?: string }).mediaUrl;
                  const isImage = isType === 'IMAGE' && mediaUrl;
                  const isVoice = isType === 'VOICE' && mediaUrl;
                  const payload = (msg as { payload?: { duration?: number } }).payload;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 ${
                          isOwn ? 'bg-soralia-primary text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {isVoice && mediaUrl ? (
                          <div className="flex items-center gap-2 my-1">
                            <audio src={mediaUrl} controls className="max-w-full h-8" />
                            {payload?.duration != null && (
                              <span className="text-xs opacity-70">
                                {formatDuration(payload.duration)}
                              </span>
                            )}
                          </div>
                        ) : isImage && mediaUrl ? (
                          <Image
                            src={mediaUrl}
                            alt="Shared image"
                            width={300}
                            height={200}
                            className="max-w-full max-h-[200px] object-cover rounded-lg my-1"
                            unoptimized
                          />
                        ) : (
                          <p className="text-sm break-words">{msg.content}</p>
                        )}
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
                <EmojiPickerButton
                  onEmojiSelect={emoji => {
                    setInput(prev => prev + emoji);
                    inputRef.current?.focus();
                  }}
                />
                <label className="cursor-pointer p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file || !conversationId) return;
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        try {
                          const newMsg = await apiPost<ConversationMessage>('/api/messages', {
                            conversationId,
                            content: 'Image',
                            type: 'IMAGE',
                            mediaUrl: reader.result as string,
                          });
                          setMessages(prev => [...prev, newMsg]);
                        } catch {
                          // silent
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <ImageIcon className="text-lg" />
                </label>
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`p-2.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    recording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-label={recording ? 'Stop recording' : 'Record voice note'}
                  type="button"
                >
                  {recording ? <Square className="text-lg" /> : <Mic className="text-lg" />}
                </button>
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
                <X className="text-lg" />
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
                        <Mail className="text-xs" />
                        Email
                      </a>
                    )}

                    {listing.provider.phone && (
                      <a
                        href={`tel:${listing.provider.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-green-50 rounded-full hover:bg-green-100 min-w-[44px] min-h-[44px]"
                      >
                        <Phone className="text-xs" />
                        Call
                      </a>
                    )}

                    {session?.user?.id && listing.provider.id && (
                      <button
                        onClick={handleOpenChat}
                        disabled={findOrCreate.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-700 bg-blue-50 rounded-full hover:bg-blue-100 disabled:opacity-50 min-w-[44px] min-h-[44px]"
                      >
                        <MessageSquare className="text-xs" />
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
