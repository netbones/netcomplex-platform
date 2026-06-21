/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  requireNotSuspended: vi.fn(),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    requireNotSuspended: mocks.requireNotSuspended,
    apiSuccess: (data: unknown) =>
      NextResponse.json({ success: true, data }, { status: 200 }) as any,
    apiError: (message: string, status = 500) =>
      NextResponse.json({ success: false, error: { message } }, { status }) as any,
  };
});

import { GET } from '@/app/api/auth/suspension-status/route';

describe('GET /api/auth/suspension-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns suspension status when user is not suspended', async () => {
    mocks.requireNotSuspended.mockResolvedValue({ suspended: false });

    const res = await GET(new Request('http://localhost/api/auth/suspension-status') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: { suspended: false } });
    expect(mocks.requireNotSuspended).toHaveBeenCalledOnce();
  });

  it('returns suspension details when user is suspended', async () => {
    mocks.requireNotSuspended.mockResolvedValue({
      suspended: true,
      reason: 'Community guidelines violation',
      suspendedAt: '2026-06-01T00:00:00Z',
    });

    const res = await GET(new Request('http://localhost/api/auth/suspension-status') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data).toEqual({
      suspended: true,
      reason: 'Community guidelines violation',
      suspendedAt: '2026-06-01T00:00:00Z',
    });
  });

  it('passes the request object to requireNotSuspended', async () => {
    mocks.requireNotSuspended.mockResolvedValue({ suspended: false });

    const req = new Request('http://localhost/api/auth/suspension-status');
    await GET(req);

    expect(mocks.requireNotSuspended).toHaveBeenCalledWith(req);
  });
});
