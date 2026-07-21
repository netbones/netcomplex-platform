import { describe, it, expect, vi } from 'vitest';

vi.setConfig({ testTimeout: 15000 });

vi.mock('server-only', () => ({}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({ subscribe: vi.fn() })),
  })),
}));

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

const jsonResponse = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

function mockTable(name: string) {
  return { id: 'id', name, __brand: 'table' };
}

vi.mock('@api/server', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  runWithRLS: vi.fn(),
  getRLSContext: vi.fn(() => ({ tenantId: 'test-tenant', role: 'RESIDENT' })),
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
  groupMembers: mockTable('groupMembers'),
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
  propertyPremiumSeats: mockTable('propertyPremiumSeats'),
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
  auth: { api: { getSession: vi.fn(() => Promise.resolve(null)) } },
  getSessionAndRole: vi.fn(() => Promise.resolve(null)),
  guardSuspension: () => null,
  requireNotSuspended: vi.fn(),
  requireAnyPermission: vi.fn(),
  throwIfSuspended: vi.fn(),
  revalidateDashboard: vi.fn(),
  revalidateDirectory: vi.fn(),
  revalidateContent: vi.fn(),
  revalidateConversations: vi.fn(),
  revalidateAdminChanges: vi.fn(),
  revalidateUserData: vi.fn(),
  revalidateGate: vi.fn(),
  CACHE_TAGS: {},
  rateLimitByIP: vi.fn(() => null),
  rateLimitByKey: vi.fn(() => null),
  rateLimitByUser: vi.fn(() => null),
  DEFAULT_RATE_LIMITS: {},
  writeAuditLog: vi.fn(),
  supabase: {},
  getDashboardStats: vi.fn(() => Promise.resolve({})),
  getStaticStats: vi.fn(() => Promise.resolve({})),
  getUserContent: vi.fn(() => Promise.resolve([])),
  uploadImage: vi.fn(),
  listUserImages: vi.fn(),
  deleteImage: vi.fn(),
  validateImage: vi.fn(),
  verifyTurnstile: vi.fn(() => Promise.resolve(true)),
  getRequestId: vi.fn(() => 'test-request-id'),
  createLogContext: vi.fn(),
  withTiming: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  ERROR_CODES: {},
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
  createContext: vi.fn(),
  router: vi.fn(),
  publicProcedure: {},
  protectedProcedure: {},
  adminProcedure: {},
  agentProcedure: {},
  appRouter: {},
  sendEmail: vi.fn().mockResolvedValue({}),
  templates: {},
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
  hasPermission: vi.fn(() => true),
  defaultLanguage: 'en',
  isAdmin: (role: string | null | undefined) => {
    if (!role) return false;
    return ['ADMIN', 'BOARD'].includes(role);
  },
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
  requireAssistScope: vi.fn(() => null),
}));

vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

describe('v1 re-export routes', () => {
  describe('public namespace', () => {
    it('re-exports resources', async () => {
      const mod = await import('@/app/api/v1/public/resources/route');
      expect(mod.GET).toBeInstanceOf(Function);
    });

    it('re-exports events', async () => {
      const mod = await import('@/app/api/v1/public/events/route');
      expect(mod.GET).toBeInstanceOf(Function);
    });

    it('re-exports competitions', async () => {
      const mod = await import('@/app/api/v1/public/competitions/route');
      expect(mod.GET).toBeInstanceOf(Function);
    });

    it('re-exports content', async () => {
      const mod = await import('@/app/api/v1/public/content/route');
      expect(mod.GET).toBeInstanceOf(Function);
    });
  });

  describe('system namespace', () => {
    it('re-exports flags', async () => {
      const mod = await import('@/app/api/v1/system/flags/route');
      expect(mod.GET).toBeInstanceOf(Function);
    });
  });

  describe('tenant namespace', () => {
    const routes: [string, string[]][] = [
      ['bookings', ['GET', 'POST']],
      ['campaign', ['GET']],
      ['community-services/inquiries', ['GET', 'POST']],
      ['community-services/listings', ['GET', 'POST']],
      ['community-services/reviews', ['GET', 'POST']],
      ['competitions', ['GET', 'POST']],
      ['competitions/[id]', ['GET', 'PATCH', 'DELETE']],
      ['conservation', ['GET']],
      ['content', ['GET', 'POST']],
      ['content/[id]', ['GET', 'PATCH', 'DELETE']],
      ['conversations', ['GET', 'POST']],
      ['conversations/find', ['POST']],
      ['dwallet', ['GET']],
      ['dwallet/consents', ['GET']],
      ['dwallet/consents/[streamKey]', ['POST']],
      ['dwallet/deletion-request', ['POST']],
      ['dwallet/export', ['POST']],
      ['dwallet/payout', ['GET', 'POST']],
      ['dwallet/statement', ['GET']],
      ['dwallet/streams', ['GET']],
      ['dwallet/transactions', ['GET']],
      ['events', ['GET', 'POST']],
      ['events/[id]', ['GET', 'PATCH', 'DELETE']],
      ['groups/members', ['POST', 'DELETE']],
      ['groups/membership-requests', ['GET']],
      ['groups/membership-requests/[id]', ['POST']],
      ['households', ['GET']],
      ['households/[id]', ['GET', 'PATCH']],
      ['invitations', ['GET', 'POST']],
      ['invitations/[id]', ['DELETE']],
      ['invitations/accept', ['POST']],
      ['invitations/validate', ['GET']],
      ['maintenance', ['GET', 'POST']],
      ['messages', ['GET', 'POST', 'DELETE']],
      ['messages/unread', ['GET']],
      ['pricing', ['GET']],
      ['resources', ['GET', 'POST']],
      ['resources/[id]', ['GET', 'PATCH', 'DELETE']],
      ['surveys', ['GET', 'POST']],
      ['users', ['GET']],
      ['users/[id]', ['GET', 'PATCH', 'DELETE']],
    ];

    for (const [path, methods] of routes) {
      describe(`/api/v1/tenant/${path}`, () => {
        it('re-exports all expected handlers', async () => {
          const mod = await import(`@/app/api/v1/tenant/${path}/route`);
          for (const method of methods) {
            expect(mod[method as keyof typeof mod]).toBeInstanceOf(Function);
          }
        });
      });
    }
  });
});
