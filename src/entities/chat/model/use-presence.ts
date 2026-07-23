'use client';

import { useEffect, useState, useCallback } from 'react';
import { createComponentLogger } from '@shared/lib';
import { createPresenceChannel } from '@shared/lib';

const log = createComponentLogger('usePresence');

export function usePresence(conversationId: string | null, userId: string) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  const trackOnline = useCallback(async () => {
    if (!conversationId) return;
    try {
      const pc = createPresenceChannel(conversationId, userId);
      await pc.track();
      pc.unsubscribe();
    } catch (err) {
      log.error({ err }, 'Failed to track presence');
    }
  }, [conversationId, userId]);

  const trackOffline = useCallback(async () => {
    if (!conversationId) return;
    try {
      const pc = createPresenceChannel(conversationId, userId);
      await pc.untrack();
      pc.unsubscribe();
    } catch (err) {
      log.error({ err }, 'Failed to untrack presence');
    }
  }, [conversationId, userId]);

  useEffect(() => {
    if (!conversationId) return;

    const pc = createPresenceChannel(conversationId, userId);

    pc.onSync((otherUsers, _state) => {
      setOnlineUsers(otherUsers);
      log.debug({ onlineUsers: otherUsers }, 'Presence synced');
    });

    pc.onJoin(payload => {
      log.debug({ key: payload.key }, 'User joined');
    });

    pc.onLeave(payload => {
      log.debug({ key: payload.key }, 'User left');
    });

    pc.subscribe(async () => {
      await pc.track();
      setIsOnline(true);
      log.info({ conversationId, userId }, 'Presence tracked');
    });

    return () => {
      pc.unsubscribe();
      setIsOnline(false);
      setOnlineUsers([]);
      log.info({ conversationId }, 'Presence cleanup');
    };
  }, [conversationId, userId]);

  return {
    onlineUsers,
    isOnline,
    trackOnline,
    trackOffline,
  };
}
