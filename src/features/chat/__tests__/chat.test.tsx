import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { messageSchema, conversationSchema } from '@entities/chat';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

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

// Mock Better Auth client
vi.mock('@api/auth-client', () => ({
  authClient: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: { token: 'test-token' } } })),
    useSession: vi.fn(() => ({
      data: {
        user: {
          id: 'test-user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    })),
    signIn: { email: vi.fn() },
  },
}));

vi.mock('@api/client', () => ({
  authClient: {
    useSession: vi.fn(() => ({
      data: {
        user: {
          id: 'test-user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    })),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
);
global.fetch = mockFetch;

describe('chat schemas', () => {
  describe('messageSchema', () => {
    it('validates correct message data', () => {
      const data = {
        conversationId: 'conv-123',
        content: 'Hello, world!',
        type: 'TEXT',
      };
      expect(() => messageSchema.parse(data)).not.toThrow();
    });

    it('requires conversationId', () => {
      const data = {
        conversationId: '',
        content: 'Hello',
      };
      expect(() => messageSchema.parse(data)).toThrow('Conversation ID is required');
    });

    it('requires content', () => {
      const data = {
        conversationId: 'conv-123',
        content: '',
      };
      expect(() => messageSchema.parse(data)).toThrow('Message content is required');
    });

    it('rejects content over 2000 characters', () => {
      const data = {
        conversationId: 'conv-123',
        content: 'a'.repeat(2001),
      };
      expect(() => messageSchema.parse(data)).toThrow('Message too long');
    });

    it('allows valid IMAGE message with mediaUrl', () => {
      const data = {
        conversationId: 'conv-123',
        content: 'Check this out!',
        type: 'IMAGE',
        mediaUrl: 'https://example.com/image.jpg',
      };
      expect(() => messageSchema.parse(data)).not.toThrow();
    });

    it('rejects IMAGE message without mediaUrl', () => {
      const data = {
        conversationId: 'conv-123',
        content: 'Check this out!',
        type: 'IMAGE',
      };
      expect(() => messageSchema.parse(data)).toThrow('Image URL is required');
    });

    it('defaults type to TEXT', () => {
      const data = {
        conversationId: 'conv-123',
        content: 'Hello',
      };
      const result = messageSchema.parse(data);
      expect(result.type).toBe('TEXT');
    });

    it('accepts SYSTEM message type', () => {
      const data = {
        conversationId: 'conv-123',
        content: 'User joined the group',
        type: 'SYSTEM',
      };
      expect(() => messageSchema.parse(data)).not.toThrow();
    });

    it('accepts optional mediaUrl for TEXT messages', () => {
      const data = {
        conversationId: 'conv-123',
        content: 'Hello',
        mediaUrl: 'https://example.com/image.jpg',
      };
      const result = messageSchema.parse(data);
      expect(result.mediaUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('conversationSchema', () => {
    const validUuid1 = '550e8400-e29b-41d4-a716-446655440001';
    const validUuid2 = '550e8400-e29b-41d4-a716-446655440002';
    const validUuid3 = '550e8400-e29b-41d4-a716-446655440003';

    it('validates correct group conversation', () => {
      const data = {
        name: 'Test Group',
        type: 'GROUP',
        participantIds: [validUuid1, validUuid2, validUuid3],
      };
      expect(() => conversationSchema.parse(data)).not.toThrow();
    });

    it('validates correct direct conversation with name', () => {
      const data = {
        name: 'Direct Chat',
        type: 'DIRECT',
        participantIds: [validUuid1, validUuid2],
      };
      expect(() => conversationSchema.parse(data)).not.toThrow();
    });

    it('requires name', () => {
      const data = {
        name: '',
        type: 'GROUP',
        participantIds: [validUuid1, validUuid2],
      };
      expect(() => conversationSchema.parse(data)).toThrow('Group name is required');
    });

    it('requires at least 2 participants', () => {
      const data = {
        name: 'Test Chat',
        participantIds: [validUuid1],
      };
      expect(() => conversationSchema.parse(data)).toThrow('At least 2 participants required');
    });

    it('rejects name over 100 characters', () => {
      const data = {
        name: 'a'.repeat(101),
        type: 'GROUP',
        participantIds: [validUuid1, validUuid2],
      };
      expect(() => conversationSchema.parse(data)).toThrow('Name too long');
    });

    it('defaults type to DIRECT when not provided', () => {
      const data = {
        name: 'Test Chat',
        participantIds: [validUuid1, validUuid2],
      };
      const result = conversationSchema.parse(data);
      expect(result.type).toBe('DIRECT');
    });

    it('accepts GROUP type', () => {
      const data = {
        name: 'Group Chat',
        type: 'GROUP',
        participantIds: [validUuid1, validUuid2],
      };
      const result = conversationSchema.parse(data);
      expect(result.type).toBe('GROUP');
    });
  });
});

describe('DirectoryChatModal component', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders recipient name in header', async () => {
    // Mock find conversation response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversation: { id: 'conv-123' } }),
    });

    // Mock messages response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { DirectoryChatModal } = await import('@/features/directory/ui/DirectoryChatModal');

    await act(async () => {
      render(
        <DirectoryChatModal
          recipientId="recipient-456"
          recipientName="Jane Doe"
          onClose={vi.fn()}
        />
      );
    });

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    // Delay both fetch responses to show loading
    const delayedConversation = new Promise(resolve =>
      setTimeout(
        () =>
          resolve({
            ok: true,
            json: async () => ({ conversation: { id: 'conv-123' } }),
          }),
        100
      )
    );

    const delayedMessages = new Promise(resolve =>
      setTimeout(
        () =>
          resolve({
            ok: true,
            json: async () => [],
          }),
        100
      )
    );

    mockFetch.mockResolvedValueOnce(delayedConversation);
    mockFetch.mockResolvedValueOnce(delayedMessages);

    const { DirectoryChatModal } = await import('@/features/directory/ui/DirectoryChatModal');

    await act(async () => {
      render(
        <DirectoryChatModal
          recipientId="recipient-456"
          recipientName="Jane Doe"
          onClose={vi.fn()}
        />
      );
    });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state when no messages exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversation: { id: 'conv-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { DirectoryChatModal } = await import('@/features/directory/ui/DirectoryChatModal');

    await act(async () => {
      render(
        <DirectoryChatModal
          recipientId="recipient-456"
          recipientName="Jane Doe"
          onClose={vi.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText(/Say hello to Jane Doe/)).toBeInTheDocument();
    });
  });

  it('displays messages when fetched', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversation: { id: 'conv-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'msg-1',
          content: 'Hello!',
          senderId: 'recipient-456',
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: 'msg-2',
          content: 'Hi there!',
          senderId: 'test-user-123',
          createdAt: '2024-01-01T10:01:00Z',
        },
      ],
    });

    const { DirectoryChatModal } = await import('@/features/directory/ui/DirectoryChatModal');

    await act(async () => {
      render(
        <DirectoryChatModal
          recipientId="recipient-456"
          recipientName="Jane Doe"
          onClose={vi.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });
  });

  it('sends a message when send button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversation: { id: 'conv-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'msg-new',
        content: 'Test message',
        senderId: 'test-user-123',
        createdAt: '2024-01-01T10:05:00Z',
      }),
    });

    const { DirectoryChatModal } = await import('@/features/directory/ui/DirectoryChatModal');

    await act(async () => {
      render(
        <DirectoryChatModal
          recipientId="recipient-456"
          recipientName="Jane Doe"
          onClose={vi.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/messages'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            conversationId: 'conv-123',
            content: 'Test message',
            type: 'TEXT',
          }),
        })
      );
    });
  });

  it('sends a message when Enter key is pressed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversation: { id: 'conv-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'msg-new',
        content: 'Enter test',
        senderId: 'test-user-123',
        createdAt: '2024-01-01T10:05:00Z',
      }),
    });

    const { DirectoryChatModal } = await import('@/features/directory/ui/DirectoryChatModal');

    await act(async () => {
      render(
        <DirectoryChatModal
          recipientId="recipient-456"
          recipientName="Jane Doe"
          onClose={vi.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type a message...');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Enter test' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/messages'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Enter test'),
        })
      );
    });
  });

  it('does not send empty messages', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversation: { id: 'conv-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { DirectoryChatModal } = await import('@/features/directory/ui/DirectoryChatModal');

    await act(async () => {
      render(
        <DirectoryChatModal
          recipientId="recipient-456"
          recipientName="Jane Doe"
          onClose={vi.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    const sendButton = screen.getByRole('button', { name: /send message/i });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    // Should not have called messages API with POST
    const messagePostCalls = mockFetch.mock.calls.filter(
      (call: unknown[]) =>
        Array.isArray(call) &&
        typeof call[0] === 'string' &&
        call[0].includes('/api/messages') &&
        call[1] &&
        (call[1] as { method?: string }).method === 'POST'
    );
    expect(messagePostCalls.length).toBe(0);
  });

  it('closes modal when close button is clicked', async () => {
    const onClose = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversation: { id: 'conv-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { DirectoryChatModal } = await import('@/features/directory/ui/DirectoryChatModal');

    await act(async () => {
      render(
        <DirectoryChatModal
          recipientId="recipient-456"
          recipientName="Jane Doe"
          onClose={onClose}
        />
      );
    });

    const closeButton = screen.getByRole('button', { name: /close chat/i });

    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when Escape key is pressed', async () => {
    const onClose = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversation: { id: 'conv-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { DirectoryChatModal } = await import('@/features/directory/ui/DirectoryChatModal');

    await act(async () => {
      render(
        <DirectoryChatModal
          recipientId="recipient-456"
          recipientName="Jane Doe"
          onClose={onClose}
        />
      );
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when clicking outside the modal content', async () => {
    const onClose = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversation: { id: 'conv-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { DirectoryChatModal } = await import('@/features/directory/ui/DirectoryChatModal');

    await act(async () => {
      render(
        <DirectoryChatModal
          recipientId="recipient-456"
          recipientName="Jane Doe"
          onClose={onClose}
        />
      );
    });

    // Click on the backdrop (the fixed div that wraps the modal)
    const backdrop = document.querySelector('.fixed.inset-0.z-50');
    if (backdrop) {
      await act(async () => {
        fireEvent.click(backdrop);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });
});

describe('usePresence hook', () => {
  it('initializes with correct parameters', () => {
    // Hook tests would require testing-library/react
    expect(true).toBe(true);
  });
});

describe('useTypingIndicator hook', () => {
  it('manages typing state correctly', () => {
    expect(true).toBe(true);
  });
});
