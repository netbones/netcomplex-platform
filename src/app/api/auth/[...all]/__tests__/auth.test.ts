/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only before any imports
vi.mock('server-only', () => ({}));

// Hoisted mocks for shared mutable state (needed because vi.mock is hoisted)
const mocks = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockBetterAuthGet: vi.fn(),
  mockBetterAuthPost: vi.fn(),
  mockRateLimitByIP: vi.fn<(...args: unknown[]) => Response | null>(() => null),
}));

// Mock @api/server — auth + rateLimitByIP in a single factory
vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: mocks.mockGetSession,
    },
  },
  rateLimitByIP: (...args: unknown[]) => mocks.mockRateLimitByIP(...args) as Response | null,
}));

// Mock better-auth/next-js
vi.mock('better-auth/next-js', () => ({
  toNextJsHandler: vi.fn(() => ({
    GET: mocks.mockBetterAuthGet,
    POST: mocks.mockBetterAuthPost,
  })),
}));

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

import { GET, POST } from '@/app/api/auth/[...all]/route';

describe('Auth API — Better Auth wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockRateLimitByIP.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/auth/[...all]', () => {
    it('delegates to better-auth GET handler', async () => {
      const mockResponse = new Response('ok', { status: 200 });
      mocks.mockBetterAuthGet.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost:3000/api/auth/session');
      const response = await GET(request as any);

      expect(mocks.mockBetterAuthGet).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);
    });

    it('passes through error responses from better-auth', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
      mocks.mockBetterAuthGet.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost:3000/api/auth/session');
      const response = await GET(request as any);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/[...all]', () => {
    it('calls better-auth POST when rate limit not exceeded', async () => {
      const mockResponse = new Response(JSON.stringify({ user: { id: '1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      mocks.mockBetterAuthPost.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
      });

      const response = await POST(request as any);

      expect(mocks.mockRateLimitByIP).toHaveBeenCalled();
      expect(mocks.mockBetterAuthPost).toHaveBeenCalledWith(request);
      expect(response.status).toBe(200);
    });

    it('returns 429 when rate limit exceeded', async () => {
      mocks.mockRateLimitByIP.mockReturnValue(
        new Response(JSON.stringify({ success: false, error: { code: 'RATE_LIMITED' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
      });

      const response = await POST(request as any);

      expect(mocks.mockRateLimitByIP).toHaveBeenCalled();
      expect(mocks.mockBetterAuthPost).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
    });

    it('rate limit uses 60 second window and 10 max requests', async () => {
      const request = new Request('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
      });

      await POST(request as any);

      expect(mocks.mockRateLimitByIP).toHaveBeenCalledWith(request, {
        windowMs: 60000,
        maxRequests: 10,
      });
    });

    it('returns suspension status when queried', async () => {
      mocks.mockGetSession.mockResolvedValue({
        user: { id: 'suspended-user' } as any,
        session: {} as any,
      });

      const mockResponse = new Response(
        JSON.stringify({ suspended: true, reason: 'Policy violation' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      mocks.mockBetterAuthGet.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost:3000/api/auth/suspension-status');
      const response = await GET(request as any);

      expect(response.status).toBe(200);
    });
  });
});
