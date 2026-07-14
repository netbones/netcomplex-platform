import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
  /** DB select result — set before each test to control what the route handler sees */
  dbResult: [] as unknown[],
}));

// Chainable Drizzle query mock — resolves to mocks.dbResult
function chainable() {
  const self = {
    from: vi.fn(() => self),
    where: vi.fn(() => self),
    limit: vi.fn(() => Promise.resolve(mocks.dbResult)),
    orderBy: vi.fn(() => Promise.resolve(mocks.dbResult)),
    values: vi.fn(() => self),
    set: vi.fn(() => self),
    returning: vi.fn(() => Promise.resolve(mocks.dbResult)),
  };
  return self;
}

vi.mock('@api/server', () => ({
  db: {
    select: vi.fn(() => chainable()),
    insert: vi.fn(() => chainable()),
    update: vi.fn(() => chainable()),
    delete: vi.fn(() => chainable()),
  },
  tenants: { id: 'id', ownerId: 'ownerId', name: 'name', slug: 'slug' },
  tenantSetups: { id: 'id', tenantId: 'tenantId' },
  setupMissions: { id: 'id', tenantSetupId: 'tenantSetupId' },
  setupSettings: { id: 'id', tenantSetupId: 'tenantSetupId', key: 'key', value: 'value' },
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.session)),
    },
  },
  apiSuccess: vi.fn(
    (data: unknown, _meta?: unknown, status = 200) =>
      new Response(JSON.stringify({ success: true, data }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (_code: string, message: string, status = 500) =>
      new Response(JSON.stringify({ success: false, error: { message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiForbidden: vi.fn(
    (message = 'Forbidden') =>
      new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiNotFound: vi.fn(
    (message = 'Not found') =>
      new Response(JSON.stringify({ success: false, error: { message } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiValidationError: vi.fn(
    (message = 'Validation failed') =>
      new Response(JSON.stringify({ success: false, error: { message } }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  writeAuditLog: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ a, b, op: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ args, op: 'and' })),
}));

vi.mock('@shared/lib', () => ({
  createId: vi.fn(() => `mock-id-${Math.random().toString(36).slice(2, 8)}`),
  logError: vi.fn(),
}));

// ── Dynamic imports (after mocks) ───────────────────────────────────────

const { GET: getSetup } = await import('../../../app/api/platform/setup/route');
const { PATCH: patchMission } = await import('../../../app/api/platform/setup/missions/route');
const { GET: getSettings, PATCH: patchSettings } =
  await import('../../../app/api/platform/setup/settings/route');
const { initTenantSetup } = await import('../api/init-setup');

// ── Helper ──────────────────────────────────────────────────────────────

function buildRequest(method: string, url: string, body?: unknown): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(`http://localhost:3000${url}`, init);
}

const OWNER_TENANT = { ownerId: 'user-1' };

// ── Tests ───────────────────────────────────────────────────────────────

describe('Setup Center API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session = null;
    mocks.dbResult = [];
  });

  // ── GET /api/platform/setup ─────────────────────────────────────────

  describe('GET /api/platform/setup', () => {
    it('returns 401 when no session', async () => {
      const req = buildRequest('GET', '/api/platform/setup?tenantId=tenant-1');
      const res = await getSetup(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 when tenantId is missing', async () => {
      mocks.session = { user: { id: 'user-1' } };

      const req = buildRequest('GET', '/api/platform/setup');
      const res = await getSetup(req);

      expect(res.status).toBe(400);
    });

    it('returns 403 for non-owner (tenant exists but different owner)', async () => {
      mocks.session = { user: { id: 'user-2' } };
      // Tenant exists, owned by user-1
      mocks.dbResult = [OWNER_TENANT];

      const req = buildRequest('GET', '/api/platform/setup?tenantId=tenant-1');
      const res = await getSetup(req);

      expect(res.status).toBe(403);
    });

    it('returns 404 when tenant not found', async () => {
      mocks.session = { user: { id: 'user-1' } };
      // Tenant doesn't exist
      mocks.dbResult = [];

      const req = buildRequest('GET', '/api/platform/setup?tenantId=tenant-1');
      const res = await getSetup(req);

      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /api/platform/setup/missions ─────────────────────────────

  describe('PATCH /api/platform/setup/missions', () => {
    it('returns 401 without session', async () => {
      const req = buildRequest('PATCH', '/api/platform/setup/missions', {
        tenantId: 'tenant-1',
        missionKey: 'launch.identity',
        isCompleted: true,
      });
      const res = await patchMission(req);

      expect(res.status).toBe(401);
    });

    it('returns 403 for non-owner (tenant exists but different owner)', async () => {
      mocks.session = { user: { id: 'user-2' } };
      mocks.dbResult = [OWNER_TENANT];

      const req = buildRequest('PATCH', '/api/platform/setup/missions', {
        tenantId: 'tenant-1',
        missionKey: 'launch.identity',
        isCompleted: true,
      });
      const res = await patchMission(req);

      expect(res.status).toBe(403);
    });

    it('returns 422 with invalid body', async () => {
      mocks.session = { user: { id: 'user-1' } };
      mocks.dbResult = [OWNER_TENANT];

      const req = buildRequest('PATCH', '/api/platform/setup/missions', {
        invalid: true,
      });
      const res = await patchMission(req);

      expect(res.status).toBe(422);
    });
  });

  // ── GET /api/platform/setup/settings ───────────────────────────────

  describe('GET /api/platform/setup/settings', () => {
    it('returns 401 without session', async () => {
      const req = buildRequest('GET', '/api/platform/setup/settings?tenantId=tenant-1');
      const res = await getSettings(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 when tenantId is missing', async () => {
      mocks.session = { user: { id: 'user-1' } };

      const req = buildRequest('GET', '/api/platform/setup/settings');
      const res = await getSettings(req);

      expect(res.status).toBe(400);
    });

    it('returns 403 for non-owner', async () => {
      mocks.session = { user: { id: 'user-2' } };
      mocks.dbResult = [OWNER_TENANT];

      const req = buildRequest('GET', '/api/platform/setup/settings?tenantId=tenant-1');
      const res = await getSettings(req);

      expect(res.status).toBe(403);
    });
  });

  // ── PATCH /api/platform/setup/settings ─────────────────────────────

  describe('PATCH /api/platform/setup/settings', () => {
    it('returns 401 without session', async () => {
      const req = buildRequest('PATCH', '/api/platform/setup/settings', {
        tenantId: 'tenant-1',
        key: 'launch.branding.colors',
        value: { primary: '#FF0000' },
      });
      const res = await patchSettings(req);

      expect(res.status).toBe(401);
    });

    it('returns 403 for non-owner', async () => {
      mocks.session = { user: { id: 'user-2' } };
      mocks.dbResult = [OWNER_TENANT];

      const req = buildRequest('PATCH', '/api/platform/setup/settings', {
        tenantId: 'tenant-1',
        key: 'launch.branding.colors',
        value: { primary: '#FF0000' },
      });
      const res = await patchSettings(req);

      expect(res.status).toBe(403);
    });

    it('returns 422 with invalid body', async () => {
      mocks.session = { user: { id: 'user-1' } };
      mocks.dbResult = [OWNER_TENANT];

      const req = buildRequest('PATCH', '/api/platform/setup/settings', {
        key: 'launch.branding.colors',
        // missing tenantId
      });
      const res = await patchSettings(req);

      expect(res.status).toBe(422);
    });
  });

  // ── initTenantSetup ────────────────────────────────────────────────

  describe('initTenantSetup', () => {
    it('creates TenantSetup and seeds default missions', async () => {
      await expect(initTenantSetup('tenant-test', 'foundation')).resolves.toBeDefined();
    });

    it('creates TenantSetup and seeds for depth tier', async () => {
      await expect(initTenantSetup('tenant-depth', 'pro-max')).resolves.toBeDefined();
    });

    it('creates TenantSetup and seeds for core tier', async () => {
      await expect(initTenantSetup('tenant-core', 'core')).resolves.toBeDefined();
    });
  });
});
