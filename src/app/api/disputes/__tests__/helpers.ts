/**
 * Shared test fixtures and mock helpers for dispute API route tests.
 * Plan 106-01 Task 2.
 */
import { vi } from 'vitest';

// ── Mock request creator ──

export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  return new Request(options.url ?? 'http://localhost:3000/api/disputes', {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': 'test-tenant-id',
      'x-tenant-slug': 'test-tenant',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

// ── Drizzle chain builders ──

export function makeSelectChain(result: unknown[]) {
  const thenable = {
    then: (resolve: (v: unknown[]) => void) => Promise.resolve(result).then(resolve),
    limit: vi.fn(() => thenable),
    orderBy: vi.fn(() => thenable),
    offset: vi.fn(() => thenable),
  };
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => thenable);
  chain.limit = vi.fn(() => thenable);
  chain.orderBy = vi.fn(() => thenable);
  chain.offset = vi.fn(() => thenable);
  return chain;
}

export function makeInsertChain(result: unknown[]) {
  const returning = vi.fn(() => Promise.resolve(result));
  const values = vi.fn(() => ({ returning }));
  return { values };
}

export function makeUpdateChain(result: unknown[]) {
  const returning = vi.fn(() => Promise.resolve(result));
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where }));
  return { set };
}

// ── Mock dispute fixtures ──

export const MOCK_DRAFT_DISPUTE = {
  id: 'dispute-1',
  tenantId: 'test-tenant-id',
  referenceNumber: 'DSP-2026-0001',
  complainantId: 'user-resident',
  respondentId: null,
  respondentType: 'RESIDENT' as const,
  category: 'NOISE' as const,
  title: 'Loud music at night',
  description: 'The neighbor plays loud music after 10pm every night.',
  severity: 'MODERATE' as const,
  status: 'DRAFT' as const,
  isConfidential: true,
  coolingOffEndsAt: new Date(Date.now() + 24 * 3600_000),
  createdAt: new Date(),
  updatedAt: new Date(),
  subcategory: null,
  desiredOutcome: null,
  intakeCompletedAt: null,
  submittedAt: null,
  assignedModeratorId: null,
  mediationOfferedAt: null,
  mediationAcceptedAt: null,
  rulingIssuedAt: null,
  rulingDescription: null,
  csosReferenceNumber: null,
  csosEscalatedAt: null,
  csosClosedAt: null,
  resolvedAt: null,
  closedById: null,
  closedReason: null,
  deletedAt: null,
};

export const MOCK_DISPUTE_LIST = [MOCK_DRAFT_DISPUTE];

export const MOCK_USERS = {
  resident: { userId: 'user-resident', role: 'RESIDENT' as const },
  board: { userId: 'user-board', role: 'BOARD' as const },
  admin: { userId: 'user-admin', role: 'ADMIN' as const },
  committee: { userId: 'user-committee', role: 'COMMITTEE' as const },
};
