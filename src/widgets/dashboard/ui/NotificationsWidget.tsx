'use client';

import { useEffect, useState, useRef } from 'react';
import { authClient, trpc } from '@api/client';
import { useNotifSubscription } from '../model/useNotifSubscription';

interface NotificationsWidgetProps {
  count?: number;
}

export function NotificationsWidget({ count = 0 }: NotificationsWidgetProps) {
  const [unread, setUnread] = useState(count);
  const [liveText, setLiveText] = useState('');
  const prevUnread = useRef(count);
  const { data: session } = authClient.useSession();

  const { data: notifData, refetch } = trpc.notifications.list.useQuery(
    { unread: true },
    { staleTime: 30_000, refetchInterval: 30_000 }
  );

  useEffect(() => {
    const list = notifData?.data;
    setUnread(Array.isArray(list) ? list.length : 0);
  }, [notifData]);

  useEffect(() => {
    if (unread > prevUnread.current) {
      setLiveText(
        `${unread - prevUnread.current} new notification${unread - prevUnread.current !== 1 ? 's' : ''}. ${unread} total unread.`
      );
    }
    prevUnread.current = unread;
  }, [unread]);

  useNotifSubscription(session?.user?.id, refetch);

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
