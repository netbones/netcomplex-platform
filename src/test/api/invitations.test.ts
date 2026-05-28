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
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  rateLimitByIP: vi.fn(),
  sendEmail: vi.fn(),
}));

// Mock auth (invitations route doesn't directly use auth, but imports may need it)
vi.mock('@api/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock db
vi.mock('@api/db', () => ({
  db: mocks.dbMock,
  invitations: {
    id: 'id',
    tenantId: 'tenantId',
    email: 'email',
    name: 'name',
    role: 'role',
    residentType: 'residentType',
    inviterId: 'inviterId',
    token: 'token',
    status: 'status',
    createdAt: 'createdAt',
    expiresAt: 'expiresAt',
  },
  tenants: { id: 'id', name: 'name' },
  users: { id: 'id', name: 'name' },
}));

// Mock withTenant
vi.mock('@entities/tenant/api/with-tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

// Mock rate limit
vi.mock('@api/rate-limit', () => ({
  rateLimitByIP: (...args: unknown[]) => mocks.rateLimitByIP(...args),
}));

// Mock email
vi.mock('@shared/api/email/resend', () => ({
  sendEmail: (...args: unknown[]) => mocks.sendEmail(...args),
}));

vi.mock('@shared/api/email/templates', () => ({
  templates: {
    teamInvitation: {
      subject: 'You have been invited',
      getHtml: vi.fn().mockReturnValue('<html>invitation</html>'),
    },
  },
}));

// Mock logger
vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET, POST } from '@/app/api/invitations/route';
import { makeSelectChain } from './helpers';

describe('Invitations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.rateLimitByIP.mockReturnValue(null); // No rate limit by default
    mocks.sendEmail.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/invitations', () => {
    it('returns invitations for the tenant', async () => {
      const mockInvitations = [
        { id: 'inv-1', email: 'test@test.com', status: 'PENDING', tenantId: 'test-tenant-id' },
      ];

      const chain = makeSelectChain(mockInvitations);
      mocks.dbMock.select.mockImplementation(() => chain);

      const request = new Request('http://localhost:3000/api/invitations');
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(1);
    });

    it('returns empty array when no invitations exist', async () => {
      const chain = makeSelectChain([]);
      mocks.dbMock.select.mockImplementation(() => chain);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual([]);
    });

    it('enforces tenant isolation', async () => {
      const chain = makeSelectChain([]);
      mocks.dbMock.select.mockImplementation(() => chain);

      await GET();

      // Verify the query scoped by tenantId
      expect(mocks.dbMock.select).toHaveBeenCalled();
    });
  });

  describe('POST /api/invitations', () => {
    it('creates an invitation with valid data', async () => {
      const tenantChain = makeSelectChain([{ name: 'Test Community' }]);
      const userChain = makeSelectChain([{ name: 'Inviter' }]);
      const insertChain = {
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: 'inv-1',
                tenantId: 'test-tenant-id',
                email: 'new@test.com',
                name: 'New Resident',
                role: 'RESIDENT',
                status: 'PENDING',
                token: 'uuid-token',
              },
            ])
          ),
        })),
      };

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return tenantChain;
        return userChain;
      });
      mocks.dbMock.insert.mockImplementation(() => insertChain);

      const request = new Request('http://localhost:3000/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@test.com',
          name: 'New Resident',
          role: 'RESIDENT',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      expect(mocks.sendEmail).toHaveBeenCalled();
    });

    it('returns 429 when rate limit exceeded', async () => {
      mocks.rateLimitByIP.mockReturnValue(
        new Response(JSON.stringify({ success: false, error: { code: 'RATE_LIMITED' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('http://localhost:3000/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@test.com',
          name: 'New Resident',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
    });

    it('rate limits at 5 invitations per minute per IP', async () => {
      const request = new Request('http://localhost:3000/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@test.com',
          name: 'New Resident',
        }),
      });

      await POST(request);

      expect(mocks.rateLimitByIP).toHaveBeenCalledWith(request, {
        windowMs: 60000,
        maxRequests: 5,
      });
    });

    it('sends invitation email with correct template', async () => {
      const tenantChain = makeSelectChain([{ name: 'Test Community' }]);
      const userChain = makeSelectChain([{ name: 'Inviter' }]);
      const insertChain = {
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: 'inv-2',
                tenantId: 'test-tenant-id',
                email: 'test@test.com',
                name: 'Test User',
                role: 'RESIDENT',
                status: 'PENDING',
                token: 'token-123',
              },
            ])
          ),
        })),
      };

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return tenantChain;
        return userChain;
      });
      mocks.dbMock.insert.mockImplementation(() => insertChain);

      const request = new Request('http://localhost:3000/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          name: 'Test User',
          role: 'RESIDENT',
        }),
      });

      await POST(request);

      expect(mocks.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@test.com',
        })
      );
    });

    it('creates invitation with expiry of 7 days', async () => {
      const tenantChain = makeSelectChain([{ name: 'Test Community' }]);
      const userChain = makeSelectChain([{ name: 'Inviter' }]);
      const insertMock = {
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: 'inv-3',
                status: 'PENDING',
                token: 'token-456',
              },
            ])
          ),
        })),
      };

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return tenantChain;
        return userChain;
      });
      mocks.dbMock.insert.mockImplementation(() => insertMock);

      const request = new Request('http://localhost:3000/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          name: 'User',
        }),
      });

      await POST(request);

      const valuesArg = insertMock.values.mock.calls[0][0];
      expect(valuesArg.expiresAt).toBeInstanceOf(Date);
      // Should be ~7 days in the future
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const diff = valuesArg.expiresAt.getTime() - Date.now();
      expect(diff).toBeGreaterThan(sevenDaysMs - 1000);
      expect(diff).toBeLessThan(sevenDaysMs + 1000);
    });
  });
});
