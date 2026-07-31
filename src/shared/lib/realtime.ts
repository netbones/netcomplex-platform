import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@api/shared';

type BroadcastHandler = (payload: Record<string, unknown>) => void;

function envClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

// ─── Chat ──────────────────────────────────────────────────────────────

export function subscribeChatMessages(
  conversationId: string,
  onMessage: (msg: Record<string, unknown>) => void
): () => void {
  const channel = supabase
    .channel(`chat:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Message',
        filter: `conversationId=eq.${conversationId}`,
      },
      payload => onMessage(payload.new as Record<string, unknown>)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function broadcastChatMessage(
  conversationId: string,
  message: Record<string, unknown>
): Promise<void> {
  await supabase.channel(`chat:${conversationId}`).send({
    type: 'broadcast',
    event: 'new-message',
    payload: message,
  });
}

// ─── Comments ──────────────────────────────────────────────────────────

/**
 * Subscribe to live `Comment` row changes for a single post.
 *
 * Listens for both `INSERT` (new top-level comments + replies) and
 * `UPDATE` (status transitions: PUBLISHED → FLAGGED → REMOVED/DELETED,
 * plus denormalised vote counter changes from `voteOnComment`).
 *
 * ADVISORY-037 P2.4 — without this channel, `useComments` is pull-only and
 * concurrent viewers see stale counts/status until manual refetch.
 *
 * Usage:
 *   useEffect(() => {
 *     return subscribeCommentUpdates(contentId, payload => {
 *       // payload.event === 'INSERT' | 'UPDATE'
 *       // payload.row is the raw comment row (Prisma column shape)
 *       // payload.old is the pre-image for UPDATE events (Supabase typing)
 *     });
 *   }, [contentId]);
 *
 * @returns unsubscribe function — caller MUST invoke on cleanup
 */
export function subscribeCommentUpdates(
  contentId: string,
  onChange: (payload: {
    event: 'INSERT' | 'UPDATE';
    row: Record<string, unknown>;
    old?: Record<string, unknown>;
  }) => void
): () => void {
  const channel = supabase
    .channel(`comments:${contentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'Comment',
        filter: `contentId=eq.${contentId}`,
      },
      payload => onChange({ event: 'INSERT', row: payload.new as Record<string, unknown> })
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'Comment',
        filter: `contentId=eq.${contentId}`,
      },
      payload =>
        onChange({
          event: 'UPDATE',
          row: payload.new as Record<string, unknown>,
          old: payload.old as Record<string, unknown>,
        })
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Typing ────────────────────────────────────────────────────────────

export function sendTypingIndicator(
  conversationId: string,
  payload: { userId: string; userName: string; isTyping: boolean }
): void {
  envClient()
    .channel(`typing:${conversationId}`)
    .send({ type: 'broadcast', event: 'typing', payload })
    .catch(() => {});
}

// ─── Presence ──────────────────────────────────────────────────────────

export function createPresenceChannel(conversationId: string, userId: string) {
  const client = envClient();
  const channel = client.channel(`presence:${conversationId}`);
  const state = { onlineUsers: [] as string[] };

  const track = () => channel.track({ user_id: userId, online_at: new Date().toISOString() });
  const untrack = () => channel.untrack();

  return {
    channel,
    track,
    untrack,
    subscribe: (cb?: () => void) => channel.subscribe(cb),
    unsubscribe: () => channel.unsubscribe(),
    onSync: (cb: (users: string[], presenceState: Record<string, unknown>) => void) => {
      channel.on('presence', { event: 'sync' }, () => {
        const ps = channel.presenceState() as Record<string, unknown>;
        const others = Object.keys(ps).filter(k => k !== userId);
        state.onlineUsers = others;
        cb(others, ps);
      });
    },
    onJoin: (cb: (payload: { key: string; newPresences: unknown[] }) => void) => {
      channel.on('presence', { event: 'join' }, cb);
    },
    onLeave: (cb: (payload: { key: string; leftPresences: unknown[] }) => void) => {
      channel.on('presence', { event: 'leave' }, cb);
    },
  };
}

// ─── Notifications ────────────────────────────────────────────────────

export function subscribeNotifications(
  userId: string,
  onNotification: BroadcastHandler
): () => void {
  const client = envClient();
  const channel = client
    .channel(`notifications:${userId}`)
    .on('broadcast', { event: 'new-notification' }, ({ payload }) =>
      onNotification(payload as Record<string, unknown>)
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export function broadcastNotification(userId: string, notification: Record<string, unknown>): void {
  supabase
    .channel(`notifications:${userId}`)
    .send({ type: 'broadcast', event: 'new-notification', payload: notification })
    .catch(() => {});
}

// ─── Dispute ──────────────────────────────────────────────────────────

export function subscribeDisputeMessages(
  disputeId: string,
  onMessage: BroadcastHandler
): () => void {
  const channel = supabase
    .channel(`dispute:${disputeId}`)
    .on('broadcast', { event: 'new-mediation-message' }, ({ payload }) =>
      onMessage(payload as Record<string, unknown>)
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function broadcastDisputeMessage(
  disputeId: string,
  message: Record<string, unknown>
): Promise<void> {
  await supabase.channel(`dispute:${disputeId}`).send({
    type: 'broadcast',
    event: 'new-mediation-message',
    payload: message,
  });
}
