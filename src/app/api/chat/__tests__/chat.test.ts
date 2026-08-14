/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const req = (url: string, init?: RequestInit): NextRequest =>
  new Request(url, init) as unknown as NextRequest;

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((key: string) => {
        if (key === 'x-tenant-id') return 'test-tenant-id';
        if (key === 'x-tenant-slug') return 'test-tenant';
        return null;
      }),
    })
  ),
}));

const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  mockRole: 'RESIDENT' as string,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  },
  apiSuccess: vi.fn((data: unknown, _meta?: unknown, status = 200) =>
    Response.json({ success: true, data }, { status })
  ),
  apiCreated: vi.fn((data: unknown) => Response.json({ success: true, data }, { status: 201 })),
  apiUnauthorized: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'AUTH_REQUIRED', message: message || 'Authentication required' },
      },
      { status: 401 }
    )
  ),
  apiForbidden: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'FORBIDDEN', message: message || 'Forbidden' } },
      { status: 403 }
    )
  ),
  apiInternalError: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: message || 'Internal server error' },
      },
      { status: 500 }
    )
  ),
  apiValidationError: vi.fn((details?: unknown) =>
    Response.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
      },
      { status: 422 }
    )
  ),
  apiError: vi.fn((code: string, message: string, status = 400) =>
    Response.json({ success: false, error: { code, message } }, { status })
  ),
  rateLimitByUser: vi.fn(() => null as Response | null),
  revalidateConversations: vi.fn(),
}));

vi.mock('@api/server', () => ({
  CACHE_TAGS: { SETTINGS: 'settings' },
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  conversations: {
    id: 'id',
    name: 'name',
    type: 'type',
    tenantId: 'tenantId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  conversationParticipants: {
    id: 'id',
    conversationId: 'conversationId',
    userId: 'userId',
    tenantId: 'tenantId',
    joinedAt: 'joinedAt',
    lastReadAt: 'lastReadAt',
    lastReadMessageId: 'lastReadMessageId',
  },
  messages: {
    id: 'id',
    conversationId: 'conversationId',
    senderId: 'senderId',
    content: 'content',
    type: 'type',
    createdAt: 'createdAt',
    expiresAt: 'expiresAt',
    isDeleted: 'isDeleted',
    mediaUrl: 'mediaUrl',
    tenantId: 'tenantId',
  },
  users: { id: 'id', role: 'role', name: 'name', avatar: 'avatar' },
  tenants: { id: 'id', name: 'name', slug: 'slug' },
  premiumSeats: { userId: 'userId', messageRetentionDays: 'messageRetentionDays' },
  announcements: { id: 'id', tenantId: 'tenantId', expiresAt: 'expiresAt' },
  notifications: { id: 'id', userId: 'userId', read: 'read' },
  apiSuccess: mocks.apiSuccess,
  apiCreated: mocks.apiCreated,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiInternalError: mocks.apiInternalError,
  apiValidationError: mocks.apiValidationError,
  apiError: mocks.apiError,
  rateLimitByUser: mocks.rateLimitByUser,
  revalidateConversations: mocks.revalidateConversations,
  getSessionAndRole: vi.fn(() =>
    Promise.resolve(
      mocks.sessionResult
        ? {
            user: mocks.sessionResult.user,
            userId: mocks.sessionResult.user.id,
            role: mocks.mockRole,
            tenantId: 'test-tenant-id',
          }
        : null
    )
  ),
  guardSuspension: vi.fn(() => null),
  notDeleted: vi.fn(),
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn: any) => fn),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/shared/api/auth-utils', () => ({
  requireAuth: vi.fn(async (_request: Request, _options?: unknown) => {
    if (!mocks.sessionResult) {
      return {
        success: false as const,
        response: new Response(
          JSON.stringify({
            success: false,
            error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
          }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        ),
      };
    }
    return {
      success: true as const,
      data: {
        session: { user: { id: mocks.sessionResult.user.id, email: '', name: '' } },
        userId: mocks.sessionResult.user.id,
        role: mocks.mockRole,
        suspension: null,
      },
    };
  }),
}));

vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  assertModuleEnabled: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    logError: vi.fn(),
    createComponentLogger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
    hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
      if (!role) return false;
      if (permission === 'admin') return role === 'ADMIN';
      return false;
    }),
  };
});

vi.mock('@/shared/lib/sanitize/server', () => ({
  sanitizeHtml: vi.fn((html: string) => html),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      subscribe: vi.fn(),
      send: vi.fn(),
    })),
  })),
}));

import { GET as GETConversations, POST as POSTConversations } from '@/app/api/conversations/route';
import { POST as POSTFindConversation } from '@/app/api/conversations/find/route';
import {
  GET as GETMessages,
  POST as POSTMessages,
  DELETE as DELETEMessages,
} from '@/app/api/messages/route';
import { GET as GETMessagesUrgency } from '@/app/api/messages/urgency/route';
import {
  GET as GETMessagesUnread,
  POST as POSTMessagesUnread,
} from '@/app/api/messages/unread/route';
import {
  makeSelectChain,
  makeInsertChain,
  makeUpdateChain,
  makeDeleteChain,
} from '@/test/api/helpers';

describe('Chat/Conversations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.mockRole = 'RESIDENT';
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.rateLimitByUser.mockReturnValue(null);

    const selectChain = makeSelectChain([]);
    mocks.dbMock.select.mockReturnValue(selectChain);
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
    mocks.dbMock.delete.mockReturnValue(makeDeleteChain());
    mocks.dbMock.execute.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------
  // 1. GET /api/conversations
  // ---------------------------------------------------------------
  describe('GET /api/conversations', () => {
    it('returns 401 without auth', async () => {
      const request = req('http://localhost:3000/api/conversations');
      const response = await GETConversations(request);
      expect(response.status).toBe(401);
    });

    it('returns empty list for authenticated user with no conversations', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      const chain = makeSelectChain([]);
      mocks.dbMock.select.mockReturnValue(chain);

      const request = req('http://localhost:3000/api/conversations');
      const response = await GETConversations(request);

      expect(response.status).toBe(200);
      expect(mocks.dbMock.select).toHaveBeenCalled();
    });

    it('returns conversations with participants and latest message', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const participant = {
        id: 'cp-1',
        userId: 'user-2',
        joinedAt: new Date(),
        lastReadAt: null,
        lastReadMessageId: null,
        user: { id: 'user-2', name: 'Other User', avatar: null },
      };
      const latestMsg = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        content: 'Hello',
        type: 'TEXT',
        createdAt: new Date(),
        expiresAt: null,
        isDeleted: false,
        mediaUrl: null,
      };
      const conv = {
        id: 'conv-1',
        name: null,
        type: 'DIRECT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([conv]))
        .mockReturnValueOnce(makeSelectChain([participant]))
        .mockReturnValueOnce(makeSelectChain([latestMsg]));

      const request = req('http://localhost:3000/api/conversations');
      const response = await GETConversations(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].participants).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------
  // 2. POST /api/conversations
  // ---------------------------------------------------------------
  describe('POST /api/conversations', () => {
    it('returns 401 without auth', async () => {
      const request = req('http://localhost:3000/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Group', type: 'GROUP', participantIds: ['user-2'] }),
      });
      const response = await POSTConversations(request);
      expect(response.status).toBe(401);
    });

    it('creates a DIRECT conversation with participants', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const createdConv = {
        id: 'conv-new',
        name: null,
        type: 'DIRECT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const participant = {
        id: 'cp-1',
        userId: 'user-2',
        joinedAt: new Date(),
        lastReadAt: null,
        lastReadMessageId: null,
        user: { id: 'user-2', name: 'Other User', avatar: null },
      };

      mocks.dbMock.insert.mockReturnValue(makeInsertChain([createdConv]));
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([createdConv]))
        .mockReturnValueOnce(makeSelectChain([participant]));

      const request = req('http://localhost:3000/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DIRECT', participantIds: ['user-2'] }),
      });
      const response = await POSTConversations(request);

      expect(response.status).toBe(200);
      expect(mocks.dbMock.insert).toHaveBeenCalledTimes(2);
    });

    it('creates a GROUP conversation with name', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const createdConv = {
        id: 'conv-group',
        name: 'Book Club',
        type: 'GROUP',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const participant = {
        id: 'cp-1',
        userId: 'user-1',
        joinedAt: new Date(),
        lastReadAt: null,
        lastReadMessageId: null,
        user: { id: 'user-1', name: 'Test User', avatar: null },
      };

      mocks.dbMock.insert.mockReturnValue(makeInsertChain([createdConv]));
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([createdConv]))
        .mockReturnValueOnce(makeSelectChain([participant]));

      const request = req('http://localhost:3000/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Book Club',
          type: 'GROUP',
          participantIds: ['user-3', 'user-4'],
        }),
      });
      const response = await POSTConversations(request);

      expect(response.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------
  // 3. POST /api/conversations/find
  // ---------------------------------------------------------------
  describe('POST /api/conversations/find', () => {
    it('returns 400 when fewer than 2 participantIds provided', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      const request = req('http://localhost:3000/api/conversations/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: ['user-1'] }),
      });
      const response = await POSTFindConversation(request);
      expect(response.status).toBe(400);
    });

    it('returns existing conversation when found', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      const existing = {
        id: 'conv-existing',
        name: null,
        type: 'DIRECT',
        participants: [
          { id: 'cp-1', userId: 'user-1', user: { id: 'user-1', name: 'User One', avatar: null } },
          { id: 'cp-2', userId: 'user-2', user: { id: 'user-2', name: 'User Two', avatar: null } },
        ],
      };
      mocks.dbMock.execute.mockResolvedValue({ rows: [existing] });

      const request = req('http://localhost:3000/api/conversations/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: ['user-1', 'user-2'] }),
      });
      const response = await POSTFindConversation(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.conversation.id).toBe('conv-existing');
    });

    it('creates new conversation when none exists', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      const newConv = { id: 'conv-new', name: null, type: 'DIRECT' };
      const finalConv = {
        id: 'conv-new',
        name: null,
        type: 'DIRECT',
        participants: [
          { id: 'cp-1', userId: 'user-1', user: { id: 'user-1', name: 'User One', avatar: null } },
          { id: 'cp-2', userId: 'user-2', user: { id: 'user-2', name: 'User Two', avatar: null } },
        ],
      };

      mocks.dbMock.execute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [newConv] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [finalConv] });

      const request = req('http://localhost:3000/api/conversations/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: ['user-1', 'user-2'] }),
      });
      const response = await POSTFindConversation(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.conversation).toBeDefined();
    });

    it('enforces tenant isolation', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.tenantResult = { tenantId: 'other-tenant-id', tenantSlug: 'other-tenant' };

      const existing = {
        id: 'conv-1',
        name: null,
        type: 'DIRECT',
        participants: [
          { id: 'cp-1', userId: 'user-1', user: { id: 'user-1', name: 'User One', avatar: null } },
          { id: 'cp-2', userId: 'user-2', user: { id: 'user-2', name: 'User Two', avatar: null } },
        ],
      };
      mocks.dbMock.execute.mockResolvedValue({ rows: [existing] });

      const request = req('http://localhost:3000/api/conversations/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: ['user-1', 'user-2'] }),
      });
      const response = await POSTFindConversation(request);

      expect(response.status).toBe(200);
      expect(mocks.dbMock.execute).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // 4. GET /api/messages
  // ---------------------------------------------------------------
  describe('GET /api/messages', () => {
    it('returns 401 without auth', async () => {
      const request = req('http://localhost:3000/api/messages?conversationId=conv-1');
      const response = await GETMessages(request);
      expect(response.status).toBe(401);
    });

    it('returns 400 when conversationId query param is missing', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      const userRoleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockReturnValue(userRoleChain);

      const request = req('http://localhost:3000/api/messages');
      const response = await GETMessages(request);
      expect(response.status).toBe(400);
    });

    it('returns messages for a participant', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      const mockMsg = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        content: 'Hello',
        type: 'TEXT',
        mediaUrl: null,
        createdAt: new Date(),
        expiresAt: null,
        isDeleted: false,
        sender: { id: 'user-2', name: 'Other User', avatar: null },
      };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'cp-1' }]))
        .mockReturnValueOnce(makeSelectChain([mockMsg]));

      const request = req('http://localhost:3000/api/messages?conversationId=conv-1');
      const response = await GETMessages(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(1);
    });

    it('returns 403 for non-participant, non-admin', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const request = req('http://localhost:3000/api/messages?conversationId=conv-1');
      const response = await GETMessages(request);

      expect(response.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------
  // 5. POST /api/messages
  // ---------------------------------------------------------------
  describe('POST /api/messages', () => {
    it('returns 401 without auth', async () => {
      const request = req('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', content: 'Hello' }),
      });
      const response = await POSTMessages(request);
      expect(response.status).toBe(401);
    });

    it('returns 422 when Zod validation fails', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      const userRoleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockReturnValue(userRoleChain);

      const request = req('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const response = await POSTMessages(request);

      expect(response.status).toBe(422);
    });

    it('sends message successfully and broadcasts via Supabase', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const newMsg = {
        id: 'msg-new',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello world',
        type: 'TEXT',
        mediaUrl: null,
        expiresAt: new Date(),
        isDeleted: false,
        tenantId: 'test-tenant-id',
      };
      const senderInfo = { id: 'user-1', name: 'Test User', avatar: null };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'cp-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ messageRetentionDays: 30 }]))
        .mockReturnValueOnce(makeSelectChain([senderInfo]));

      mocks.dbMock.insert.mockReturnValue(makeInsertChain([newMsg]));

      const request = req('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', content: 'Hello world', type: 'TEXT' }),
      });
      const response = await POSTMessages(request);

      expect(response.status).toBe(201);
      expect(mocks.revalidateConversations).toHaveBeenCalled();
    });

    it('rate limits at 30 messages per minute per user', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.rateLimitByUser.mockReturnValue(
        new Response(JSON.stringify({ success: false, error: { code: 'RATE_LIMITED' } }), {
          status: 429,
        })
      );

      const request = req('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', content: 'Hello' }),
      });
      const response = await POSTMessages(request);

      expect(response.status).toBe(429);
      expect(mocks.rateLimitByUser).toHaveBeenCalledWith('user-1', {
        windowMs: 60000,
        maxRequests: 30,
      });
    });
  });

  // ---------------------------------------------------------------
  // 6. DELETE /api/messages
  // ---------------------------------------------------------------
  describe('DELETE /api/messages', () => {
    it('returns 401 without auth', async () => {
      const request = req('http://localhost:3000/api/messages', { method: 'DELETE' });
      const response = await DELETEMessages(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      const userRoleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockReturnValue(userRoleChain);

      const request = req('http://localhost:3000/api/messages', { method: 'DELETE' });
      const response = await DELETEMessages(request);

      expect(response.status).toBe(403);
    });

    it('prunes expired and deleted messages for admin', async () => {
      mocks.sessionResult = { user: { id: 'admin-1' } };
      mocks.mockRole = 'ADMIN';
      mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'msg-1' }, { id: 'msg-2' }]));

      const request = req('http://localhost:3000/api/messages', { method: 'DELETE' });
      const response = await DELETEMessages(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.deleted).toBe(2);
      expect(mocks.revalidateConversations).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // 7. GET /api/messages/urgency
  // ---------------------------------------------------------------
  describe('GET /api/messages/urgency', () => {
    it('returns 401 without auth', async () => {
      const response = await GETMessagesUrgency();
      expect(response.status).toBe(401);
    });

    it('returns urgency counts for authenticated user', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ count: 3 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 5 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 2 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 1 }]));

      const response = await GETMessagesUrgency();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.commandBar.unreadDirect).toBe(3);
      expect(json.data.commandBar.unreadGroup).toBe(5);
      expect(json.data.commandBar.unreadAnnouncements).toBe(2);
      expect(json.data.domainBadges.conversations).toBe(8);
      expect(json.data.domainBadges.notifications).toBe(1);
    });

    it('returns zeroes when no unread activity', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]))
        .mockReturnValueOnce(makeSelectChain([{ count: 0 }]));

      const response = await GETMessagesUrgency();

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.commandBar.unreadDirect).toBe(0);
      expect(json.data.commandBar.unreadGroup).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // 8. GET /api/messages/unread
  // ---------------------------------------------------------------
  describe('GET /api/messages/unread', () => {
    it('returns 401 without auth', async () => {
      const request = req('http://localhost:3000/api/messages/unread');
      const response = await GETMessagesUnread(request);
      expect(response.status).toBe(401);
    });

    it('returns unread counts per conversation', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const participantData = {
        participantId: 'cp-1',
        lastReadAt: new Date('2026-01-01'),
        conversationId: 'conv-1',
        conversationType: 'DIRECT',
        conversationUpdatedAt: new Date(),
      };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([participantData]))
        .mockReturnValueOnce(
          makeSelectChain([{ id: 'msg-1', senderId: 'user-2', createdAt: new Date() }])
        )
        .mockReturnValueOnce(makeSelectChain([{ count: 2 }]))
        .mockReturnValueOnce(makeSelectChain([{ userId: 'user-1' }, { userId: 'user-2' }]));

      const request = req('http://localhost:3000/api/messages/unread');
      const response = await GETMessagesUnread(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.totalUnread).toBeGreaterThanOrEqual(0);
    });

    it('returns zero unread when no messages exist', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const participantData = {
        participantId: 'cp-1',
        lastReadAt: new Date(),
        conversationId: 'conv-1',
        conversationType: 'DIRECT',
        conversationUpdatedAt: new Date(),
      };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([participantData]))
        .mockReturnValueOnce(makeSelectChain([]));

      const request = req('http://localhost:3000/api/messages/unread');
      const response = await GETMessagesUnread(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.totalUnread).toBe(0);
    });
  });

  // ---------------------------------------------------------------
  // 9. POST /api/messages/unread
  // ---------------------------------------------------------------
  describe('POST /api/messages/unread', () => {
    it('returns 401 without auth', async () => {
      const request = req('http://localhost:3000/api/messages/unread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1' }),
      });
      const response = await POSTMessagesUnread(request);
      expect(response.status).toBe(401);
    });

    it('returns 400 when conversationId is missing', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const request = req('http://localhost:3000/api/messages/unread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const response = await POSTMessagesUnread(request);

      expect(response.status).toBe(400);
    });

    it('marks conversation as read', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

      const request = req('http://localhost:3000/api/messages/unread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', messageId: 'msg-10' }),
      });
      const response = await POSTMessagesUnread(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.success).toBe(true);
    });
  });
});
