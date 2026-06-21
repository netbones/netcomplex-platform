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
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  authResult: { userId: 'test-user-id', role: 'RESIDENT' as const },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  rateLimitByIP: vi.fn(),
  sendEmail: vi.fn(),
  getSessionAndRole: vi.fn(),
  apiUnauthorized: vi.fn(),
  apiSuccess: vi.fn(),
  apiCreated: vi.fn(),
}));

vi.mock('@api/server', () => ({
  CACHE_TAGS: { SETTINGS: 'settings' },
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  db: mocks.dbMock,
  invitations: {
    id: 'id',
    tenantId: 'tenantId',
    email: 'email',
    name: 'name',
    role: 'role',
    residencyType: 'residencyType',
    inviterId: 'inviterId',
    token: 'token',
    status: 'status',
    createdAt: 'createdAt',
    expiresAt: 'expiresAt',
  },
  tenants: { id: 'id', name: 'name' },
  users: { id: 'id', name: 'name' },
  rateLimitByIP: (...args: unknown[]) => mocks.rateLimitByIP(...args),
  sendEmail: (...args: unknown[]) => mocks.sendEmail(...args),
  templates: {
    teamInvitation: {
      subject: 'You have been invited',
      getHtml: vi.fn().mockReturnValue('<html>invitation</html>'),
    },
  },
  apiSuccess: mocks.apiSuccess,
  apiError: vi.fn(),
  apiCreated: mocks.apiCreated,
  getSessionAndRole: (...args: unknown[]) => mocks.getSessionAndRole(...args),
  apiUnauthorized: (...args: unknown[]) => mocks.apiUnauthorized(...args),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET, POST } from '@/app/api/invitations/route';
import { makeSelectChain } from './helpers';

describe('Invitations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.rateLimitByIP.mockReturnValue(null);
    mocks.sendEmail.mockResolvedValue({});
    mocks.getSessionAndRole.mockResolvedValue(mocks.authResult);
    mocks.apiUnauthorized.mockReturnValue(
      new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );
    mocks.apiSuccess.mockImplementation(
      (data: unknown) =>
        new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    );
    mocks.apiCreated.mockImplementation(
      (data: unknown) =>
        new Response(JSON.stringify({ success: true, data }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/invitations', () => {
    it('returns 401 without auth', async () => {
      mocks.getSessionAndRole.mockResolvedValue(null);

      const response = await GET(new Request('http://localhost:3000/api/invitations') as any);
      expect(response.status).toBe(401);
    });

    it('returns invitations for the tenant', async () => {
      const invitations = [
        { id: 'inv-1', email: 'a@b.com', status: 'PENDING', tenantId: 'test-tenant-id' },
      ];
      mocks.dbMock.select.mockImplementation(() => makeSelectChain(invitations));

      const response = await GET(new Request('http://localhost:3000/api/invitations') as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].email).toBe('a@b.com');
    });
  });

  describe('POST /api/invitations', () => {
    it('creates an invitation and sends email', async () => {
      mocks.dbMock.select
        .mockImplementationOnce(() => makeSelectChain([{ name: 'Test Community' }]))
        .mockImplementationOnce(() => makeSelectChain([{ name: 'Inviter' }]));
      mocks.dbMock.insert.mockImplementation(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([{ id: 'inv-1', email: 'new@test.com', name: 'New', role: 'RESIDENT', status: 'PENDING', token: 'tok' }])
          ),
        })),
      }));

      const response = await POST(
        new Request('http://localhost:3000/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'new@test.com', name: 'New Resident', role: 'RESIDENT' }),
        })
      );

      expect(response.status).toBe(201);
      expect(mocks.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'new@test.com' })
      );
    });

    it('returns 429 when rate limit exceeded', async () => {
      mocks.rateLimitByIP.mockReturnValue(
        new Response(JSON.stringify({ success: false, error: { code: 'RATE_LIMITED' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const response = await POST(
        new Request('http://localhost:3000/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'new@test.com', name: 'New Resident' }),
        })
      );

      expect(response.status).toBe(429);
    });
  });
});
