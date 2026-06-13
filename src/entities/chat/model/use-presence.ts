'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('usePresence');

/**
 * Supabase client type.
 */
type Supabase = SupabaseClient | null;

/**
 * Presence tracker data.
 */
type PresenceData = {
  user_id?: string;
  online_at?: string;
};

/**
 * Hook for tracking online presence.
 * Uses Supabase presence feature to track which users are currently online in a conversation.
 */
export function usePresence(conversationId: string | null, userId: string) {
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

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  /**
   * Track user as online in the conversation.
   */
  const trackOnline = useCallback(async () => {
    if (!conversationId || !supabase) {
      return;
    }

    try {
      await supabase.channel(`presence:${conversationId}`).track({
        user_id: userId,
        online_at: new Date().toISOString(),
      });
    } catch (err) {
      log.error({ err }, 'Failed to track presence');
    }
  }, [conversationId, supabase, userId]);

  /**
   * Untrack user (mark as offline).
   */
  const trackOffline = useCallback(async () => {
    if (!conversationId || !supabase) {
      return;
    }

    try {
      await supabase.channel(`presence:${conversationId}`).untrack();
    } catch (err) {
      log.error({ err }, 'Failed to untrack presence');
    }
  }, [conversationId, supabase]);

  useEffect(() => {
    // Don't track presence if no conversation or supabase client
    if (!conversationId || !supabase) {
      return;
    }

    const channel = supabase.channel(`presence:${conversationId}`);

    // Handle presence sync events
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, PresenceData[]>;

      // Get all user IDs except our own
      const otherUsers = Object.keys(state).filter(u => {
        const presenceData = state[u]?.[0];
        return u !== userId && presenceData?.user_id !== userId;
      });

      setOnlineUsers(otherUsers);
      log.debug({ onlineUsers: otherUsers }, 'Presence synced');
    });

    // Handle presence join events
    channel.on(
      'presence',
      { event: 'join' },
      (payload: { key: string; newPresences: PresenceData[] }) => {
        log.debug({ key: payload.key }, 'User joined');
      }
    );

    // Handle presence leave events
    channel.on(
      'presence',
      { event: 'leave' },
      (payload: { key: string; leftPresences: PresenceData[] }) => {
        log.debug({ key: payload.key }, 'User left');
      }
    );

    // Subscribe and track our presence
    channel.subscribe(async () => {
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      });
      setIsOnline(true);
      log.info({ conversationId, userId }, 'Presence tracked');
    });

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
      setIsOnline(false);
      setOnlineUsers([]);
      log.info({ conversationId }, 'Presence cleanup');
    };
  }, [conversationId, supabase, userId, trackOnline, trackOffline]);

  return {
    onlineUsers,
    isOnline,
    trackOnline,
    trackOffline,
  };
}
