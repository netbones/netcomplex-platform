import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  sessionUser: { id: 'user-1', email: 'user@test.com', name: 'Test User' } as {
    id: string;
    email: string;
    name: string;
  } | null,
  tenantId: 'tenant-1',

  // Provider record for role=provider queries
  providerRecord: {
    id: 'provider-1',
    tenantId: 'tenant-1',
    email: 'user@test.com',
    businessName: 'Test Provider',
  } as Record<string, unknown> | null,

  // Booking records in mock DB
  savedBookings: [] as Record<string, unknown>[],
  bookingStore: [
    {
      id: 'booking-1',
      tenantId: 'tenant-1',
      listingId: 'listing-1',
      providerId: 'provider-1',
      userId: 'user-1',
      date: new Date('2026-07-15'),
      startTime: '09:00',
      endTime: '10:00',
      price: '500',
      platformFee: '40',
      paymentStatus: 'PENDING',
      status: 'PENDING_CONFIRMATION',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ] as Record<string, unknown>[],

  // Listing records
  listingStore: [
    {
      id: 'listing-1',
      tenantId: 'tenant-1',
      providerId: 'provider-1',
      title: { en: 'Test Service' },
      category: 'plumbing',
      priceType: 'FIXED',
      price: '500',
      currency: 'ZAR',
      availability: {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }],
        saturday: [],
        sunday: [],
      },
      isPublished: true,
      status: 'ACTIVE',
    },
  ] as Record<string, unknown>[],

  // Platform fee percent
  platformFeePercent: '8.00',

  // Count results for pagination
  totalCount: 0,
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((key: string) => {
        if (key === 'x-tenant-id') return mocks.tenantId;
        if (key === 'x-tenant-slug') return 'test-tenant';
        return null;
      }),
    })
  ),
}));

vi.mock('@api/server', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createQueryBuilder = (): any => {
    const builder: Record<string, unknown> = {};
    builder.from = vi.fn(() => builder);
    builder.innerJoin = vi.fn(() => builder);
    builder.leftJoin = vi.fn(() => builder);
    builder.where = vi.fn(() => builder);
    builder.orderBy = vi.fn(() => builder);
    builder.limit = vi.fn(() => builder);
    builder.offset = vi.fn(() => builder);
    return builder;
  };

  const dbSelect = vi.fn(createQueryBuilder);
  const dbInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    }),
  });
  const dbUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });

  return {
    auth: {
      api: {
        getSession: vi.fn(() =>
          mocks.sessionUser ? Promise.resolve({ user: mocks.sessionUser }) : Promise.resolve(null)
        ),
      },
    },
    db: {
      select: dbSelect,
      insert: dbInsert,
      update: dbUpdate,
    },
    serviceBookings: {},
    communityServiceListings: {},
    communityServiceInquiries: {},
    users: {},
    providerSubscriptions: {},
    subscriptionTiers: {},
    apiSuccess: vi.fn((data: unknown) => Response.json({ success: true, data }, { status: 200 })),
    apiError: vi.fn((code: string, message: string, status: number) =>
      Response.json({ success: false, error: { code, message } }, { status })
    ),
    apiUnauthorized: vi.fn(() =>
      Response.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      )
    ),
    apiNotFound: vi.fn((message?: string) =>
      Response.json(
        { success: false, error: { code: 'NOT_FOUND', message: message || 'Not found' } },
        { status: 404 }
      )
    ),
    apiInternalError: vi.fn(() =>
      Response.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      )
    ),
    apiConflict: vi.fn((message?: string) =>
      Response.json(
        {
          success: false,
          error: { code: 'CONFLICT', message: message || 'Resource conflict' },
        },
        { status: 409 }
      )
    ),
    now: vi.fn(() => new Date('2026-06-27T12:00:00Z')),
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: vi.fn(() => Promise.resolve({ tenantId: mocks.tenantId, tenantSlug: 'test-tenant' })),
}));

vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
  createComponentLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@shared/api/provider-platform', () => ({
  getProviderRecordForUser: vi.fn(() => Promise.resolve(mocks.providerRecord)),
}));

vi.mock('@entities/marketplace/server', () => ({
  calculatePlatformFee: vi.fn(() => Promise.resolve(40)),
  initializeCheckout: vi.fn(),
  createPaymentTransaction: vi.fn(),
  serviceBookingSchema: {
    safeParse: vi.fn((data: unknown) => {
      const d = data as Record<string, unknown>;
      if (!d.listingId || !d.date || !d.startTime || !d.endTime) {
        return { success: false, error: { errors: [{ message: 'Validation error' }] } };
      }
      return { success: true, data };
    }),
  },
  getProviderRecordForUser: vi.fn(() => Promise.resolve(mocks.providerRecord)),
}));

// ---------------------------------------------------------------------------
// Helper: configure db.select to return different results per call (sequence)
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeChain(rows: unknown[]): any {
  const chain: Record<string, unknown> = {};
  // All chain methods return the chain itself for fluent API mocking
  const chainMethods = [
    'from',
    'innerJoin',
    'leftJoin',
    'where',
    'orderBy',
    'limit',
    'offset',
    'groupBy',
  ];
  for (const method of chainMethods) {
    chain[method] = vi.fn(() => chain);
  }
  // Resolve with rows when awaited (Drizzle uses thenables)
  chain.then = (resolve: (v: unknown) => void) => resolve(rows);
  return chain;
}

async function mockDbSelectSequence(...sequences: unknown[][]) {
  const { db } = await import('@api/server');
  let callIdx = 0;
  vi.mocked(db.select).mockImplementation(() => {
    const rows = sequences[callIdx] || sequences[sequences.length - 1] || [];
    callIdx++;
    return makeChain(rows);
  });
}

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------
import { GET, POST, PATCH } from '../../service-bookings/route';

describe('ServiceBookings API — Task 1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionUser = { id: 'user-1', email: 'user@test.com', name: 'Test User' };
    mocks.providerRecord = {
      id: 'provider-1',
      tenantId: 'tenant-1',
      email: 'user@test.com',
      businessName: 'Test Provider',
    };
    mocks.totalCount = 1;
    mocks.platformFeePercent = '8.00';
    mocks.savedBookings = [];
  });

  // -- Test 1: POST creates booking with PENDING_CONFIRMATION -----------------
  describe('POST /api/service-bookings', () => {
    it('creates ServiceBooking with status=PENDING_CONFIRMATION for valid request', async () => {
      // Sequence: [0] listing fetch, [1] conflict check (no conflict), [2] created booking fetch
      await mockDbSelectSequence(
        [
          {
            id: 'listing-1',
            providerId: 'provider-1',
            price: '500',
            priceType: 'FIXED',
            isPublished: true,
            tenantId: 'tenant-1',
          },
        ],
        [], // no conflict
        [
          {
            id: 'booking-new',
            tenantId: 'tenant-1',
            listingId: 'listing-1',
            providerId: 'provider-1',
            userId: 'user-1',
            date: new Date('2026-07-15'),
            startTime: '09:00',
            endTime: '10:00',
            price: '500',
            platformFee: '40',
            paymentStatus: 'PENDING',
            status: 'PENDING_CONFIRMATION',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
      );

      const request = new Request('http://localhost/api/service-bookings', {
        method: 'POST',
        body: JSON.stringify({
          listingId: 'listing-1',
          date: '2026-07-15',
          startTime: '09:00',
          endTime: '10:00',
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });
  });

  // -- Test 2: POST with overlapping time slot returns 409 CONFLICT -----------
  describe('POST /api/service-bookings (double booking)', () => {
    it('returns 409 CONFLICT for overlapping time slot', async () => {
      // Sequence: [0] listing fetch, [1] conflict check (conflict exists)
      await mockDbSelectSequence(
        [
          {
            id: 'listing-1',
            providerId: 'provider-1',
            price: '500',
            priceType: 'FIXED',
            isPublished: true,
            tenantId: 'tenant-1',
          },
        ],
        [
          {
            id: 'existing-booking',
            listingId: 'listing-1',
            date: new Date('2026-07-15'),
            startTime: '09:00',
            status: 'PENDING_CONFIRMATION',
          },
        ]
      );

      const request = new Request('http://localhost/api/service-bookings', {
        method: 'POST',
        body: JSON.stringify({
          listingId: 'listing-1',
          date: '2026-07-15',
          startTime: '09:00',
          endTime: '10:00',
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CONFLICT');
    });
  });

  // -- Test 3: GET filters by resident userId --------------------------------
  describe('GET /api/service-bookings?role=resident', () => {
    it('returns only bookings where userId matches session user', async () => {
      await mockDbSelectSequence([
        {
          id: 'booking-1',
          tenantId: 'tenant-1',
          listingId: 'listing-1',
          providerId: 'provider-1',
          userId: 'user-1',
          date: new Date('2026-07-15'),
          startTime: '09:00',
          endTime: '10:00',
          price: '500',
          platformFee: '40',
          paymentStatus: 'PENDING',
          status: 'PENDING_CONFIRMATION',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const request = new Request(
        'http://localhost/api/service-bookings?role=resident&limit=20&offset=0'
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.bookings).toBeDefined();
    });
  });

  // -- Test 4: GET filters by provider role ----------------------------------
  describe('GET /api/service-bookings?role=provider', () => {
    it('returns bookings where providerId matches provider record', async () => {
      mocks.providerRecord = {
        id: 'provider-1',
        tenantId: 'tenant-1',
        email: 'user@test.com',
        businessName: 'Test Provider',
      };

      await mockDbSelectSequence([
        {
          id: 'booking-1',
          tenantId: 'tenant-1',
          listingId: 'listing-1',
          providerId: 'provider-1',
          userId: 'user-2',
          date: new Date('2026-07-15'),
          startTime: '09:00',
          endTime: '10:00',
          price: '500',
          platformFee: '40',
          paymentStatus: 'PENDING',
          status: 'PENDING_CONFIRMATION',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const request = new Request(
        'http://localhost/api/service-bookings?role=provider&limit=20&offset=0'
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.bookings).toBeDefined();
    });
  });

  // -- Test 5: GET /api/services/[id]/availability returns schedule + slots --
  describe('GET /api/services/[id]/availability', () => {
    it('returns parsed weekly schedule + booked slots for next 30 days', async () => {
      // Mock the listing with availability JSONB
      await mockDbSelectSequence([
        {
          id: 'listing-1',
          tenantId: 'tenant-1',
          providerId: 'provider-1',
          availability: {
            monday: [{ start: '09:00', end: '17:00' }],
            tuesday: [{ start: '09:00', end: '17:00' }],
            wednesday: [{ start: '09:00', end: '17:00' }],
            thursday: [{ start: '09:00', end: '17:00' }],
            friday: [{ start: '09:00', end: '17:00' }],
            saturday: [],
            sunday: [],
          },
        },
      ]);

      // Import the availability route
      const { GET: availGET } = await import('../../services/[id]/availability/route');

      const request = new Request('http://localhost/api/services/listing-1/availability');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await availGET(request as any, {
        params: Promise.resolve({ id: 'listing-1' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.availability).toBeDefined();
      expect(body.data.bookedSlots).toBeDefined();
    });
  });

  // -- Test 6: POST without auth returns 401 ---------------------------------
  describe('POST /api/service-bookings (no auth)', () => {
    it('returns 401 when no auth session', async () => {
      mocks.sessionUser = null;

      const request = new Request('http://localhost/api/service-bookings', {
        method: 'POST',
        body: JSON.stringify({
          listingId: 'listing-1',
          date: '2026-07-15',
          startTime: '09:00',
          endTime: '10:00',
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  // -- Test 7: PATCH updates booking status ----------------------------------
  describe('PATCH /api/service-bookings (status transition)', () => {
    it('updates booking status from PENDING_CONFIRMATION to CONFIRMED', async () => {
      // Mock the booking fetch
      await mockDbSelectSequence([
        {
          id: 'booking-1',
          tenantId: 'tenant-1',
          listingId: 'listing-1',
          providerId: 'provider-1',
          userId: 'user-1',
          date: new Date('2026-07-15'),
          startTime: '09:00',
          endTime: '10:00',
          price: '500',
          platformFee: '40',
          paymentStatus: 'PENDING',
          status: 'PENDING_CONFIRMATION',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Set user as provider
      mocks.providerRecord = {
        id: 'provider-1',
        tenantId: 'tenant-1',
        email: 'user@test.com',
        businessName: 'Test Provider',
      };

      const request = new Request('http://localhost/api/service-bookings', {
        method: 'PATCH',
        body: JSON.stringify({
          bookingId: 'booking-1',
          status: 'CONFIRMED',
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await PATCH(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });
});
