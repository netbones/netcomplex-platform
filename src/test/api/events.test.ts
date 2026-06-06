import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock next/headers
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

// Hoisted mocks for shared mutable state
const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  listEvents: vi.fn(),
  createEvent: vi.fn(),
  validateEventFields: vi.fn(),
}));

// Mock auth
vi.mock('@api/auth', () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
}));

// Mock db
vi.mock('@api/db', () => ({
  db: mocks.dbMock,
  users: { id: 'id', role: 'role' },
}));

// Mock withTenant
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

// Mock permissions
vi.mock('@entities/tenant', () => ({
  hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'content')
      return role === 'ADMIN' || role === 'MANAGER' || role === 'COMMITTEE';
    if (permission === 'contentOwn') return role === 'ADMIN' || role === 'COMMITTEE';
    return false;
  }),
}));

// Mock event services
vi.mock('@entities/events', () => ({
  listEvents: (...args: unknown[]) => mocks.listEvents(...args),
  createEvent: (...args: unknown[]) => mocks.createEvent(...args),
  validateEventFields: (...args: unknown[]) => mocks.validateEventFields(...args),
}));

// Mock revalidation
vi.mock('@api/revalidation', () => ({
  revalidateContent: vi.fn(),
}));

// Mock logger
vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET, POST } from '@/app/api/events/route';
import { makeSelectChain } from './helpers';

describe('Events API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.validateEventFields.mockReturnValue({ valid: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/events', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/events');
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('returns list with valid auth', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listEvents.mockResolvedValue([
        { id: '1', title: 'Community Meeting', date: '2026-06-15' },
      ]);

      const request = new Request('http://localhost:3000/api/events');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Community Meeting');
    });

    it('filters by upcoming when param provided', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listEvents.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/events?upcoming=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mocks.listEvents).toHaveBeenCalledWith(expect.objectContaining({ upcoming: true }));
    });

    it('respects limit query param', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listEvents.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/events?limit=5');
      await GET(request);

      expect(mocks.listEvents).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }));
    });

    it('enforces tenant isolation', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listEvents.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/events');
      await GET(request);

      expect(mocks.listEvents).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'test-tenant-id' })
      );
    });

    it('returns empty array when no events exist', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listEvents.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/events');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual([]);
    });
  });

  describe('POST /api/events', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Event', description: 'Testing', date: '2026-06-15' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 403 for user without content permission', async () => {
      mocks.sessionResult = { user: { id: 'resident-user' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const request = new Request('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Event', description: 'Testing', date: '2026-06-15' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('returns 400 when required fields are missing', async () => {
      mocks.sessionResult = { user: { id: 'admin-user' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.validateEventFields.mockReturnValue({
        valid: false,
        missing: ['title', 'date'],
      });

      const request = new Request('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'No title or date' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('creates event with valid data for admin', async () => {
      mocks.sessionResult = { user: { id: 'admin-user' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.createEvent.mockResolvedValue({
        id: 'event-1',
        title: 'Community Meeting',
        date: new Date('2026-06-15'),
      });

      const request = new Request('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Community Meeting',
          description: 'Monthly community meeting',
          date: '2026-06-15',
          location: 'Community Hall',
          organizer: 'Board',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });

    it('enforces tenant isolation on create', async () => {
      mocks.sessionResult = { user: { id: 'admin-user' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.createEvent.mockResolvedValue({ id: 'event-1' });

      const request = new Request('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test',
          description: 'Test event',
          date: '2026-06-15',
        }),
      });

      await POST(request);

      expect(mocks.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'test-tenant-id' })
      );
    });
  });
});
