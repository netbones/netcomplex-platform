/**
 * AI Intake Screen route handler tests.
 * Plan 106-03 — Task 1: Full pool lifecycle with graceful degradation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mock state ──
const mocks = vi.hoisted(() => ({
  // Auth
  authResult: null as { userId: string; role: string; session: unknown } | null,
  rateLimitHit: false,

  // Tenant
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },

  // AI Pool
  capabilityEnabled: true,
  quotaAllowed: true,
  quotaRemainingTokens: 50000,
  providerAvailable: true,
  providerName: 'anthropic' as 'anthropic' | 'openai' | 'deepseek' | 'null',
  aiResponseText:
    '{"toneScore":3,"issueClarity":7,"likelyFrivolous":false,"suggestedCategory":"NOISE","deEscalationTip":"Focus on specific dates and behaviors."}',
  aiCallThrows: false,
  aiCallTokensUsed: 150,

  // Spies for behaviour verification
  recordUsageCalls: [] as Array<Record<string, unknown>>,
  sanitizeDescriptions: [] as string[],
  providerCompleteCalls: [] as Array<{ prompt: string; options: Record<string, unknown> }>,
  completeCallOrder: [] as string[],
}));

// ── server-only mock ──
vi.mock('server-only', () => ({}));

// ── next/headers mock ──
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

// ── @api/server mock ──
vi.mock('@api/server', () => {
  const createResponse = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  return {
    auth: {
      api: {
        getSession: vi.fn(() => Promise.resolve(mocks.authResult?.session ?? null)),
      },
    },
    db: {} as Record<string, unknown>,
    users: {},
    disputeCases: {},

    getSessionAndRole: vi.fn(async () => mocks.authResult),

    guardSuspension: vi.fn(() => null),

    rateLimitByUser: vi.fn(async () =>
      mocks.rateLimitHit
        ? createResponse(
            {
              success: false,
              error: { code: 'RATE_LIMITED', message: 'Too many requests' },
            },
            429
          )
        : null
    ),

    getAiProvider: vi.fn(async () => ({
      name: mocks.providerName,
      isAvailable: vi.fn(() => mocks.providerAvailable),
      complete: vi.fn(async (prompt: string, options: Record<string, unknown>) => {
        mocks.completeCallOrder.push('provider.complete');
        mocks.providerCompleteCalls.push({ prompt, options });
        if (mocks.aiCallThrows) {
          throw new Error('AI service unavailable');
        }
        return {
          text: mocks.aiResponseText,
          provider: mocks.providerName,
          tokensUsed: mocks.aiCallTokensUsed,
        };
      }),
    })),

    isAiCapabilityEnabled: vi.fn(async () => mocks.capabilityEnabled),

    checkQuota: vi.fn(async () => ({
      allowed: mocks.quotaAllowed,
      remainingTokens: mocks.quotaRemainingTokens,
      denyReason: mocks.quotaAllowed ? undefined : ('quota_exhausted' as const),
    })),

    recordUsage: vi.fn(async (opts: Record<string, unknown>) => {
      mocks.recordUsageCalls.push(opts);
    }),

    AI_MODELS: {
      ANTHROPIC: 'claude-haiku-4-5-20241022',
      OPENAI: 'gpt-4o-mini',
      DEEPSEEK: 'deepseek-chat',
    },

    apiError: vi.fn((code: string, message: string, status: number, details?: unknown) =>
      createResponse(
        { success: false, error: { code, message, ...(details ? { details } : {}) } },
        status
      )
    ),

    apiInternalError: vi.fn(() =>
      createResponse(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        },
        500
      )
    ),

    apiSuccess: vi.fn((data: unknown) => createResponse({ success: true, data }, 200)),

    apiUnauthorized: vi.fn(() =>
      createResponse(
        {
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        },
        401
      )
    ),

    apiForbidden: vi.fn(() =>
      createResponse(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Forbidden' },
        },
        403
      )
    ),

    // withErrorHandler passthrough
    withErrorHandler: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

// ── @entities/tenant/server mock ──
vi.mock('@entities/tenant/server', () => ({
  withTenant: vi.fn(() => Promise.resolve(mocks.tenantResult)),
}));

// ── @shared/lib mock ──
vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
  hasPermission: vi.fn((role: string, perm: string) => {
    if (perm === 'admin') return role === 'ADMIN';
    return false;
  }),
  createComponentLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));

// ── PII sanitizer mock ──
vi.mock('@entities/dispute/lib/pii-sanitizer', () => ({
  sanitizeDescriptionForAi: vi.fn((text: string) => {
    mocks.completeCallOrder.push('sanitize');
    mocks.sanitizeDescriptions.push(text);
    return text.replace(/John Smith/g, '[NAME]');
  }),
}));

// ── intake-screen-output mock (stub during RED phase) ──
vi.mock('@/shared/lib/dispute/intake-screen-output', () => ({
  parseIntakeScreenOutput: vi.fn((raw: string) => {
    try {
      return JSON.parse(raw);
    } catch {
      return {
        toneScore: 0,
        issueClarity: 5,
        likelyFrivolous: false,
        suggestedCategory: 'OTHER',
        deEscalationTip: null,
      };
    }
  }),
}));

// ── Helper: create a JSON request ──
function createJsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── TASK 1: AI Intake Screen Route Tests ──

describe('POST /api/disputes/intake-screen — AI Frivolity Screening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mutable mock state
    mocks.authResult = null;
    mocks.rateLimitHit = false;
    mocks.capabilityEnabled = true;
    mocks.quotaAllowed = true;
    mocks.quotaRemainingTokens = 50000;
    mocks.providerAvailable = true;
    mocks.providerName = 'anthropic';
    mocks.aiResponseText =
      '{"toneScore":3,"issueClarity":7,"likelyFrivolous":false,"suggestedCategory":"NOISE","deEscalationTip":"Focus on specific dates and behaviors."}';
    mocks.aiCallThrows = false;
    mocks.aiCallTokensUsed = 150;
    mocks.recordUsageCalls = [];
    mocks.sanitizeDescriptions = [];
    mocks.providerCompleteCalls = [];
    mocks.completeCallOrder = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: 401 without auth ──
  it('returns 401 without auth session', async () => {
    mocks.authResult = null; // No auth
    const { POST } = await import('../intake-screen/route');
    const req = createJsonRequest('http://localhost/api/disputes/intake-screen', {
      description: 'My neighbour plays loud music every night after 10pm.',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // ── Test 2: 400 for invalid body ──
  it('returns 400 for description too short (< 10 chars)', async () => {
    mocks.authResult = { userId: 'user-1', role: 'RESIDENT', session: { user: { id: 'user-1' } } };
    const { POST } = await import('../intake-screen/route');
    const req = createJsonRequest('http://localhost/api/disputes/intake-screen', {
      description: 'Too short',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── Test 3: 429 when rate limited ──
  it('returns 429 when rate limited (5 req/min)', async () => {
    mocks.authResult = { userId: 'user-1', role: 'RESIDENT', session: { user: { id: 'user-1' } } };
    mocks.rateLimitHit = true;
    const { POST } = await import('../intake-screen/route');
    const req = createJsonRequest('http://localhost/api/disputes/intake-screen', {
      description: 'My neighbour plays loud music every night after 10pm without fail.',
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  // ── Test 4: 503 when AI capability disabled ──
  it('returns 503 when isAiCapabilityEnabled returns false', async () => {
    mocks.authResult = { userId: 'user-1', role: 'RESIDENT', session: { user: { id: 'user-1' } } };
    mocks.capabilityEnabled = false;
    const { POST } = await import('../intake-screen/route');
    const req = createJsonRequest('http://localhost/api/disputes/intake-screen', {
      description: 'My neighbour plays loud music every night after 10pm without fail.',
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  // ── Test 5: 429 when quota exhausted ──
  it('returns 429 when checkQuota returns allowed:false', async () => {
    mocks.authResult = { userId: 'user-1', role: 'RESIDENT', session: { user: { id: 'user-1' } } };
    mocks.quotaAllowed = false;
    mocks.quotaRemainingTokens = 0;
    const { POST } = await import('../intake-screen/route');
    const req = createJsonRequest('http://localhost/api/disputes/intake-screen', {
      description: 'My neighbour plays loud music every night after 10pm without fail.',
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  // ── Test 6: 503 when provider unavailable ──
  it('returns 503 when provider.isAvailable() returns false', async () => {
    mocks.authResult = { userId: 'user-1', role: 'RESIDENT', session: { user: { id: 'user-1' } } };
    mocks.providerAvailable = false;
    const { POST } = await import('../intake-screen/route');
    const req = createJsonRequest('http://localhost/api/disputes/intake-screen', {
      description: 'My neighbour plays loud music every night after 10pm without fail.',
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  // ── Test 7: sanitizeDescriptionForAi called before provider.complete() ──
  it('calls sanitizeDescriptionForAi before provider.complete()', async () => {
    mocks.authResult = { userId: 'user-1', role: 'RESIDENT', session: { user: { id: 'user-1' } } };
    const { POST } = await import('../intake-screen/route');
    const req = createJsonRequest('http://localhost/api/disputes/intake-screen', {
      description: 'John Smith plays loud music every night after 10pm.',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify order: sanitize was called before provider.complete
    const sanitizeIdx = mocks.completeCallOrder.indexOf('sanitize');
    const completeIdx = mocks.completeCallOrder.indexOf('provider.complete');
    expect(sanitizeIdx).toBeGreaterThanOrEqual(0);
    expect(completeIdx).toBeGreaterThanOrEqual(0);
    expect(sanitizeIdx).toBeLessThan(completeIdx);

    // Verify the sanitized description contains [NAME] not John Smith
    expect(mocks.providerCompleteCalls[0].prompt).toContain('[NAME]');
  });

  // ── Test 8: recordUsage() called even when provider.complete() throws ──
  it('calls recordUsage() even when provider.complete() throws', async () => {
    mocks.authResult = { userId: 'user-1', role: 'RESIDENT', session: { user: { id: 'user-1' } } };
    mocks.aiCallThrows = true;
    const { POST } = await import('../intake-screen/route');
    const req = createJsonRequest('http://localhost/api/disputes/intake-screen', {
      description: 'My neighbour plays loud music every night after 10pm without fail.',
    });
    const res = await POST(req);
    // Should return 503 on AI failure
    expect(res.status).toBe(503);

    // recordUsage must have been called even though AI call failed
    expect(mocks.recordUsageCalls.length).toBe(1);
    expect(mocks.recordUsageCalls[0].success).toBe(false);
    expect(mocks.recordUsageCalls[0].errorCode).toBeDefined();
  });

  // ── Test 9: Returns all 5 fields on success ──
  it('returns toneScore, issueClarity, likelyFrivolous, suggestedCategory, deEscalationTip on success', async () => {
    mocks.authResult = { userId: 'user-1', role: 'RESIDENT', session: { user: { id: 'user-1' } } };
    mocks.aiResponseText =
      '{"toneScore":3,"issueClarity":7,"likelyFrivolous":false,"suggestedCategory":"NOISE","deEscalationTip":"Focus on specific dates."}';
    const { POST } = await import('../intake-screen/route');
    const req = createJsonRequest('http://localhost/api/disputes/intake-screen', {
      description: 'My neighbour plays loud music every night after 10pm without fail.',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('toneScore');
    expect(body.data).toHaveProperty('issueClarity');
    expect(body.data).toHaveProperty('likelyFrivolous');
    expect(body.data).toHaveProperty('suggestedCategory');
    expect(body.data).toHaveProperty('deEscalationTip');
  });

  // ── Test 10: Safe defaults on malformed AI JSON ──
  it('returns safe defaults when AI returns malformed JSON', async () => {
    mocks.authResult = { userId: 'user-1', role: 'RESIDENT', session: { user: { id: 'user-1' } } };
    mocks.aiResponseText = 'not valid json at all {{{';
    const { POST } = await import('../intake-screen/route');
    const req = createJsonRequest('http://localhost/api/disputes/intake-screen', {
      description: 'My neighbour plays loud music every night after 10pm without fail.',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.toneScore).toBe(0);
    expect(body.data.likelyFrivolous).toBe(false);
    expect(body.data.suggestedCategory).toBe('OTHER');
  });
});
