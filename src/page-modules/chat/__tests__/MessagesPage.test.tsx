import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockConversations = [
  {
    id: 'conv-1',
    name: null,
    type: 'DIRECT' as const,
    participants: [{ user: { id: 'other-1', name: 'Alice', avatar: null } }],
    messages: [{ content: 'Hey there!', createdAt: '2026-07-16T10:00:00Z' }],
    createdAt: '2026-07-15T00:00:00Z',
  },
  {
    id: 'conv-2',
    name: 'Group Chat',
    type: 'GROUP' as const,
    participants: [
      { user: { id: 'other-1', name: 'Alice', avatar: null } },
      { user: { id: 'other-2', name: 'Bob', avatar: null } },
    ],
    messages: [{ content: 'Hello everyone!', createdAt: '2026-07-16T09:00:00Z' }],
    createdAt: '2026-07-14T00:00:00Z',
  },
];

const mockMessages = [
  {
    id: 'msg-1',
    content: 'Hello!',
    type: 'TEXT',
    messageVersion: 1,
    payload: null,
    mediaUrl: null,
    createdAt: '2026-07-16T10:00:00Z',
    sender: { id: 'other-1', name: 'Alice', avatar: null },
  },
  {
    id: 'msg-2',
    content: 'How are you?',
    type: 'TEXT',
    messageVersion: 1,
    payload: null,
    mediaUrl: null,
    createdAt: '2026-07-16T10:01:00Z',
    sender: { id: 'test-user-123', name: 'Test User', avatar: null },
  },
];

const mockUsers = [
  { id: 'other-1', name: 'Alice', avatar: null, email: 'alice@test.com' },
  { id: 'other-2', name: 'Bob', avatar: null, email: 'bob@test.com' },
];

vi.mock('@api/client', () => ({
  authClient: {
    useSession: vi.fn(() => ({
      data: {
        user: { id: 'test-user-123', name: 'Test User', email: 'test@example.com' },
      },
      isPending: false,
    })),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@shared/ui', () => ({
  Breadcrumbs: ({ items }: { items: { label: string }[] }) => (
    <div data-testid="breadcrumbs">{items.map(i => i.label).join(', ')}</div>
  ),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePageLoading: () => ({ isReady: true, LoadingComponent: null }),
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

vi.mock('@entities/chat', () => ({
  ChatMessage: ({
    message,
    isCurrentUser,
  }: {
    message: { content: string };
    isCurrentUser: boolean;
  }) => <div data-testid={`msg-${isCurrentUser ? 'own' : 'other'}`}>{message.content}</div>,
  TypingIndicator: ({ message }: { message: string | null }) =>
    message ? <div data-testid="typing-indicator">{message}</div> : null,
  ParticipantAvatar: ({ name }: { name: string }) => <span>{name[0]}</span>,
  ParticipantAvatarStack: () => <span>stack</span>,
  COMMON_EMOJIS: ['😀', '😂', '❤️'],
  ConversationListItem: {} as never,
}));

vi.mock('@features/chat', () => ({
  CreateConversationModal: ({
    onClose,
    onCreated,
  }: {
    onClose: () => void;
    onCreated: (conv: { id: string }) => void;
  }) => (
    <div data-testid="create-conversation-modal">
      <button
        onClick={() => {
          onCreated({ id: 'new-conv' });
          onClose();
        }}
      >
        Create
      </button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

function setupConversationsFetch() {
  const fetchMock = vi.mocked(fetch);
  fetchMock
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockConversations }), { status: 200 })
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { users: mockUsers } }), { status: 200 })
    );
}

describe('MessagesPage', () => {
  it('renders conversations list after loading', async () => {
    setupConversationsFetch();
    const { MessagesPage } = await import('../ui/MessagesPage');
    render(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Group Chat')).toBeInTheDocument();
    });
  });

  it('loads and displays messages when a conversation is clicked', async () => {
    setupConversationsFetch();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: mockMessages }), { status: 200 })
    );

    const { MessagesPage } = await import('../ui/MessagesPage');
    render(<MessagesPage />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Alice'));

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
    });
  });

  it('filters conversations by search query', async () => {
    setupConversationsFetch();
    const { MessagesPage } = await import('../ui/MessagesPage');
    render(<MessagesPage />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Search conversations...');
    await userEvent.type(searchInput, 'Group');

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByText('Group Chat')).toBeInTheDocument();
  });

  it('renders "Select a conversation" placeholder initially', async () => {
    setupConversationsFetch();
    const { MessagesPage } = await import('../ui/MessagesPage');
    render(<MessagesPage />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    expect(screen.getByText('Select a conversation')).toBeInTheDocument();
  });

  it('sends a message and calls the API', async () => {
    setupConversationsFetch();
    const fetchMock = vi
      .mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: mockMessages }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 'msg-3' } }), { status: 200 })
      );

    const { MessagesPage } = await import('../ui/MessagesPage');
    render(<MessagesPage />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Alice'));

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
    });

    const messageInput = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(messageInput, 'New message');

    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons[buttons.length - 1];
    await userEvent.click(sendBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/messages',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('opens CreateConversationModal when new conversation button is clicked', async () => {
    setupConversationsFetch();
    const { MessagesPage } = await import('../ui/MessagesPage');
    render(<MessagesPage />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    await userEvent.click(screen.getByTitle('New conversation'));

    expect(screen.getByTestId('create-conversation-modal')).toBeInTheDocument();
  });
});
