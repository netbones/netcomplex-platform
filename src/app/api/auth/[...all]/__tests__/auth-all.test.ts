/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  mockBetterAuthGet: vi.fn(),
  mockBetterAuthPost: vi.fn(),
  mockRateLimitByIP: vi.fn<(...args: unknown[]) => Response | null>(() => null),
}));

vi.mock('@api/server', () => ({
  auth: {},
  rateLimitByIP: (...args: unknown[]) => mocks.mockRateLimitByIP(...args) as Response | null,
}));

vi.mock('better-auth/next-js', () => ({
  toNextJsHandler: vi.fn(() => ({
    GET: mocks.mockBetterAuthGet,
    POST: mocks.mockBetterAuthPost,
  })),
}));

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

describe('Auth All Catch-All API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockRateLimitByIP.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET — rate-limited (spray prevention)', () => {
    it('delegates to better-auth GET handler when rate limit not exceeded', async () => {
      const mockResponse = new Response('ok', { status: 200 });
      mocks.mockBetterAuthGet.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost:3000/api/auth/session');
      const response = await GET(request as any);

      expect(mocks.mockRateLimitByIP).toHaveBeenCalled();
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

    it('returns 429 when rate limit exceeded', async () => {
      mocks.mockRateLimitByIP.mockReturnValue(
        new Response(JSON.stringify({ success: false, error: { code: 'RATE_LIMITED' } }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('http://localhost:3000/api/auth/session');
      const response = await GET(request as any);

      expect(mocks.mockRateLimitByIP).toHaveBeenCalled();
      expect(mocks.mockBetterAuthGet).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
    });

    it('rate limit uses 60 second window and 300 max requests', async () => {
      const request = new Request('http://localhost:3000/api/auth/session');
      await GET(request as any);

      expect(mocks.mockRateLimitByIP).toHaveBeenCalledWith(request, {
        windowMs: 60000,
        maxRequests: 300,
      });
    });
  });

  describe('POST — custom with rate limiting', () => {
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
  });
});
