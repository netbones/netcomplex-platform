// vitest globals are configured via vitest.config.ts

/**
 * Shared test fixtures for dWallet API route tests.
 */

export const mockWallet = {
  id: 'wal-1',
  tenantId: 'test-tenant-id',
  userId: 'user-1',
  balance: '100.00',
  currency: 'ZAR',
  lifetimeEarned: '150.00',
  lifetimePaid: '0',
  status: 'ACTIVE',
  createdAt: new Date('2026-06-21T12:00:00Z'),
  updatedAt: new Date('2026-06-21T12:00:00Z'),
};

export const mockLowBalanceWallet = {
  ...mockWallet,
  balance: '30.00',
};

export const mockStream = {
  id: 'stream-1',
  tenantId: 'test-tenant-id',
  key: 'survey_participation',
  label: 'Survey Participation',
  description: 'Earn rewards for completing surveys',
  residentSharePct: '20.00',
  isActive: true,
  createdAt: new Date('2026-06-21T12:00:00Z'),
  updatedAt: new Date('2026-06-21T12:00:00Z'),
};

export const mockConsentGranted = {
  id: 'consent-1',
  tenantId: 'test-tenant-id',
  walletId: 'wal-1',
  userId: 'user-1',
  streamKey: 'survey_participation',
  granted: true,
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
  grantedAt: new Date('2026-06-21T12:00:00Z'),
  revokedAt: null,
  createdAt: new Date('2026-06-21T12:00:00Z'),
};

export const mockConsentRevoked = {
  ...mockConsentGranted,
  id: 'consent-2',
  granted: false,
  grantedAt: null,
  revokedAt: new Date('2026-06-21T12:00:01Z'),
  createdAt: new Date('2026-06-21T12:00:01Z'),
};

export const mockTransaction = {
  id: 'txn-1',
  tenantId: 'test-tenant-id',
  walletId: 'wal-1',
  type: 'CREDIT',
  amount: '50.00',
  currency: 'ZAR',
  description: 'Data share reward',
  referenceId: null,
  referenceType: null,
  balanceBefore: '100.00',
  balanceAfter: '150.00',
  sourceType: 'RESIDENT_DATA_SHARE',
  createdAt: new Date('2026-06-21T12:00:00Z'),
};

export const mockPayoutRequest = {
  id: 'payout-1',
  tenantId: 'test-tenant-id',
  walletId: 'wal-1',
  userId: 'user-1',
  amount: '50.00',
  currency: 'ZAR',
  status: 'PENDING',
  method: 'bank_transfer',
  bankReference: null,
  processedAt: null,
  processedBy: null,
  notes: null,
  createdAt: new Date('2026-06-21T12:00:00Z'),
  updatedAt: new Date('2026-06-21T12:00:00Z'),
};

/**
 * Create a mock Request object with standard tenant headers.
 * Used for testing route handlers that parse query params or headers.
 */
export function createMockRequest({
  method = 'GET',
  url = 'http://localhost:3000/api/v1/tenant/dwallet',
  body,
  headers = {},
}: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
