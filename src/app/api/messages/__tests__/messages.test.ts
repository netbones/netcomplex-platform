import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
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
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  messages: {
    id: 'id',
    conversationId: 'conversationId',
    senderId: 'senderId',
    content: 'content',
    type: 'type',
    mediaUrl: 'mediaUrl',
    createdAt: 'createdAt',
    expiresAt: 'expiresAt',
    deletedAt: 'deletedAt',
    tenantId: 'tenantId',
  },
  users: { id: 'id', role: 'role', name: 'name', avatar: 'avatar' },
  premiumSeats: { userId: 'userId', messageRetentionDays: 'messageRetentionDays' },
  conversationParticipants: {
    id: 'id',
    conversationId: 'conversationId',
    userId: 'userId',
    tenantId: 'tenantId',
  },
  apiSuccess: mocks.apiSuccess,
  apiCreated: mocks.apiCreated,
  apiUnauthorized: mocks.apiUnauthorized,
  apiForbidden: mocks.apiForbidden,
  apiInternalError: mocks.apiInternalError,
  apiValidationError: mocks.apiValidationError,
  apiError: mocks.apiError,
  rateLimitByUser: mocks.rateLimitByUser,
  revalidateConversations: mocks.revalidateConversations,
  getSessionAndRole: vi.fn(async () => {
    const session = mocks.sessionResult;
    if (!session) return null;
    return { session, userId: session.user.id, role: 'RESIDENT', suspension: null };
  }),
  notDeleted: vi.fn(() => true),
  guardSuspension: vi.fn(() => null),
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@entities/chat', () => ({
  messageSchema: {
    safeParse: vi.fn(),
  },
}));

vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'admin') return role === 'ADMIN';
    return false;
  }),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

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

import { GET, POST, DELETE } from '@/app/api/messages/route';
import { makeSelectChain, makeInsertChain, makeUpdateChain } from '@/test/api/helpers';
import { messageSchema } from '@entities/chat';

describe('Messages API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.rateLimitByUser.mockReturnValue(null);

    vi.mocked(messageSchema.safeParse).mockReturnValue({
      success: true,
      data: { conversationId: 'conv-1', content: 'Hello world', type: 'TEXT' },
    } as ReturnType<typeof messageSchema.safeParse>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/messages', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/messages?conversationId=conv-1');
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('returns 400 when conversationId is missing', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      const userRoleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockReturnValue(userRoleChain);

      const request = new Request('http://localhost:3000/api/messages');
      const response = await GET(request);
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
        deletedAt: null,
        sender: { id: 'user-2', name: 'Other User', avatar: null },
      };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'cp-1' }]))
        .mockReturnValueOnce(makeSelectChain([mockMsg]));

      const request = new Request('http://localhost:3000/api/messages?conversationId=conv-1');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toHaveLength(1);
    });

    it('returns 403 for non-participant', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
        .mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/messages?conversationId=conv-1');
      const response = await GET(request);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/messages', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', content: 'Hello' }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 422 when Zod validation fails', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));

      vi.mocked(messageSchema.safeParse).mockReturnValue({
        success: false,
        error: { issues: [{ path: ['content'], message: 'Required' }] },
      } as ReturnType<typeof messageSchema.safeParse>);

      const request = new Request('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(422);
    });

    it('returns 429 when rate limited', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      vi.mocked(messageSchema.safeParse).mockReturnValue({
        success: true,
        data: { conversationId: 'conv-1', content: 'Hello', type: 'TEXT' },
      } as ReturnType<typeof messageSchema.safeParse>);

      mocks.rateLimitByUser.mockReturnValue(
        new Response(JSON.stringify({ success: false, error: { code: 'RATE_LIMITED' } }), {
          status: 429,
        })
      );

      const request = new Request('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', content: 'Hello' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(mocks.rateLimitByUser).toHaveBeenCalledWith('user-1', {
        windowMs: 60000,
        maxRequests: 30,
      });
    });

    it('returns 403 when user is not a participant', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
        .mockReturnValueOnce(makeSelectChain([]));

      const request = new Request('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', content: 'Hello' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
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
        tenantId: 'test-tenant-id',
      };
      const senderInfo = { id: 'user-1', name: 'Test User', avatar: null };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'cp-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ messageRetentionDays: 30 }]))
        .mockReturnValueOnce(makeSelectChain([senderInfo]));

      mocks.dbMock.insert.mockReturnValue(makeInsertChain([newMsg]));

      const request = new Request('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', content: 'Hello world', type: 'TEXT' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.sender.name).toBe('Test User');
      expect(mocks.revalidateConversations).toHaveBeenCalled();
    });

    it('returns 500 on database error', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'cp-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ messageRetentionDays: 30 }]));

      mocks.dbMock.insert.mockImplementation(() => {
        throw new Error('DB connection failed');
      });

      const request = new Request('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', content: 'Hello world' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/messages', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/messages', { method: 'DELETE' });
      const response = await DELETE(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin users', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'RESIDENT' }]));

      const request = new Request('http://localhost:3000/api/messages', { method: 'DELETE' });
      const response = await DELETE(request);

      expect(response.status).toBe(403);
    });

    it('prunes expired messages for admin', async () => {
      mocks.sessionResult = { user: { id: 'admin-1' } };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ role: 'ADMIN' }]));
      mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ id: 'msg-1' }, { id: 'msg-2' }]));

      const request = new Request('http://localhost:3000/api/messages', { method: 'DELETE' });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.deleted).toBe(2);
      expect(mocks.revalidateConversations).toHaveBeenCalled();
    });
  });
});
