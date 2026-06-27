import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  now: vi.fn(),
}));

vi.mock('@api/server', () => ({
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  ),
  now: () => mocks.now(),
}));

import { GET } from '@/app/api/v1/system/health/route';

describe('GET /api/v1/system/health', () => {
  beforeEach(() => {
    mocks.now.mockReturnValue(new Date('2026-06-26T12:00:00Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ok status with timestamp and version', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.runtime).toBe('nodejs');
    expect(body.data.version).toBe('1.0.0');
    expect(body.data.timestamp).toBe('2026-06-26T12:00:00.000Z');
  });
});
