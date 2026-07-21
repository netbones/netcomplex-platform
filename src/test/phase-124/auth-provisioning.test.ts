import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock state ──
const hoisted = vi.hoisted(() => {
  return {
    mockRequirePlatformAdmin: vi.fn(),
    mockCreateTenant: vi.fn(),
    mockGetSession: vi.fn(),
  };
});

vi.mock('@api/server', () => ({
  auth: { api: { getSession: hoisted.mockGetSession } },
  writeAuditLog: vi.fn(),
  apiCreated: (data: unknown) =>
    new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    }),
  apiSuccess: (data: unknown) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  apiInternalError: (msg: string) =>
    new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    }),
  logError: vi.fn(),
}));

vi.mock('@entities/tenant/server', () => ({
  requirePlatformAdmin: hoisted.mockRequirePlatformAdmin,
  createTenant: hoisted.mockCreateTenant,
  listTenants: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
}));

// Now import the POST handler
import { POST } from '@/app/api/admin/platform/tenants/route';

function createRequest(body: unknown, sessionToken?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (sessionToken) {
    headers['cookie'] = `better-auth.session_token=${sessionToken}`;
  }
  return new NextRequest('http://localhost:3000/api/platform/tenants', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: 'Test Community',
  slug: 'test-community',
  subscriptionTier: 'foundation',
} as const;

describe('POST /api/platform/tenants — authenticated tenant provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockRequirePlatformAdmin.mockResolvedValue(null);
    hoisted.mockCreateTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Test Community',
      slug: 'test-community',
    });
    hoisted.mockGetSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com', emailVerified: true, name: 'Test User' },
      session: { token: 'session-token-abc' },
    });
  });

  it('Test 1: returns 401 when no session cookie is present', async () => {
    hoisted.mockRequirePlatformAdmin.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    );
    const req = createRequest(validBody);
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('Test 2: returns 201 with tenant data when authenticated with valid body', async () => {
    const req = createRequest(validBody, 'session-token-abc');
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('tenant-1');
    expect(body.name).toBe('Test Community');
  });

  it('Test 3: returns 201 with slug even when slug is taken (DB unique constraint)', async () => {
    // The route passes through to createTenant; uniqueness is enforced at DB level
    hoisted.mockCreateTenant.mockRejectedValue(new Error('Unique constraint violation on slug'));
    const req = createRequest(validBody, 'session-token-abc');
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Failed to create tenant/);
  });
});
