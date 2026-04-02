'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface PresenceState {
  [userId: string]: {
    user: { id: string; name: string; avatar: string | null };
    online_at: string;
  }[];
}

interface RawPresenceState {
  [key: string]: Array<{ presence_ref: string } | Record<string, unknown>>;
}

interface UsePresenceOptions {
  channelId: string;
  user: { id: string; name: string; avatar: string | null };
}

export function usePresence({ channelId, user }: UsePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const channel = supabase.channel(`presence:${channelId}`, {
      config: {
        presence: { key: user.id },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as RawPresenceState;
        const formatted: PresenceState = {};

        Object.entries(state).forEach(([key, values]) => {
          const validUsers = values.filter(
            (
              v
            ): v is {
              user: { id: string; name: string; avatar: string | null };
              online_at: string;
            } => 'user' in v && 'online_at' in v
          );
          if (validUsers.length > 0) {
            formatted[key] = validUsers;
          }
        });

        setOnlineUsers(formatted);
        setIsLoading(false);
      })
      .on('presence', { event: 'join' }, payload => {
        console.log('User joined:', payload);
      })
      .on('presence', { event: 'leave' }, payload => {
        console.log('User left:', payload);
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user: { id: user.id, name: user.name, avatar: user.avatar },
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [channelId, user.id, user.name, user.avatar]);

  const userCount = Object.keys(onlineUsers).length;

  return {
    onlineUsers,
    userCount,
    isLoading,
  };
}

export function useTypingIndicator(channelId: string, userId: string, userName: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`typing:${channelId}`);

    channel
      .on('broadcast', { event: 'typing' }, payload => {
        const { userId: typingUserId, isTyping } = payload.payload;
        setTypingUsers(prev => {
          if (isTyping && typingUserId !== userId) {
            return prev.includes(typingUserId) ? prev : [...prev, typingUserId];
          } else if (!isTyping) {
            return prev.filter(id => id !== typingUserId);
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, userId]);

  const sendTypingIndicator = useCallback(
    async (isTyping: boolean) => {
      const channel = supabase.channel(`typing:${channelId}`);
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, userName, isTyping },
      });
    },
    [channelId, userId, userName]
  );

  return { typingUsers, sendTypingIndicator };
}
