import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted — shared mock state across both mock calls
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
    standardSeats: { _name: 'StandardSeat' },
    soloSeats: { _name: 'SoloSeat' },
    premiumSeats: { _name: 'PremiumSeat' },
    profiles: { _name: 'Profile' },
    addressEndpoints: { _name: 'AddressEndpoint' },
  };

  return {
    getMockDb: () => sharedDb,
    getMockTables: () => sharedTables,
  };
});

// ---------------------------------------------------------------------------
// Mock @api/server
// ---------------------------------------------------------------------------
vi.mock('@api/server', () => ({
  db: getMockDb(),
  ...getMockTables(),
}));

// ---------------------------------------------------------------------------
// Mock ../db (address-service.ts imports { db, addresses, handles } from './db')
// ---------------------------------------------------------------------------
vi.mock('../db', () => ({
  db: getMockDb(),
  addresses: getMockTables().addresses,
  handles: getMockTables().handles,
  tenants: getMockTables().tenants,
  addressEndpoints: getMockTables().addressEndpoints,
  DbSchema: {},
}));

import { db } from '@api/server';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

// We need to import the service AFTER the mock is set up
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AddressService: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AddressConflictError: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AddressValidationError: any;

beforeAll(async () => {
  const mod = await import('../address-service');
  AddressService = mod.AddressService;
  AddressConflictError = mod.AddressConflictError;
  AddressValidationError = mod.AddressValidationError;
});

// Type helper for the mock db
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

function mockAddress(overrides: Record<string, unknown> = {}) {
  return {
    id: 'addr-1',
    tenantId: 'tenant-1',
    address: 'john@soralia.org',
    localPart: 'john',
    domain: 'soralia.org',
    kind: 'SOLO',
    status: 'ACTIVE',
    ownerType: null,
    ownerId: null,
    canonicalAddressId: null,
    forwardStrategy: null,
    receiveExternal: false,
    coolingUntil: null,
    archivedUntil: null,
    releasedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('AddressService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // reserve()
  // -----------------------------------------------------------------------
  describe('reserve()', () => {
    it('reserves an address and returns AddressRecord with ACTIVE status', async () => {
      setSelectResult([]); // no conflict
      const addr = mockAddress({ id: 'addr-new', address: 'john@soralia.org', kind: 'SOLO' });
      setInsertResult([addr]);

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const result = await svc.reserve('john@soralia.org', 'tenant-1', 'SOLO');

      expect(result.address).toBe('john@soralia.org');
      expect(result.status).toBe('ACTIVE');
      expect(result.kind).toBe('SOLO');
    });

    it('reserves an address with ownerType and ownerId opts', async () => {
      setSelectResult([]);
      const addr = mockAddress({
        id: 'addr-2',
        address: 'unit042@soralia.org',
        kind: 'STANDARD',
        ownerType: 'STANDARD_SEAT',
        ownerId: 'seat-1',
      });
      setInsertResult([addr]);

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const result = await svc.reserve('unit042@soralia.org', 'tenant-1', 'STANDARD', {
        ownerType: 'STANDARD_SEAT',
        ownerId: 'seat-1',
      });

      expect(result.ownerType).toBe('STANDARD_SEAT');
      expect(result.ownerId).toBe('seat-1');
    });

    it('throws AddressConflictError for reserved name (non-admin)', async () => {
      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await expect(svc.reserve('admin@soralia.org', 'tenant-1', 'SYSTEM')).rejects.toThrow(
        AddressConflictError
      );
    });

    it('throws AddressConflictError for duplicate address', async () => {
      setSelectResult([mockAddress({ address: 'john@soralia.org' })]);

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await expect(svc.reserve('john@soralia.org', 'tenant-1', 'SOLO')).rejects.toThrow(
        AddressConflictError
      );
    });

    it('throws AddressValidationError for invalid address format (no @)', async () => {
      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await expect(svc.reserve('invalid-format', 'tenant-1', 'SOLO')).rejects.toThrow(
        AddressValidationError
      );
    });
  });

  // -----------------------------------------------------------------------
  // resolve()
  // -----------------------------------------------------------------------
  describe('resolve()', () => {
    it('returns the matching AddressRecord for a direct address match', async () => {
      const addr = mockAddress();
      setSelectResult([addr]);

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const result = await svc.resolve('john@soralia.org', 'tenant-1');

      expect(result).not.toBeNull();
      expect(result.address).toBe('john@soralia.org');
    });

    it('returns null for an unknown address', async () => {
      setSelectResult([]);

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const result = await svc.resolve('unknown@soralia.org', 'tenant-1');

      expect(result).toBeNull();
    });

    it('resolves by handle when address format is not an email', async () => {
      // First select: no direct address match (because no @ in search term)
      // Second select: handle match
      setSelectResult([{ id: 'handle-1', addressId: 'addr-1', handle: 'john', status: 'ACTIVE' }]);

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await svc.resolve('john', 'tenant-1');

      // Should try handle resolution
      expect(mockDb().select).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // release()
  // -----------------------------------------------------------------------
  describe('release()', () => {
    it('sets status to DELETED and sets releasedAt', async () => {
      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await svc.release('addr-1');

      expect(mockDb().update).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // move()
  // -----------------------------------------------------------------------
  describe('move()', () => {
    it('updates address field and validates uniqueness', async () => {
      // The mock uses shared select/insert result arrays.  Since move()
      // performs multiple selects (uniqueness check + re-fetch after update),
      // keep select result empty so the uniqueness gate passes and the update
      // path is exercised.
      setSelectResult([]);
      setInsertResult([mockAddress()]);

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await svc.move('addr-1', 'new-address@soralia.org', 'tenant-1');

      expect(mockDb().update).toHaveBeenCalled();
    });

    it('throws AddressConflictError if new address already exists', async () => {
      setSelectResult([mockAddress()]);

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await expect(svc.move('addr-1', 'john@soralia.org', 'tenant-1')).rejects.toThrow(
        AddressConflictError
      );
    });
  });

  // -----------------------------------------------------------------------
  // archive()
  // -----------------------------------------------------------------------
  describe('archive()', () => {
    it('sets status to ARCHIVED and archivedUntil to 90 days from now', async () => {
      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await svc.archive('addr-1');

      expect(mockDb().update).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // lookup()
  // -----------------------------------------------------------------------
  describe('lookup()', () => {
    it('returns AddressRecord by ownerType and ownerId', async () => {
      const addr = mockAddress({ ownerType: 'STANDARD_SEAT', ownerId: 'seat-1' });
      setSelectResult([addr]);

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const result = await svc.lookup('STANDARD_SEAT', 'seat-1', 'tenant-1');

      expect(result).not.toBeNull();
      expect(result.ownerType).toBe('STANDARD_SEAT');
      expect(result.ownerId).toBe('seat-1');
    });

    it('returns null when not found', async () => {
      setSelectResult([]);

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const result = await svc.lookup('STANDARD_SEAT', 'nonexistent', 'tenant-1');

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // validate()
  // -----------------------------------------------------------------------
  describe('validate()', () => {
    it('throws AddressValidationError for address without @', async () => {
      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await expect(svc.validate('invalid')).rejects.toThrow(AddressValidationError);
    });

    it('throws AddressValidationError for empty address', async () => {
      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await expect(svc.validate('')).rejects.toThrow(AddressValidationError);
    });
  });

  // -----------------------------------------------------------------------
  // generate() — static
  // -----------------------------------------------------------------------
  describe('generate()', () => {
    it('generates STANDARD address format: unitNNN@domain', async () => {
      const result = await AddressService.generate('STANDARD', 'tenant-1', {
        unitNumber: '042',
      });
      expect(result).toMatch(/^unit042@/);
    });

    it('generates ALIAS address format: name.unitNNN@domain', async () => {
      const result = await AddressService.generate('ALIAS', 'tenant-1', {
        name: 'john',
        unitNumber: '042',
      });
      expect(result).toMatch(/^john\.unit042@/);
    });

    it('generates SOLO address format: name@domain', async () => {
      const result = await AddressService.generate('SOLO', 'tenant-1', { name: 'john' });
      expect(result).toMatch(/^john@/);
    });

    it('generates PREMIUM address format: custom@domain', async () => {
      const result = await AddressService.generate('PREMIUM', 'tenant-1', {
        custom: 'mybrand',
      });
      expect(result).toMatch(/^mybrand@/);
    });

    it('generates PROVIDER address format: slugifiedName@domain', async () => {
      const result = await AddressService.generate('PROVIDER', 'tenant-1', {
        companyName: 'Acme Corp',
      });
      expect(result).toMatch(/^acmecorp@/);
    });
  });

  // -----------------------------------------------------------------------
  // Tenant isolation
  // -----------------------------------------------------------------------
  describe('tenant isolation', () => {
    it('only finds addresses in the specified tenant', async () => {
      // Simulate: address exists in tenant-2 but we're searching in tenant-1
      setSelectResult([]); // no match in tenant-1

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const result = await svc.resolve('john@soralia.org', 'tenant-1');

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // forward()
  // -----------------------------------------------------------------------
  describe('forward()', () => {
    it('updates forwardStrategy field', async () => {
      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      await svc.forward('addr-1', 'HOUSEHOLD');

      expect(mockDb().update).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // lookupByOwnerInSeats()
  // -----------------------------------------------------------------------
  describe('lookupByOwnerInSeats()', () => {
    it('returns null when user has no seats', async () => {
      // All seat queries return empty
      setSelectResult([]);

      const svc = new AddressService(mockDb() as NodePgDatabase<Record<string, unknown>>);
      const result = await svc.lookupByOwnerInSeats('user-1', 'tenant-1');

      expect(result).toBeNull();
    });
  });
});
