'use client';

import { useCallback, useRef, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('useTypingIndicator');

/**
 * Supabase client type.
 */
type Supabase = SupabaseClient | null;

/**
 * Typing indicator payload structure.
 */
interface TypingPayload {
  userId: string;
  userName?: string;
  isTyping: boolean;
  timestamp: string;
}

/**
 * Hook for broadcasting typing indicator status.
 * Uses Supabase channel broadcast to send typing status.
 */
export function useTypingIndicator(conversationId: string | null, userId: string) {
  // Create supabase client once
  const [supabase] = useState<Supabase>(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      log.error({}, 'Missing Supabase environment variables');
      return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey);
  });

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Broadcast typing status to other participants.
   */
  const broadcastTyping = useCallback(
    async (isTyping: boolean) => {
      if (!conversationId || !supabase) {
        return;
      }

      try {
        const channel = supabase.channel(`typing:${conversationId}`);

        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId,
            isTyping,
            timestamp: new Date().toISOString(),
          } as TypingPayload,
        });

        log.debug({ conversationId, userId, isTyping }, 'Typing status broadcast');
      } catch (err) {
        log.error({ err }, 'Failed to broadcast typing status');
      }
    },
    [conversationId, supabase, userId]
  );

  /**
   * Start typing - sends true and sets auto-expire timeout.
   */
  const startTyping = useCallback(() => {
    broadcastTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 3000);
  }, [broadcastTyping]);

  /**
   * Stop typing immediately.
   */
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    broadcastTyping(false);
  }, [broadcastTyping]);

  /**
   * Listen for typing indicators from other users.
   */
  const onTypingIndicator = useCallback(
    (callback: (payload: TypingPayload) => void) => {
      if (!conversationId || !supabase) {
        return () => {};
      }

      const channel = supabase.channel(`typing:${conversationId}`);

      channel.on('broadcast', { event: 'typing' }, (payload: { payload: TypingPayload }) => {
        // Ignore our own typing indicators
        if (payload.payload.userId !== userId) {
          callback(payload.payload);
        }
      });

      channel.subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    [conversationId, supabase, userId]
  );

  return {
    startTyping,
    stopTyping,
    onTypingIndicator,
  };
}