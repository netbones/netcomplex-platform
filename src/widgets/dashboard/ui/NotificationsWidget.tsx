'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { authClient } from '@api/client';
import { useNotifSubscription } from '../model/useNotifSubscription';

interface NotificationsWidgetProps {
  count?: number;
}

export function NotificationsWidget({ count = 0 }: NotificationsWidgetProps) {
  const [unread, setUnread] = useState(count);
  const [liveText, setLiveText] = useState('');
  const prevUnread = useRef(count);
  const { data: session } = authClient.useSession();

  const refresh = useCallback(() => {
    fetch('/api/notifications?unread=true', { credentials: 'same-origin' })
      .then(res => res.ok && res.json())
      .then(body => setUnread(body?.data?.length ?? 0))
      .catch(() => {});
  }, []);

  useNotifSubscription(session?.user?.id, refresh);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (unread > prevUnread.current) {
      setLiveText(
        `${unread - prevUnread.current} new notification${unread - prevUnread.current !== 1 ? 's' : ''}. ${unread} total unread.`
      );
    }
    prevUnread.current = unread;
  }, [unread]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'g' && !e.repeat) {
        const onG = (e2: KeyboardEvent) => {
          window.removeEventListener('keydown', onG);
          if (e2.key === 'n' && !e2.repeat) {
            window.location.href = '/notifications';
          }
        };
        window.addEventListener('keydown', onG);
        setTimeout(() => window.removeEventListener('keydown', onG), 1000);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="text-center py-4 text-gray-500" aria-live="polite" aria-atomic="true">
      <p className="text-sm">{unread > 0 ? `${unread} unread` : 'No new notifications'}</p>
      <div className="sr-only" role="status">
        {liveText}
      </div>
    </div>
  );
}
