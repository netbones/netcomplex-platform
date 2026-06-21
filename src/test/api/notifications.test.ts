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
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  authSession: null as { user: { id: string } } | null,
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.authSession)),
    },
  },
  notifications: {
    id: 'id',
    createdAt: 'createdAt',
    userId: 'userId',
    tenantId: 'tenantId',
    read: 'read',
    deletedAt: 'deletedAt',
  },
  users: { id: 'id', email: 'email', showEmail: 'showEmail' },
  notDeleted: vi.fn((t: { deletedAt: string }) => ({ isNull: [t, 'deletedAt'] })),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiCreated: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiUnauthorized: vi.fn(
    () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  ),
  rateLimitByUser: vi.fn(() => null),
  sendEmail: vi.fn().mockResolvedValue({}),
  templates: {
    emailNotification: {
      getHtml: vi.fn(() => '<html></html>'),
    },
  },
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

import { GET, POST, PATCH } from '@/app/api/notifications/route';
import { makeSelectChain, makeInsertChain, makeUpdateChain } from './helpers';

describe('Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession = { user: { id: 'user-1' } };
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('returns notifications for authenticated user', async () => {
      const mockNotifications = [{ id: 'n-1', title: 'Test Notification', read: false }];
      mocks.dbMock.select.mockReturnValue(makeSelectChain(mockNotifications));

      const response = await GET(new Request('http://localhost:3000/api/notifications'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual(mockNotifications);
    });

    it('returns 401 without authentication', async () => {
      mocks.authSession = null;

      const response = await GET(new Request('http://localhost:3000/api/notifications'));

      expect(response.status).toBe(401);
    });

    it('filters by unread when query param is true', async () => {
      const allNotifications = [
        { id: 'n-1', title: 'Unread', read: false },
        { id: 'n-2', title: 'Read', read: true },
        { id: 'n-3', title: 'Also Unread', read: false },
      ];
      mocks.dbMock.select.mockReturnValue(makeSelectChain(allNotifications));

      const response = await GET(
        new Request('http://localhost:3000/api/notifications?unread=true')
      );
      const body = await response.json();

      expect(body.data).toHaveLength(2);
      expect(body.data.every((n: { read: boolean }) => !n.read)).toBe(true);
    });
  });

  describe('POST', () => {
    it('creates a notification', async () => {
      const newNotification = { id: 'n-new', title: 'New Notification' };
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
      mocks.dbMock.insert.mockReturnValue(makeInsertChain([newNotification]));

      const response = await POST(
        new Request('http://localhost:3000/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Notification', message: 'Hello' }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.id).toBe('n-new');
    });

    it('returns 401 without authentication', async () => {
      mocks.authSession = null;

      const response = await POST(
        new Request('http://localhost:3000/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test', message: 'Test' }),
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH', () => {
    it('marks all notifications as read', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
      mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ read: true }]));

      const response = await PATCH(
        new Request('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ all: true }),
        })
      );

      expect(response.status).toBe(200);
    });

    it('marks single notification as read', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
      mocks.dbMock.update.mockReturnValue(makeUpdateChain([{ read: true }]));

      const response = await PATCH(
        new Request('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'n-1' }),
        })
      );

      expect(response.status).toBe(200);
    });

    it('returns 401 without authentication', async () => {
      mocks.authSession = null;

      const response = await PATCH(
        new Request('http://localhost:3000/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ all: true }),
        })
      );

      expect(response.status).toBe(401);
    });
  });
});
