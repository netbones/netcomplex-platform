import { vi } from 'vitest';

function mockTable(name: string) {
  return { id: 'id', name, __brand: 'table' } as const;
}

const jsonResponse = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/**
 * Returns the default mock object for @api/server.
 * Use with vi.mock:
 *   vi.mock('@api/server', () => createApiServerMocks({ ...overrides }))
 *
 * Or override specific keys:
 *   vi.mock('@api/server', () => ({
 *     ...createApiServerMocks(),
 *     myOverride: vi.fn(),
 *   }))
 *
 * WARNING: Do NOT call vi.mock() inside this function — vitest will not
 * hoist it correctly. Always use it directly in a vi.mock() factory.
 */
export function createApiServerMocks(overrides: Record<string, unknown> = {}) {
  return {
    // --- database core ---
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn((fn: (tx: unknown) => Promise<void>) =>
        fn({ select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() })
      ),
      ...((overrides.db ?? {}) as Record<string, unknown>),
    },
    runWithRLS: vi.fn(),
    notDeleted: vi.fn(() => true),
    assertAddressUnique: vi.fn(() => Promise.resolve()),
    getRLSContext: vi.fn(() => ({ tenantId: 'test-tenant', role: 'RESIDENT' })),
    requireTenantRLS: vi.fn(() => ({ tenantId: 'test-tenant', role: 'RESIDENT' })),

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
    dataConsents: mockTable('dataConsents'),
    dataRevenueStreams: mockTable('dataRevenueStreams'),
    dataShareBatches: mockTable('dataShareBatches'),
    dWallets: mockTable('dWallets'),
    propertyListings: mockTable('propertyListings'),
    communityServiceListings: mockTable('communityServiceListings'),
    communityServiceReviews: mockTable('communityServiceReviews'),
    communityServiceInquiries: mockTable('communityServiceInquiries'),
    serviceBookings: mockTable('serviceBookings'),
    groups: mockTable('groups'),
    groupMembers: mockTable('groupMembers'),
    supports: mockTable('supports'),
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
    agentReviews: mockTable('agentReviews'),
    platformSuspensions: mockTable('platformSuspensions'),
    communityMerits: mockTable('communityMerits'),
    groupMembershipRequests: mockTable('groupMembershipRequests'),
    platformModules: mockTable('platformModules'),
    tenantModules: mockTable('tenantModules'),
    assistSessions: mockTable('assistSessions'),
    resources: mockTable('resources'),
    resourceVersions: mockTable('resourceVersions'),
    competitions: mockTable('competitions'),
    competitionEntries: mockTable('competitionEntries'),
    contentLikes: mockTable('contentLikes'),
    maintenanceTeams: mockTable('maintenanceTeams'),
    maintenanceTeamMembers: mockTable('maintenanceTeamMembers'),
    serviceProviders: mockTable('serviceProviders'),
    maintenanceCategories: mockTable('maintenanceCategories'),
    bursaryFields: mockTable('bursaryFields'),
    bursaries: mockTable('bursaries'),
    requestNotes: mockTable('requestNotes'),
    internalMaintenanceNotes: mockTable('internalMaintenanceNotes'),
    requestHistories: mockTable('requestHistories'),
    providerVerifications: mockTable('providerVerifications'),
    providerLegalAgreements: mockTable('providerLegalAgreements'),
    providerReputations: mockTable('providerReputations'),
    providerMerits: mockTable('providerMerits'),
    subscriptionTiers: mockTable('subscriptionTiers'),
    providerSubscriptions: mockTable('providerSubscriptions'),
    paymentTransactions: mockTable('paymentTransactions'),
    walletTransactions: mockTable('walletTransactions'),
    providerCharges: mockTable('providerCharges'),
    providerInvoices: mockTable('providerInvoices'),
    revenueRecords: mockTable('revenueRecords'),
    platformAiTierQuotas: mockTable('platformAiTierQuotas'),
    aiCapabilityCosts: mockTable('aiCapabilityCosts'),
    tenantAiUsages: mockTable('tenantAiUsages'),
    aiUsageEvents: mockTable('aiUsageEvents'),
    disputeCases: mockTable('disputeCases'),
    disputeEvents: mockTable('disputeEvents'),
    disputeEvidences: mockTable('disputeEvidences'),
    disputeMessageVersions: mockTable('disputeMessageVersions'),
    disputeMessages: mockTable('disputeMessages'),
    disputeNotifications: mockTable('disputeNotifications'),
    residentDelegations: mockTable('residentDelegations'),
    agentTokens: mockTable('agentTokens'),
    delegationActions: mockTable('delegationActions'),
    addresses: mockTable('addresses'),
    handles: mockTable('handles'),
    addressEndpoints: mockTable('addressEndpoints'),
    tenantSetups: mockTable('tenantSetups'),
    setupMissions: mockTable('setupMissions'),
    setupSettings: mockTable('setupSettings'),

    // --- auth ---
    auth: {
      api: { getSession: vi.fn(() => Promise.resolve(null)) },
      ...((overrides.auth ?? {}) as Record<string, unknown>),
    },
    getSessionAndRole: vi.fn(() => Promise.resolve(null)),
    guardSuspension: vi.fn(() => null),
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

    // --- storage ---
    uploadImage: vi.fn(),
    listUserImages: vi.fn(),
    deleteImage: vi.fn(),
    validateImage: vi.fn(),
    uploadTenantImage: vi.fn(),
    listTenantImages: vi.fn(),
    deleteTenantImage: vi.fn(),

    // --- turnstile ---
    verifyTurnstile: vi.fn(() => Promise.resolve(true)),

    // --- events ---
    emitEvent: vi.fn(),
    onEvent: vi.fn(),
    offEvent: vi.fn(),

    // --- clock ---
    now: () => new Date('2026-07-21T00:00:00Z'),
    setClock: vi.fn(),

    // --- observability ---
    getRequestId: vi.fn(() => 'test-request-id'),
    createLogContext: vi.fn(),
    withTiming: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),

    // --- API response helpers ---
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
    apiValidationError: vi.fn((msg: string) => jsonResponse({ error: msg }, 422)),
    apiNotFound: vi.fn(() => jsonResponse({ error: 'Not found' }, 404)),
    apiSuspendedUser: vi.fn(() => jsonResponse({ error: 'Account suspended' }, 403)),
    apiConflict: vi.fn((msg: string) => jsonResponse({ error: msg }, 409)),
    apiGone: vi.fn((msg: string) => jsonResponse({ error: msg }, 410)),
    apiInternalError: vi.fn((msg: string) => jsonResponse({ error: msg }, 500)),

    withErrorHandler: (fn: (...args: unknown[]) => unknown) => fn,

    // --- trpc ---
    createContext: vi.fn(),
    router: vi.fn(),
    publicProcedure: {},
    protectedProcedure: {},
    adminProcedure: {},
    agentProcedure: {},
    tenantProcedure: {},
    privilegedProcedure: {},
    moduleProcedure: {},
    privilegedModuleProcedure: {},
    rateLimitMiddleware: vi.fn(),

    // --- envelope ---
    toEnvelope: vi.fn((data: unknown) => ({ success: true, data })),
    toEnvelopeSchema: vi.fn((schema: unknown) => schema),
    toPaginatedEnvelope: vi.fn((data: unknown, meta: unknown) => ({ success: true, data, meta })),
    toErrorEnvelope: vi.fn((code: string, message: string) => ({
      success: false,
      error: { code, message },
    })),
    tRPCCodeToCanonical: vi.fn((code: string) => code),

    // --- address service ---
    AddressService: class {},
    AddressConflictError: class extends Error {},
    AddressValidationError: class extends Error {},
    AddressNotFoundError: class extends Error {},

    // --- handle service ---
    HandleService: class {},
    HandleConflictError: class extends Error {},
    HandleNotFoundError: class extends Error {},

    // --- email ---
    sendEmail: vi.fn().mockResolvedValue({}),
    templates: {},

    // --- tenant module ---
    getTenantModule: vi.fn(() => Promise.resolve(null)),

    // --- tenant billing (stubs) ---
    createTenantSubscriptionCheckout: vi.fn(),
    cancelTenantSubscription: vi.fn(),
    upgradeTenantSubscription: vi.fn(),
    downgradeTenantSubscription: vi.fn(),
    getTenantBillingSnapshot: vi.fn(() => Promise.resolve({})),
    markTransactionCompletedByReference: vi.fn(),
    markTransactionFailedByReference: vi.fn(),
    syncTierToTenant: vi.fn(),
    recordBillingEvent: vi.fn(),
    ensureOverageInvoiceRecord: vi.fn(),
    getOrCreateDefaultBillingPlans: vi.fn(() => Promise.resolve([])),

    // --- AI provider ---
    getAiProvider: vi.fn(),
    getPoolProviderConfig: vi.fn(),
    isAiCapabilityEnabled: vi.fn(() => Promise.resolve(false)),
    checkQuota: vi.fn(() => Promise.resolve({ allowed: true, remaining: 10 })),
    recordUsage: vi.fn(() => Promise.resolve()),
    getCurrentBillingMonth: vi.fn(() => '2026-07'),
    AI_MODELS: {},

    // --- overrides (apply last) ---
    ...overrides,
  };
}

// Re-export for backwards compatibility — prefer createApiServerMocks for new code.
export const mockApiServer = createApiServerMocks;
