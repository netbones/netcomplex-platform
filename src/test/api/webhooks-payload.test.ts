/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  apiLogger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    apiSuccess: (data: unknown, _meta?: unknown, status = 200) =>
      NextResponse.json({ success: true, data }, { status }) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 }) as any,
  };
});

vi.mock('@shared/lib', () => ({
  apiLogger: mocks.apiLogger,
}));

import { POST } from '@/app/api/webhooks/payload/route';

describe('Webhooks Payload API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns received:true on valid JSON body', async () => {
    const request = new Request('http://localhost:3000/api/webhooks/payload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'test', data: { foo: 'bar' } }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.received).toBe(true);
    expect(mocks.apiLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ webhookBody: expect.objectContaining({ event: 'test' }) }),
      'Webhook received'
    );
  });

  it('logs an empty object when body is empty object', async () => {
    const request = new Request('http://localhost:3000/api/webhooks/payload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.received).toBe(true);
    expect(mocks.apiLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ webhookBody: {} }),
      'Webhook received'
    );
  });

  it('returns 500 on malformed JSON', async () => {
    const request = new Request('http://localhost:3000/api/webhooks/payload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json}',
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(mocks.apiLogger.error).toHaveBeenCalled();
  });

  it('returns 500 on empty body', async () => {
    const request = new Request('http://localhost:3000/api/webhooks/payload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '',
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(mocks.apiLogger.error).toHaveBeenCalled();
  });
});
