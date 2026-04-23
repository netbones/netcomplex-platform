'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Message } from '@entities/chat';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('useRealtimeMessages');

/**
 * Supabase client type.
 */
type Supabase = SupabaseClient | null;

/**
 * Postgres changes payload.
 */
interface PostgresChangePayload {
  new: Message;
}

/**
 * Channel type reference.
 */
type ChannelType = ReturnType<SupabaseClient['channel']>;

/**
 * Real-time message subscription hook.
 * Subscribes to new messages in a conversation using Supabase Realtime.
 */
export function useRealtimeMessages(
  conversationId: string | null,
  onNewMessage?: (message: Message) => void
): { isConnected: boolean; error: string | null } {
  // Create supabase client once
  const supabase = useState<Supabase>(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      log.error({}, 'Missing Supabase environment variables');
      return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey);
  })[0];

  const channelRef = useRef<ChannelType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize the callback to prevent unnecessary re-subscriptions
  const handleNewMessage = useCallback(
    (payload: PostgresChangePayload) => {
      if (onNewMessage) {
        onNewMessage(payload.new);
      }
    },
    [onNewMessage]
  );

  useEffect(() => {
    // Don't subscribe if no conversation or supabase client
    if (!conversationId || !supabase) {
      return;
    }

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    try {
      // Create channel for this conversation
      const channel = supabase.channel(`messages:${conversationId}`);

      // Subscribe to INSERT events on the Message table
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload: PostgresChangePayload) => {
          log.debug({ payload }, 'New message received');
          handleNewMessage(payload);
        }
      );

      // Subscribe and handle state changes
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
          log.info({ conversationId }, 'Realtime subscription connected');
        } else if (status === 'CHANNEL_ERROR') {
          setError('Failed to subscribe to channel');
          log.error({ conversationId }, 'Channel error');
        }
      });

      channelRef.current = channel;
      setIsConnected(true);
    } catch (err) {
      log.error({ err, conversationId }, 'Failed to create subscription');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    // Cleanup on unmount or conversation change
    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
        log.info({ conversationId }, 'Realtime subscription cleaned up');
      }
    };
  }, [conversationId, supabase, handleNewMessage]);

  return {
    isConnected,
    error,
  };
}