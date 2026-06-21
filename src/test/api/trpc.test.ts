/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  fetchRequestHandler: vi.fn(),
  createContext: vi.fn(),
  appRouter: {},
}));

vi.mock('@trpc/server/adapters/fetch', () => ({
  fetchRequestHandler: mocks.fetchRequestHandler,
}));

vi.mock('@api/server', () => ({
  createContext: mocks.createContext,
}));

vi.mock('@server/routers', () => ({
  appRouter: mocks.appRouter,
}));

import { GET, POST } from '@/app/api/trpc/[trpc]/route';

describe('TRPC Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchRequestHandler.mockReturnValue(
      new Response(JSON.stringify({ result: { data: 'hello' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET calls fetchRequestHandler with endpoint, req, router, and createContext', async () => {
    const req = new Request('http://localhost/api/trpc/testProcedure');

    await GET(req);

    expect(mocks.fetchRequestHandler).toHaveBeenCalledWith({
      endpoint: '/api/trpc',
      req,
      router: mocks.appRouter,
      createContext: expect.any(Function),
    });
  });

  it('POST calls fetchRequestHandler with the same shape as GET', async () => {
    const req = new Request('http://localhost/api/trpc/testProcedure', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    await POST(req);

    expect(mocks.fetchRequestHandler).toHaveBeenCalledWith({
      endpoint: '/api/trpc',
      req,
      router: mocks.appRouter,
      createContext: expect.any(Function),
    });
  });

  it('createContext passes headers from the request', async () => {
    const req = new Request('http://localhost/api/trpc/testProcedure');

    await GET(req);

    const callArgs = mocks.fetchRequestHandler.mock.calls[0][0] as any;
    callArgs.createContext();

    expect(mocks.createContext).toHaveBeenCalledWith({ headers: req.headers });
  });

  it('returns the response from fetchRequestHandler', async () => {
    const req = new Request('http://localhost/api/trpc/testProcedure');

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ result: { data: 'hello' } });
  });

  it('GET and POST both invoke fetchRequestHandler', async () => {
    const req1 = new Request('http://localhost/api/trpc/one');
    const req2 = new Request('http://localhost/api/trpc/two', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    await GET(req1);
    await POST(req2);

    expect(mocks.fetchRequestHandler).toHaveBeenCalledTimes(2);
    expect(mocks.fetchRequestHandler.mock.calls[0][0].req).toBe(req1);
    expect(mocks.fetchRequestHandler.mock.calls[1][0].req).toBe(req2);
  });
});
