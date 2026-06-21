/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain, makeUpdateChain } from './helpers';

vi.mock('server-only', () => ({}));

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

const mocks = vi.hoisted(() => {
  const apiSuccess = vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  );
  const apiNotFound = vi.fn(
    (message = 'Not found') =>
      new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
  );
  const apiUnauthorized = vi.fn(
    (message = 'Authentication required') =>
      new Response(JSON.stringify({ success: false, error: { code: 'AUTH_REQUIRED', message } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
  );

  return {
    sessionResult: null as { user: { id: string } } | null,
    tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
    requireAssistScopeResult: null as Response | null,
    throwIfSuspendedResult: null as Response | null,
    dbMock: {
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    apiSuccess,
    apiNotFound,
    apiUnauthorized,
    writeAuditLog: vi.fn(),
  };
});

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)),
    },
  },
  db: mocks.dbMock,
  users: {
    id: 'id',
    tenantId: 'tenantId',
    name: 'name',
    email: 'email',
    role: 'role',
    phone: 'phone',
    interests: 'interests',
    avatar: 'avatar',
    image: 'image',
    books: 'books',
    dashboardLayout: 'dashboardLayout',
    isPublic: 'isPublic',
    showEmail: 'showEmail',
    showPhone: 'showPhone',
    isActive: 'isActive',
    isPlatformAdmin: 'isPlatformAdmin',
    residencyType: 'residencyType',
    profileSlug: 'profileSlug',
    createdAt: 'createdAt',
  },
  profiles: {
    id: 'profiles.id',
    tenantId: 'profiles.tenantId',
    userId: 'profiles.userId',
    householdId: 'profiles.householdId',
    status: 'profiles.status',
  },
  standardSeats: {
    id: 'standardSeats.id',
    tenantId: 'standardSeats.tenantId',
    userId: 'standardSeats.userId',
    propertyId: 'standardSeats.propertyId',
    isPrimaryOwner: 'standardSeats.isPrimaryOwner',
    platformAddress: 'standardSeats.platformAddress',
    createdAt: 'standardSeats.createdAt',
  },
  soloSeats: {
    id: 'soloSeats.id',
    userId: 'soloSeats.userId',
    propertyId: 'soloSeats.propertyId',
    seatType: 'soloSeats.seatType',
    platformAddress: 'soloSeats.platformAddress',
    createdAt: 'soloSeats.createdAt',
  },
  premiumSeats: {
    id: 'premiumSeats.id',
    userId: 'premiumSeats.userId',
    platformAddress: 'premiumSeats.platformAddress',
    portfolioName: 'premiumSeats.portfolioName',
    tier: 'premiumSeats.tier',
    isActive: 'premiumSeats.isActive',
  },
  properties: {
    id: 'properties.id',
    street: 'properties.street',
    unit: 'properties.unit',
    homeImage: 'properties.homeImage',
    platformAddress: 'properties.platformAddress',
    tenantId: 'properties.tenantId',
  },
  households: {
    id: 'households.id',
    tenantId: 'households.tenantId',
    propertyId: 'households.propertyId',
    occupancyType: 'households.occupancyType',
    status: 'households.status',
    createdAt: 'households.createdAt',
  },
  contents: {
    id: 'contents.id',
    title: 'contents.title',
    excerpt: 'contents.excerpt',
    content: 'contents.content',
    category: 'contents.category',
    tags: 'contents.tags',
    publishedAt: 'contents.publishedAt',
    authorId: 'contents.authorId',
    published: 'contents.published',
  },
  apiSuccess: mocks.apiSuccess,
  apiNotFound: mocks.apiNotFound,
  apiUnauthorized: mocks.apiUnauthorized,
  throwIfSuspended: vi.fn(() => Promise.resolve(mocks.throwIfSuspendedResult)),
  writeAuditLog: (...args: unknown[]) => mocks.writeAuditLog(...args),
  withErrorHandler: (handler: any) => handler,
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  requireAssistScope: vi.fn(() => Promise.resolve(mocks.requireAssistScopeResult)),
}));

vi.mock('@shared/lib', () => ({
  getLocalizedValue: (value: any) => {
    if (typeof value === 'string') return value;
    return value?.en || '';
  },
  getLocalizedContent: (value: any) => {
    if (typeof value === 'string') return value;
    return value?.en || '';
  },
  defaultLanguage: 'en',
}));

import { GET, PATCH, DELETE } from '@/app/api/users/[id]/route';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const SLUG = 'alice-smith';
const BASE_USER = {
  id: UUID,
  name: 'Alice Smith',
  email: 'alice@example.com',
  phone: '+1234567890',
  interests: ['reading', 'hiking'],
  avatar: null,
  image: null,
  books: null,
  dashboardLayout: null,
  isPublic: true,
  showEmail: false,
  showPhone: false,
  role: 'RESIDENT',
  createdAt: '2026-01-01T00:00:00Z',
  profileSlug: SLUG,
};

const BASE_SEAT = {
  household: { id: 'prop-1', street: '123 Main St', unit: 'Apt 1', homeImage: null },
  isPrimaryOwner: true,
  platformAddress: '123 Main St, Apt 1',
};

const BASE_HOUSEHOLD = {
  household: { id: 'hh-1', name: 'Primary', status: 'ACTIVE' },
  property: { id: 'prop-1', address: '123 Main St', unitNumber: 'Apt 1', type: '123 Main St' },
};

function makeDeleteReturningChain(rows: unknown[]) {
  return {
    where: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve(rows)),
    })),
  };
}

function req(url?: string, init?: RequestInit): Request {
  return new Request(url ?? 'http://localhost:3000/api/users/' + UUID, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 404 when UUID user not found', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([]));

    const res = await GET(req(), params(UUID));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when non-UUID id not found by id or slug', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([])) // not found by id
      .mockReturnValueOnce(makeSelectChain([])); // not found by slug

    const res = await GET(
      req('http://localhost:3000/api/users/nonexistent'),
      params('nonexistent')
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when id found by slug but slug lookup also misses', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([])) // not found by id
      .mockReturnValueOnce(makeSelectChain([])); // also not found by slug

    const res = await GET(req('http://localhost:3000/api/users/unknown'), params('unknown'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns full user data for UUID lookup', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([BASE_USER]))
      .mockReturnValueOnce(makeSelectChain([BASE_SEAT]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(
        makeSelectChain([
          { id: 'ps-1', platformAddress: null, portfolioName: null, tier: null, isActive: true },
        ])
      )
      .mockReturnValueOnce(makeSelectChain([BASE_HOUSEHOLD]))
      .mockReturnValueOnce(
        makeSelectChain([{ id: 'user-2', name: 'Bob', email: 'bob@test.com', role: 'RESIDENT' }])
      )
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'c-1',
            title: { en: 'Hello' },
            excerpt: { en: 'Excerpt' },
            content: { en: '<p>World</p>' },
            category: 'news',
            tags: ['tag1'],
            publishedAt: '2026-06-01T00:00:00Z',
          },
        ])
      );

    const res = await GET(req(), params(UUID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(UUID);
    expect(body.data.name).toBe('Alice Smith');
    expect(body.data.standardSeats).toHaveLength(1);
    expect(body.data.soloSeats).toHaveLength(0);
    expect(body.data.premiumSeat).not.toBeNull();
    expect(body.data.household).not.toBeNull();
    expect(body.data.household.property.address).toBe('123 Main St');
    expect(body.data.household.members).toHaveLength(1);
    expect(body.data.contents).toHaveLength(1);
  });

  it('falls back to slug lookup when non-UUID id does not match users.id', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([])) // not found by id
      .mockReturnValueOnce(makeSelectChain([BASE_USER])) // found by slug
      .mockReturnValueOnce(makeSelectChain([BASE_SEAT]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]));

    const res = await GET(req('http://localhost:3000/api/users/' + SLUG), params(SLUG));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe(UUID);
    expect(body.data.name).toBe('Alice Smith');
  });

  it('builds seat-derived household when no profile-based household exists', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([BASE_USER]))
      .mockReturnValueOnce(makeSelectChain([BASE_SEAT])) // standardSeats
      .mockReturnValueOnce(makeSelectChain([])) // soloSeats
      .mockReturnValueOnce(makeSelectChain([])) // premiumSeat
      .mockReturnValueOnce(makeSelectChain([])) // no active household
      .mockReturnValueOnce(makeSelectChain([])); // contents

    const res = await GET(req(), params(UUID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.household).not.toBeNull();
    expect(body.data.household.id).toContain('seat-derived');
    expect(body.data.household.members).toEqual([]);
  });

  it('returns null household when user has no seats at all', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([BASE_USER]))
      .mockReturnValueOnce(makeSelectChain([])) // no standardSeats
      .mockReturnValueOnce(makeSelectChain([])) // no soloSeats
      .mockReturnValueOnce(makeSelectChain([])) // no premiumSeat
      .mockReturnValueOnce(makeSelectChain([])) // no active household
      .mockReturnValueOnce(makeSelectChain([])); // contents

    const res = await GET(req(), params(UUID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.household).toBeNull();
  });

  it('returns empty contents when user has no published content', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([BASE_USER]))
      .mockReturnValueOnce(makeSelectChain([BASE_SEAT]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([])); // no contents

    const res = await GET(req(), params(UUID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.contents).toEqual([]);
  });

  it('ignores slug fallback for UUID ids', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([])); // not found, but no slug fallback

    const res = await GET(req(), params(UUID));

    expect(res.status).toBe(404);
    // ensures slug fallback was NOT called (no second mockReturnValueOnce)
    expect(mocks.dbMock.select).toHaveBeenCalledTimes(1);
  });
});

describe('PATCH /api/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.requireAssistScopeResult = null;
    mocks.throwIfSuspendedResult = null;
    mocks.sessionResult = { user: { id: 'admin-1' } };
    mocks.dbMock.update.mockReturnValue(
      makeUpdateChain([{ id: UUID, name: 'Updated', role: 'RESIDENT' }])
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 403 when assist scope is not "full"', async () => {
    mocks.requireAssistScopeResult = new Response(
      JSON.stringify({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Assist scope requires full access' },
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );

    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New' }),
      }),
      params(UUID)
    );

    expect(res.status).toBe(403);
  });

  it('returns 401 without auth session', async () => {
    mocks.sessionResult = null;

    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New' }),
      }),
      params(UUID)
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 when suspended', async () => {
    mocks.throwIfSuspendedResult = new Response(
      JSON.stringify({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Account suspended' },
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );

    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New' }),
      }),
      params(UUID)
    );

    expect(res.status).toBe(403);
  });

  it('returns 404 when user not found for update', async () => {
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));

    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New' }),
      }),
      params(UUID)
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('updates basic fields (name, email, phone)', async () => {
    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Alice Updated',
          email: 'alice.new@example.com',
          phone: '+9876543210',
        }),
      }),
      params(UUID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.updatedSeat).toBeNull();
  });

  it('updates role and writes audit log', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'RESIDENT' }]));

    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ role: 'BOARD' }),
      }),
      params(UUID)
    );

    expect(res.status).toBe(200);
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_ROLE_CHANGED', actorId: 'admin-1', targetId: UUID })
    );
  });

  it('does not write audit log when role is unchanged', async () => {
    // If body.role == currentRole, no audit log
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ role: 'BOARD' }]));

    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ role: 'BOARD' }),
      }),
      params(UUID)
    );

    expect(res.status).toBe(200);
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });

  it('updates boolean fields (isActive, isPublic, showEmail, showPhone)', async () => {
    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: true,
          isPublic: false,
          showEmail: true,
          showPhone: false,
        }),
      }),
      params(UUID)
    );

    expect(res.status).toBe(200);
  });

  it('updates profileSlug, interests, isPlatformAdmin, dashboardLayout', async () => {
    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({
          profileSlug: 'alice-updated',
          interests: ['cooking'],
          isPlatformAdmin: true,
          dashboardLayout: { widget: 'a' },
        }),
      }),
      params(UUID)
    );

    expect(res.status).toBe(200);
  });

  it('updates avatar and image when avatar is set', async () => {
    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ avatar: '/images/avatar.png' }),
      }),
      params(UUID)
    );

    expect(res.status).toBe(200);
  });

  it('updates image and avatar when image is set', async () => {
    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ image: '/images/photo.png' }),
      }),
      params(UUID)
    );

    expect(res.status).toBe(200);
  });

  it('updates residencyType and profileData', async () => {
    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ residencyType: 'owner', profileData: { bio: 'Hello' } }),
      }),
      params(UUID)
    );

    expect(res.status).toBe(200);
  });

  it('updates platformAddress on premium seat', async () => {
    mocks.dbMock.select.mockReturnValueOnce(makeSelectChain([{ id: 'ps-1' }])); // premium found

    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ platformAddress: '456 Oak Ave' }),
      }),
      params(UUID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.updatedSeat).toEqual({ type: 'premium', platformAddress: '456 Oak Ave' });
  });

  it('updates platformAddress on solo seat when premium not found', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([])) // no premium
      .mockReturnValueOnce(makeSelectChain([{ id: 'ss-1' }])); // solo found

    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ platformAddress: '789 Pine Rd' }),
      }),
      params(UUID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.updatedSeat).toEqual({ type: 'solo', platformAddress: '789 Pine Rd' });
  });

  it('updates platformAddress on standard seat when premium and solo not found', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([])) // no premium
      .mockReturnValueOnce(makeSelectChain([])) // no solo
      .mockReturnValueOnce(makeSelectChain([{ id: 'std-1' }])); // standard found

    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ platformAddress: '101 Elm St' }),
      }),
      params(UUID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.updatedSeat).toEqual({ type: 'standard', platformAddress: '101 Elm St' });
  });

  it('does nothing for platformAddress when no seat of any type exists', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeSelectChain([])) // no premium
      .mockReturnValueOnce(makeSelectChain([])) // no solo
      .mockReturnValueOnce(makeSelectChain([])); // no standard

    const res = await PATCH(
      req('http://localhost:3000/api/users/' + UUID, {
        method: 'PATCH',
        body: JSON.stringify({ platformAddress: '202 Birch Ln' }),
      }),
      params(UUID)
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.updatedSeat).toBeNull();
  });
});

describe('DELETE /api/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.requireAssistScopeResult = null;
    mocks.throwIfSuspendedResult = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 403 when assist scope is not "full"', async () => {
    mocks.requireAssistScopeResult = new Response(
      JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Scope denied' } }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );

    const res = await DELETE(
      req('http://localhost:3000/api/users/' + UUID, { method: 'DELETE' }),
      params(UUID)
    );

    expect(res.status).toBe(403);
  });

  it('returns 403 when suspended', async () => {
    mocks.throwIfSuspendedResult = new Response(
      JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Suspended' } }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );

    const res = await DELETE(
      req('http://localhost:3000/api/users/' + UUID, { method: 'DELETE' }),
      params(UUID)
    );

    expect(res.status).toBe(403);
  });

  it('returns 404 when user not found for delete', async () => {
    mocks.dbMock.delete.mockReturnValue(makeDeleteReturningChain([]));

    const res = await DELETE(
      req('http://localhost:3000/api/users/' + UUID, { method: 'DELETE' }),
      params(UUID)
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('deletes user successfully', async () => {
    mocks.dbMock.delete.mockReturnValue(makeDeleteReturningChain([{ id: UUID }]));

    const res = await DELETE(
      req('http://localhost:3000/api/users/' + UUID, { method: 'DELETE' }),
      params(UUID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.success).toBe(true);
  });
});
