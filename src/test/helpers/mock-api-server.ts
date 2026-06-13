/**
 * Centralized @api/server mock helper.
 * Provides default mock implementations for every export in the
 * @api/server barrel so production routes under test never see
 * undefined for imported identifiers.
 *
 * Usage:
 *   import { mockApiServer } from '@/test/helpers/mock-api-server';
 *   mockApiServer({ auth: { api: { getSession: myMock.fn() } }, ... });
 */

import { vi } from 'vitest';

function mockFn() {
  return vi.fn();
}

function mockTable(name: string) {
  return { id: 'id', name, __brand: 'table' };
}

const jsonResponse = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export function mockApiServer(overrides: Record<string, unknown> = {}) {
  vi.mock('@api/server', () => ({
    // --- database ---
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      ...(overrides.db as Record<string, unknown> | undefined),
    },
    runWithRLS: vi.fn(),
    getRLSContext: vi.fn(() => ({ tenantId: 'test-tenant', role: 'RESIDENT' })),

    // --- schema tables ---
    messages: mockTable('messages'),
    conversations: mockTable('conversations'),
    conversationParticipants: mockTable('conversationParticipants'),
    users: mockTable('users'),
    profiles: mockTable('profiles'),
    settings: mockTable('settings'),
    albums: mockTable('albums'),
    standardSeats: mockTable('standardSeats'),
    soloSeats: mockTable('soloSeats'),
    properties: mockTable('properties'),
    households: mockTable('households'),
    premiumSeats: mockTable('premiumSeats'),
    contents: mockTable('contents'),
    propertyListings: mockTable('propertyListings'),
    communityServiceListings: mockTable('communityServiceListings'),
    communityServiceReviews: mockTable('communityServiceReviews'),
    communityServiceInquiries: mockTable('communityServiceInquiries'),
    groups: mockTable('groups'),
    userGroups: mockTable('userGroups'),
    surveys: mockTable('surveys'),
    questions: mockTable('questions'),
    responses: mockTable('responses'),
    surveySections: mockTable('surveySections'),
    externalSurveys: mockTable('externalSurveys'),
    invitations: mockTable('invitations'),
    bookings: mockTable('bookings'),
    maintenanceRequests: mockTable('maintenanceRequests'),
    notifications: mockTable('notifications'),
    agentProfiles: mockTable('agentProfiles'),
    propertiesTopremiumSeats: mockTable('propertiesTopremiumSeats'),
    verifications: mockTable('verifications'),
    accounts: mockTable('accounts'),
    sessions: mockTable('sessions'),
    passkeys: mockTable('passkeys'),
    twoFactors: mockTable('twoFactors'),
    members: mockTable('members'),
    organizations: mockTable('organizations'),
    tenants: mockTable('tenants'),
    events: mockTable('events'),
    eventAttendees: mockTable('eventAttendees'),
    announcements: mockTable('announcements'),
    agentAccesses: mockTable('agentAccesses'),
    platformSuspensions: mockTable('platformSuspensions'),
    groupMembershipRequests: mockTable('groupMembershipRequests'),
    platformModules: mockTable('platformModules'),
    tenantModules: mockTable('tenantModules'),
    assistSessions: mockTable('assistSessions'),
    resources: mockTable('resources'),
    resourceVersions: mockTable('resourceVersions'),
    competitions: mockTable('competitions'),
    competitionEntries: mockTable('competitionEntries'),
    maintenanceTeams: mockTable('maintenanceTeams'),
    serviceProviders: mockTable('serviceProviders'),
    maintenanceCategories: mockTable('maintenanceCategories'),
    requestNotes: mockTable('requestNotes'),
    requestHistories: mockTable('requestHistories'),

    // --- auth ---
    auth: {
      api: { getSession: vi.fn(() => Promise.resolve(null)) },
      ...(overrides.auth as Record<string, unknown> | undefined),
    },
    getSessionAndRole: vi.fn(() => Promise.resolve(null)),
    requireNotSuspended: vi.fn(),
    requireAnyPermission: vi.fn(),
    throwIfSuspended: vi.fn(),

    // --- revalidation ---
    revalidateDashboard: vi.fn(),
    revalidateDirectory: vi.fn(),
    revalidateContent: vi.fn(),
    revalidateConversations: vi.fn(),
    revalidateAdminChanges: vi.fn(),
    revalidateUserData: vi.fn(),
    revalidateGate: vi.fn(),
    CACHE_TAGS: {},

    // --- rate limiting ---
    rateLimitByIP: vi.fn(() => null),
    rateLimitByKey: vi.fn(() => null),
    rateLimitByUser: vi.fn(() => null),
    DEFAULT_RATE_LIMITS: {},

    // --- audit ---
    writeAuditLog: vi.fn(),

    // --- supabase ---
    supabase: {},

    // --- data fetching ---
    getDashboardStats: vi.fn(() => Promise.resolve({})),
    getStaticStats: vi.fn(() => Promise.resolve({})),
    getUserContent: vi.fn(() => Promise.resolve([])),

    // --- storage ---
    uploadImage: vi.fn(),
    listUserImages: vi.fn(),
    deleteImage: vi.fn(),
    validateImage: vi.fn(),

    // --- turnstile ---
    verifyTurnstile: vi.fn(() => Promise.resolve(true)),

    // --- observability ---
    getRequestId: vi.fn(() => 'test-request-id'),
    createLogContext: vi.fn(),
    withTiming: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),

    // --- API response helpers -- THE CRITICAL ONES ---
    ERROR_CODES: {} as Record<string, string>,
    apiSuccess: vi.fn((data: unknown) => jsonResponse(data, 200)),
    apiError: vi.fn((msg: string, status = 500) => jsonResponse({ error: msg }, status)),
    apiPaginated: vi.fn((data: unknown, meta: unknown) => jsonResponse({ data, meta }, 200)),
    apiCreated: vi.fn((data: unknown) => jsonResponse(data, 201)),
    apiNoContent: vi.fn(() => new Response(null, { status: 204 })),
    apiUnauthorized: vi.fn(() => jsonResponse({ error: 'Unauthorized' }, 401)),
    apiForbidden: vi.fn(() => jsonResponse({ error: 'Forbidden' }, 403)),
    apiTenantRequired: vi.fn(() => jsonResponse({ error: 'Tenant required' }, 400)),
    apiTenantForbidden: vi.fn(() => jsonResponse({ error: 'Tenant access denied' }, 403)),
    apiValidationError: vi.fn((msg: string) => jsonResponse({ error: msg }, 400)),
    apiNotFound: vi.fn(() => jsonResponse({ error: 'Not found' }, 404)),
    apiSuspendedUser: vi.fn(() => jsonResponse({ error: 'Account suspended' }, 403)),
    apiConflict: vi.fn((msg: string) => jsonResponse({ error: msg }, 409)),
    apiGone: vi.fn((msg: string) => jsonResponse({ error: msg }, 410)),
    apiInternalError: vi.fn((msg: string) => jsonResponse({ error: msg }, 500)),

    // --- trpc ---
    createContext: vi.fn(),
    router: vi.fn(),
    publicProcedure: {},
    protectedProcedure: {},
    adminProcedure: {},
    agentProcedure: {},
    appRouter: {},

    // --- email ---
    sendEmail: vi.fn().mockResolvedValue({}),
    templates: {},

    // --- overrides (apply last to allow overriding ANY default) ---
    ...overrides,
  }));
}
