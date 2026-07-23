/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import crypto from 'node:crypto';

vi.mock('server-only', () => ({}));

const SECRET = 'test-webhook-secret';
const mocks = vi.hoisted(() => ({
  apiLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  emitDomainEvent: vi.fn().mockResolvedValue('evt-1'),
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    apiSuccess: (data: unknown, _meta?: unknown, status = 200) =>
      NextResponse.json({ success: true, data }, { status }) as any,
    apiError: (code: string, message: string, status: number) =>
      NextResponse.json({ success: false, error: { code, message } }, { status }) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
    emitDomainEvent: mocks.emitDomainEvent,
  };
});

vi.mock('@shared/lib', () => ({
  apiLogger: mocks.apiLogger,
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

vi.mock('@shared/lib/webhook', async () => {
  const actual = await vi.importActual('@shared/lib/webhook');
  return actual;
});

import { POST } from '@/app/api/webhooks/payload/route';

function sign(body: string, timestamp?: number): { signature: string; ts: string } {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex');
  return { signature: sig, ts: String(ts) };
}

function buildRequest(
  body: Record<string, unknown>,
  overrides?: { signature?: string; timestamp?: string; idempotencyKey?: string }
) {
  const bodyText = JSON.stringify(body);
  const { signature, ts } = sign(bodyText);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Signature-256': overrides?.signature ?? signature,
    'X-Signature-Timestamp': overrides?.timestamp ?? ts,
  };
  if (overrides?.idempotencyKey) {
    headers['Idempotency-Key'] = overrides.idempotencyKey;
  }

  return new Request('http://localhost:3000/api/webhooks/payload', {
    method: 'POST',
    headers,
    body: bodyText,
  });
}

describe('Webhooks Payload API', () => {
  beforeEach(() => {
    process.env.PAYLOAD_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.PAYLOAD_WEBHOOK_SECRET;
  });

  it('returns 200 with valid signature and tenantId', async () => {
    const body = { event: 'test.event', tenantId: 'tenant-1', data: { foo: 'bar' } };
    const response = await POST(buildRequest(body));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.received).toBe(true);
    expect(mocks.emitDomainEvent).toHaveBeenCalledWith(
      'test.event',
      expect.objectContaining({ event: 'test.event', tenantId: 'tenant-1' }),
      expect.objectContaining({ tenantId: 'tenant-1' })
    );
  });

  it('returns 401 when X-Signature-256 header is missing', async () => {
    const body = { event: 'test', tenantId: 'tenant-1' };
    const req = new Request('http://localhost:3000/api/webhooks/payload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
    expect(mocks.emitDomainEvent).not.toHaveBeenCalled();
  });

  it('returns 401 when signature is invalid', async () => {
    const req = buildRequest({ event: 'test', tenantId: 'tenant-1' }, { signature: 'deadbeef' });
    const response = await POST(req);
    expect(response.status).toBe(401);
    expect(mocks.emitDomainEvent).not.toHaveBeenCalled();
  });

  it('returns 401 when timestamp is outside replay window', async () => {
    const oldTs = Math.floor(Date.now() / 1000) - 600;
    const req = buildRequest({ event: 'test', tenantId: 'tenant-1' }, { timestamp: String(oldTs) });
    const response = await POST(req);
    expect(response.status).toBe(401);
    expect(mocks.emitDomainEvent).not.toHaveBeenCalled();
  });

  it('returns 200 but skips processing on duplicate idempotency key', async () => {
    const body = { event: 'test', tenantId: 'tenant-1' };
    const req1 = buildRequest(body, { idempotencyKey: 'dup-key' });
    const req2 = buildRequest(body, { idempotencyKey: 'dup-key' });

    const r1 = await POST(req1);
    expect(r1.status).toBe(200);

    const r2 = await POST(req2);
    const j2 = await r2.json();
    expect(r2.status).toBe(200);
    expect(j2.data.idempotent).toBe(true);
    expect(mocks.emitDomainEvent).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when tenantId is missing', async () => {
    const req = buildRequest({ event: 'test' });
    const response = await POST(req);
    expect(response.status).toBe(400);
    expect(mocks.emitDomainEvent).not.toHaveBeenCalled();
  });

  it('returns 400 on malformed JSON', async () => {
    const bodyText = '{not-json}';
    const { signature, ts } = sign(bodyText);
    const req = new Request('http://localhost:3000/api/webhooks/payload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature-256': signature,
        'X-Signature-Timestamp': ts,
      },
      body: bodyText,
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    expect(mocks.emitDomainEvent).not.toHaveBeenCalled();
  });
});
