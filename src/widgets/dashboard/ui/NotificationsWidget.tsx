'use client';

import { useEffect, useState, useCallback } from 'react';
import { authClient } from '@api/client';
import { useNotifSubscription } from '../model/useNotifSubscription';

interface NotificationsWidgetProps {
  count?: number;
}

export function NotificationsWidget({ count = 0 }: NotificationsWidgetProps) {
  const [unread, setUnread] = useState(count);
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

  return (
    <div className="text-center py-4 text-gray-500">
      <p className="text-sm">{unread > 0 ? `${unread} unread` : 'No new notifications'}</p>
    </div>
  );
}
