import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted — shared mock state
// ---------------------------------------------------------------------------
const { getMockDb, getMockTables } = vi.hoisted(() => {
  function makeDb() {
    const selectResult: unknown[] = [];
    const insertResult: unknown[] = [];

    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => Promise.resolve(selectResult)),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockImplementation(() => Promise.resolve(insertResult)),
      set: vi.fn().mockReturnThis(),
    };

    const db = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      transaction: vi.fn(),
      _chain: chain,
      _setSelectResult: (r: unknown[]) => {
        selectResult.length = 0;
        selectResult.push(...r);
      },
      _setInsertResult: (r: unknown[]) => {
        insertResult.length = 0;
        insertResult.push(...r);
      },
    };

    return db;
  }

  const sharedDb = makeDb();

  const sharedTables = {
    addresses: { _name: 'Address' },
    handles: { _name: 'Handle' },
    tenants: { _name: 'Tenant' },
  };

  return { getMockDb: () => sharedDb, getMockTables: () => sharedTables };
});

vi.mock('@api/server', () => ({
  db: getMockDb(),
  ...getMockTables(),
}));

vi.mock('../db', () => ({
  db: getMockDb(),
  addresses: getMockTables().addresses,
  handles: getMockTables().handles,
  tenants: getMockTables().tenants,
  DbSchema: {},
}));

import { db } from '@api/server';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let HandleService: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let HandleConflictError: any;
beforeAll(async () => {
  const mod = await import('../handle-service');
  HandleService = mod.HandleService;
  HandleConflictError = mod.HandleConflictError;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockDb(): any {
  return db;
}

function setSelectResult(rows: unknown[]) {
  mockDb()._setSelectResult(rows);
}

function setInsertResult(rows: unknown[]) {
  mockDb()._setInsertResult(rows);
}

function mockHandle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'handle-1',
    tenantId: 'tenant-1',
    handle: 'john',
    addressId: 'addr-1',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('HandleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // register()
  // -----------------------------------------------------------------------
  describe('register()', () => {
    it('creates a Handle with status=ACTIVE linked to Address', async () => {
      setSelectResult([]); // no duplicate
      const h = mockHandle({ id: 'handle-new', handle: 'john' });
      setInsertResult([h]);

      const svc = new HandleService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const result = await svc.register('john', 'addr-1', 'tenant-1');

      expect(result.handle).toBe('john');
      expect(result.status).toBe('ACTIVE');
    });

    it('throws HandleConflictError for reserved name (non-admin)', async () => {
      const svc = new HandleService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await expect(svc.register('admin', 'addr-1', 'tenant-1')).rejects.toThrow(
        HandleConflictError
      );
    });

    it('throws HandleConflictError for duplicate handle', async () => {
      setSelectResult([mockHandle()]);

      const svc = new HandleService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await expect(svc.register('john', 'addr-1', 'tenant-1')).rejects.toThrow(HandleConflictError);
    });
  });

  // -----------------------------------------------------------------------
  // search()
  // -----------------------------------------------------------------------
  describe('search()', () => {
    it('returns handles matching a prefix within a tenant', async () => {
      setSelectResult([mockHandle({ handle: 'john' }), mockHandle({ id: 'h2', handle: 'johnny' })]);

      const svc = new HandleService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const results = await svc.search('jo', 'tenant-1');

      expect(results).toHaveLength(2);
      expect(results[0].handle).toBe('john');
    });

    it('returns empty array when no handles match', async () => {
      setSelectResult([]);

      const svc = new HandleService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const results = await svc.search('zzz', 'tenant-1');

      expect(results).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // release()
  // -----------------------------------------------------------------------
  describe('release()', () => {
    it('sets status to RELEASED', async () => {
      const svc = new HandleService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await svc.release('handle-1');

      expect(mockDb().update).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // resolve()
  // -----------------------------------------------------------------------
  describe('resolve()', () => {
    it('returns address record for a valid handle', async () => {
      setSelectResult([mockHandle()]);

      const svc = new HandleService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const result = await svc.resolve('john', 'tenant-1');

      expect(result).not.toBeNull();
      expect(result.handle).toBe('john');
    });

    it('returns null for unknown handle', async () => {
      setSelectResult([]);

      const svc = new HandleService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const result = await svc.resolve('unknown', 'tenant-1');

      expect(result).toBeNull();
    });
  });
});
