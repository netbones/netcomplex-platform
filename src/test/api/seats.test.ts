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
  session: { user: { id: 'user-1', role: 'admin' } },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
  authMock: {
    api: {
      getSession: vi.fn(),
    },
  },
  hasPermission: vi.fn(() => true),
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  users: { id: 'id', tenantId: 'tenantId' },
  soloSeats: {
    id: 'id',
    userId: 'userId',
    tenantId: 'tenantId',
    platformAddress: 'platformAddress',
    seatType: 'seatType',
    isComplimentary: 'isComplimentary',
  },
  premiumSeats: {
    id: 'id',
    userId: 'userId',
    tenantId: 'tenantId',
    platformAddress: 'platformAddress',
    portfolioName: 'portfolioName',
    subscriptionTier: 'subscriptionTier',
    maxProperties: 'maxProperties',
    messageRetentionDays: 'messageRetentionDays',
    tier: 'tier',
  },
  auth: mocks.authMock,
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiConflict: vi.fn(
    (message: string) =>
      new Response(JSON.stringify({ success: false, error: { code: 'CONFLICT', message } }), {
        status: 409,
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
  apiForbidden: vi.fn(
    () =>
      new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiNotFound: vi.fn(
    (message: string) =>
      new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string, status: number = 500) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: mocks.hasPermission,
}));

import { POST, DELETE } from '@/app/api/seats/route';
import { makeSelectChain, makeInsertChain, makeDeleteChain } from './helpers';

function makeCountSelect(result: { count: number }) {
  return makeSelectChain([result]);
}

describe('Seats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.session = { user: { id: 'user-1', role: 'admin' } };
    mocks.authMock.api.getSession.mockResolvedValue(mocks.session);
    mocks.hasPermission.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/seats', () => {
    function makePostRequest(body: Record<string, unknown>) {
      return new Request('http://localhost:3000/api/seats', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': 'test-tenant-id',
          'x-tenant-slug': 'test-tenant',
        },
        body: JSON.stringify(body),
      });
    }

    it('creates a solo seat', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]))
        .mockReturnValueOnce(makeCountSelect({ count: 0 }))
        .mockReturnValueOnce(makeSelectChain([]));

      mocks.dbMock.insert.mockReturnValueOnce(
        makeInsertChain([
          {
            id: 'seat-1',
            userId: 'user-1',
            tenantId: 'test-tenant-id',
            platformAddress: '0xabc',
            seatType: 'RESIDENT',
            isComplimentary: true,
          },
        ])
      );

      const req = makePostRequest({
        userId: 'user-1',
        seatType: 'solo',
        platformAddress: '0xabc',
        soloSeatType: 'RESIDENT',
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.seat.userId).toBe('user-1');
      expect(body.data.seat.platformAddress).toBe('0xabc');
    });

    it('creates a premium seat', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]))
        .mockReturnValueOnce(makeSelectChain([]));

      mocks.dbMock.insert.mockReturnValueOnce(
        makeInsertChain([
          {
            id: 'seat-2',
            userId: 'user-1',
            tenantId: 'test-tenant-id',
            platformAddress: '0xdef',
            portfolioName: 'My Portfolio',
            subscriptionTier: 'basic',
            maxProperties: 5,
            messageRetentionDays: 30,
            tier: 'foundation',
          },
        ])
      );

      const req = makePostRequest({
        userId: 'user-1',
        seatType: 'premium',
        platformAddress: '0xdef',
        portfolioName: 'My Portfolio',
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.seat.platformAddress).toBe('0xdef');
      expect(body.data.seat.tier).toBe('foundation');
    });

    it('returns 403 without auth session', async () => {
      mocks.authMock.api.getSession.mockResolvedValue(null);

      const req = makePostRequest({
        userId: 'user-1',
        seatType: 'solo',
        platformAddress: '0xabc',
      });

      const response = await POST(req);
      expect(response.status).toBe(403);
    });

    it('returns 403 without permission', async () => {
      mocks.hasPermission.mockReturnValue(false);

      const req = makePostRequest({
        userId: 'user-1',
        seatType: 'solo',
        platformAddress: '0xabc',
      });

      const response = await POST(req);
      expect(response.status).toBe(403);
    });

    it('returns 400 with missing fields', async () => {
      const req = makePostRequest({ userId: 'user-1' });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 with invalid seatType', async () => {
      const req = makePostRequest({
        userId: 'user-1',
        seatType: 'invalid',
        platformAddress: '0xabc',
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 if user not found', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const req = makePostRequest({
        userId: 'nonexistent',
        seatType: 'solo',
        platformAddress: '0xabc',
      });

      const response = await POST(req);
      expect(response.status).toBe(404);
    });

    it('returns 409 if solo seat limit reached', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]))
        .mockReturnValueOnce(makeCountSelect({ count: 5 }));

      const req = makePostRequest({
        userId: 'user-1',
        seatType: 'solo',
        platformAddress: '0xabc',
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error.code).toBe('CONFLICT');
    });

    it('returns 409 if platform address already allocated', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]))
        .mockReturnValueOnce(makeCountSelect({ count: 0 }))
        .mockReturnValueOnce(makeSelectChain([{ id: 'existing' }]));

      const req = makePostRequest({
        userId: 'user-1',
        seatType: 'solo',
        platformAddress: '0xabc',
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error.code).toBe('CONFLICT');
    });

    it('returns 409 if user already has premium seat', async () => {
      mocks.dbMock.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'user-1' }]))
        .mockReturnValueOnce(makeSelectChain([{ id: 'existing-premium' }]));

      const req = makePostRequest({
        userId: 'user-1',
        seatType: 'premium',
        platformAddress: '0xdef',
      });

      const response = await POST(req);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error.code).toBe('CONFLICT');
    });
  });

  describe('DELETE /api/seats', () => {
    function makeDeleteRequest(body: Record<string, unknown>) {
      return new Request('http://localhost:3000/api/seats', {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
          'x-tenant-id': 'test-tenant-id',
          'x-tenant-slug': 'test-tenant',
        },
        body: JSON.stringify(body),
      });
    }

    it('removes a solo seat', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'solo-seat-1' }]));
      mocks.dbMock.delete.mockReturnValueOnce(makeDeleteChain());

      const req = makeDeleteRequest({
        userId: 'user-1',
        seatType: 'solo',
        platformAddress: '0xabc',
      });

      const response = await DELETE(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.success).toBe(true);
    });

    it('removes a premium seat', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'premium-seat-1' }]));
      mocks.dbMock.delete.mockReturnValueOnce(makeDeleteChain());

      const req = makeDeleteRequest({
        userId: 'user-1',
        seatType: 'premium',
      });

      const response = await DELETE(req);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.success).toBe(true);
    });

    it('returns 403 without auth session', async () => {
      mocks.authMock.api.getSession.mockResolvedValue(null);

      const req = makeDeleteRequest({
        userId: 'user-1',
        seatType: 'solo',
      });

      const response = await DELETE(req);
      expect(response.status).toBe(403);
    });

    it('returns 400 with missing fields', async () => {
      const req = makeDeleteRequest({});

      const response = await DELETE(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 if solo seat not found', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const req = makeDeleteRequest({
        userId: 'user-1',
        seatType: 'solo',
      });

      const response = await DELETE(req);
      expect(response.status).toBe(404);
    });

    it('returns 404 if premium seat not found', async () => {
      mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

      const req = makeDeleteRequest({
        userId: 'user-1',
        seatType: 'premium',
      });

      const response = await DELETE(req);
      expect(response.status).toBe(404);
    });

    it('returns 400 with invalid seatType', async () => {
      const req = makeDeleteRequest({
        userId: 'user-1',
        seatType: 'invalid',
      });

      const response = await DELETE(req);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
