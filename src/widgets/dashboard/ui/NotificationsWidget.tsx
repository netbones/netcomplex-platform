'use client';

import { useEffect, useState } from 'react';

interface NotificationsWidgetProps {
  count?: number;
}

export function NotificationsWidget({ count = 0 }: NotificationsWidgetProps) {
  const [unread, setUnread] = useState(count);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/notifications?unread=true', { credentials: 'same-origin' });
        if (!res.ok) return;
        const body = await res.json();
        setUnread(body.data?.length ?? 0);
      } catch {
        // polling degraded — keep previous count
      }
    };

    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center py-4 text-gray-500">
      <p className="text-sm">{unread > 0 ? `${unread} unread` : 'No new notifications'}</p>
    </div>
  );
}
