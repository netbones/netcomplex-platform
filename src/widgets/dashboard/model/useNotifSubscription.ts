'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('useNotifSubscription');

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      log.warn({}, 'Missing Supabase env vars — realtime notifications disabled');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const channel = supabase.channel(`notifications:${userId}`);

    channel
      .on(
        'broadcast',
        { event: 'new-notification' },
        ({ payload }: { payload: NotificationPayload }) => {
          toast(payload.title, {
            description: payload.message,
            duration: 5000,
          });
          onNewRef.current?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
