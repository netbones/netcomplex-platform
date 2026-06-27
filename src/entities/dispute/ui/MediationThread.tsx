'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { DisputeMessageDTO } from '../model/types';
import { MediationMessageBubble } from './MediationMessageBubble';
import { supabase } from '@api/shared';
import { LoadingSkeleton } from '@shared/ui';
import { toast } from 'sonner';

interface MediationThreadProps {
  disputeId: string;
  userRole: string;
  userId: string;
}

export function MediationThread({ disputeId, userRole, userId }: MediationThreadProps) {
  const [messages, setMessages] = useState<DisputeMessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [scrolledUp, setScrolledUp] = useState(false);
  const scrolledUpRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync with state
  useEffect(() => {
    scrolledUpRef.current = scrolledUp;
  }, [scrolledUp]);

  const isModerator = userRole === 'BOARD' || userRole === 'ADMIN' || userRole === 'COMMITTEE';

  /* ── Fetch messages ─────────────────────────────────── */
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/disputes/${disputeId}/messages`);
      if (!res.ok) throw new Error(`Failed to load messages: ${res.status}`);
      const json = await res.json();
      const data = json.data ?? json;
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  /* ── Supabase Realtime ──────────────────────────────── */
  useEffect(() => {
    const channel = supabase
      .channel(`dispute:${disputeId}`)
      .on('broadcast', { event: 'new-mediation-message' }, payload => {
        const newMsg = payload.payload as DisputeMessageDTO;
        if (newMsg && newMsg.disputeId === disputeId) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Auto-scroll if at bottom
          if (!scrolledUpRef.current) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [disputeId]);

  /* ── Scroll handling ────────────────────────────────── */
  useEffect(() => {
    if (!scrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages.length, scrolledUp]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setScrolledUp(!atBottom);
  };

  /* ── Send message ────────────────────────────────────── */
  const handleSend = async () => {
    const trimmed = newContent.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const res = await fetch(`/api/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, isInternal }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message || `Failed to send: ${res.status}`);
      }
      setNewContent('');
      setIsInternal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Render ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <LoadingSkeleton key={i} lines={2} height="h-10" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-gray-200 rounded-lg bg-white h-[600px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="text-sm font-semibold text-gray-700">Mediation Thread</h3>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        role="log"
        aria-label="Mediation thread messages"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">
              No messages yet. Messages in the mediation thread will appear here.
            </p>
          </div>
        )}

        {messages.map(msg => (
          <MediationMessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === userId}
            showInternal={isModerator}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* New messages indicator */}
      {scrolledUp && messages.length > 0 && (
        <button
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            setScrolledUp(false);
          }}
          className="mx-auto mb-1 px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full hover:bg-indigo-200 transition-colors"
        >
          New messages ↓
        </button>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200">
        {isModerator && (
          <label className="flex items-center gap-2 mb-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={e => setIsInternal(e.target.checked)}
              className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
            />
            Post as internal note
          </label>
        )}
        <div className="flex gap-2">
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-soralia-primary"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!newContent.trim() || sending}
            className="px-4 py-2 bg-soralia-primary text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
