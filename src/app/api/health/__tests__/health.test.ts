/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  mockNow: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
}));

vi.mock('@api/server', () => ({
  now: mocks.mockNow,
}));

import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns health status with timestamp and runtime info', async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      runtime: 'edge',
    });
    expect(typeof (body as any).timestamp).toBe('string');
    expect(typeof (body as any).version).toBe('string');
  });

  it('sets correct content-type and cache-control headers', async () => {
    const res = await GET();

    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.headers.get('cache-control')).toBe(
      'public, s-maxage=60, stale-while-revalidate=120'
    );
  });

  it('uses process.env.npm_package_version when set', async () => {
    const origVersion = process.env.npm_package_version;
    process.env.npm_package_version = '1.2.3';

    const res = await GET();
    const body = await res.json();

    expect((body as any).version).toBe('1.2.3');

    process.env.npm_package_version = origVersion;
  });

  it('falls back to 0.0.0 when npm_package_version is not set', async () => {
    const origVersion = process.env.npm_package_version;
    delete process.env.npm_package_version;

    const res = await GET();
    const body = await res.json();

    expect((body as any).version).toBe('0.0.0');

    process.env.npm_package_version = origVersion;
  });
});
