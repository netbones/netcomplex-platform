'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { subscribeNotifications } from '@shared/lib';

interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: string;
}

export function useNotifSubscription(userId: string | undefined, onNew?: () => void) {
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    if (!userId) return;

    return subscribeNotifications(userId, payload => {
      const n = payload as unknown as NotificationPayload;
      toast(n.title, {
        description: n.message,
        duration: 5000,
      });
      onNewRef.current?.();
    });
  }, [userId]);
}
