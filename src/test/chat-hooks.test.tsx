import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue({ status: 'SUBSCRIBED' }),
      track: vi.fn().mockResolvedValue(undefined),
      untrack: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      presenceState: vi.fn(() => ({})),
      send: vi.fn().mockResolvedValue(undefined),
    })),
    removeChannel: vi.fn(),
  })),
}));

describe('usePresence hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial state with empty online users', async () => {
    const { usePresence } = await import('@features/chat');

    const { result } = renderHook(() => usePresence('conv-123', 'user-1'));

    expect(result.current.onlineUsers).toEqual([]);
    expect(result.current.isOnline).toBe(false);
  });

  it('does not track presence without conversationId', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const { usePresence } = await import('@features/chat');

    renderHook(() => usePresence(null, 'user-1'));

    const mockClient = (createClient as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(mockClient.channel).not.toHaveBeenCalled();
  });
});

describe('useMessageSend hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns sendMessage function', async () => {
    const { useMessageSend } = await import('@features/chat/useMessageSend');

    const { result } = renderHook(() =>
      useMessageSend({
        conversationId: 'conv-123',
        currentUserId: 'user-1',
        currentUserName: 'Test User',
      })
    );

    expect(result.current.sendMessage).toBeDefined();
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('returns sendTypingIndicator function', async () => {
    const { useMessageSend } = await import('@features/chat/useMessageSend');

    const { result } = renderHook(() =>
      useMessageSend({
        conversationId: 'conv-123',
        currentUserId: 'user-1',
        currentUserName: 'Test User',
      })
    );

    expect(result.current.sendTypingIndicator).toBeDefined();
    expect(typeof result.current.sendTypingIndicator).toBe('function');
  });

  it('sendMessage returns false when fetch fails', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const { useMessageSend } = await import('@features/chat/useMessageSend');

    const { result } = renderHook(() =>
      useMessageSend({
        conversationId: 'conv-123',
        currentUserId: 'user-1',
        currentUserName: 'Test User',
      })
    );

    const success = await result.current.sendMessage('Hello');
    expect(success).toBe(false);
  });

  it('sendMessage returns false when response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    });
    global.fetch = mockFetch;

    const { useMessageSend } = await import('@features/chat/useMessageSend');

    const { result } = renderHook(() =>
      useMessageSend({
        conversationId: 'conv-123',
        currentUserId: 'user-1',
        currentUserName: 'Test User',
      })
    );

    const success = await result.current.sendMessage('Hello');
    expect(success).toBe(false);
  });

  it('sendMessage returns true and calls onMessageSent on success', async () => {
    const mockMessage = {
      id: 'msg-1',
      content: 'Hello',
      senderId: 'user-1',
      createdAt: '2024-01-01T10:00:00Z',
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockMessage,
    });
    global.fetch = mockFetch;

    const onMessageSent = vi.fn();

    const { useMessageSend } = await import('@features/chat/useMessageSend');

    const { result } = renderHook(() =>
      useMessageSend({
        conversationId: 'conv-123',
        currentUserId: 'user-1',
        currentUserName: 'Test User',
        onMessageSent,
      })
    );

    const success = await result.current.sendMessage('Hello');
    expect(success).toBe(true);
    expect(onMessageSent).toHaveBeenCalledWith(mockMessage);
  });
});
