/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  callCount: 0,
  propertyRow: null as any,
  householdRow: null as any,
}));

vi.mock('@api/server', () => {
  function makeChain() {
    const self: any = {
      select: vi.fn(() => self),
      from: vi.fn(() => self),
      where: vi.fn(() => self),
      orderBy: vi.fn(() => self),
      limit: vi.fn((_n: number) => {
        mocks.callCount++;
        if (mocks.callCount === 1)
          return Promise.resolve(mocks.propertyRow ? [mocks.propertyRow] : []);
        return Promise.resolve(mocks.householdRow ? [mocks.householdRow] : []);
      }),
    };
    return self;
  }

  return {
    db: makeChain(),
    properties: { id: 'id', tenantId: 'tenantId', ownerId: 'ownerId' },
    households: {
      propertyId: 'propertyId',
      status: 'status',
      deletedAt: 'deletedAt',
      occupancyType: 'occupancyType',
      createdAt: new Date(),
    },
    notDeleted: vi.fn(() => ({})),
  };
});

import { resolveRoutingType } from '../model/routing';
import type { MaintenanceRoutingContext } from '../model/types';

describe('resolveRoutingType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callCount = 0;
    mocks.propertyRow = null;
    mocks.householdRow = null;
  });

  it('returns LANDLORD with landlordId for RENTAL household with known owner', async () => {
    mocks.propertyRow = { ownerId: 'owner-1' };
    mocks.householdRow = { occupancyType: 'RENTAL' };

    const result: MaintenanceRoutingContext = await resolveRoutingType('prop-1', 'tenant-1');

    expect(result.routingType).toBe('LANDLORD');
    expect(result.landlordId).toBe('owner-1');
    expect(result.reason).toContain('rental');
  });

  it('returns HOA for OWNER_OCCUPIED household', async () => {
    mocks.propertyRow = { ownerId: 'owner-1' };
    mocks.householdRow = { occupancyType: 'OWNER_OCCUPIED' };

    const result = await resolveRoutingType('prop-1', 'tenant-1');

    expect(result.routingType).toBe('HOA');
    expect(result.landlordId).toBeNull();
    expect(result.reason).toContain('OWNER_OCCUPIED');
  });

  it('returns HOA for VACANT household', async () => {
    mocks.propertyRow = { ownerId: 'owner-1' };
    mocks.householdRow = { occupancyType: 'VACANT' };

    const result = await resolveRoutingType('prop-1', 'tenant-1');

    expect(result.routingType).toBe('HOA');
    expect(result.landlordId).toBeNull();
    expect(result.reason).toContain('VACANT');
  });

  it('returns HOA when no active household found (safe default)', async () => {
    mocks.propertyRow = { ownerId: 'owner-1' };
    mocks.householdRow = null;

    const result = await resolveRoutingType('prop-1', 'tenant-1');

    expect(result.routingType).toBe('HOA');
    expect(result.landlordId).toBeNull();
    expect(result.reason).toContain('no active household');
  });

  it('returns HOA when property not found', async () => {
    mocks.propertyRow = null;
    mocks.householdRow = null;

    const result = await resolveRoutingType('nonexistent', 'tenant-1');

    expect(result.routingType).toBe('HOA');
    expect(result.landlordId).toBeNull();
    expect(result.reason).toContain('property not found');
  });

  it('returns HOA for RENTAL when property has no ownerId', async () => {
    mocks.propertyRow = { ownerId: null };
    mocks.householdRow = { occupancyType: 'RENTAL' };

    const result = await resolveRoutingType('prop-1', 'tenant-1');

    expect(result.routingType).toBe('HOA');
    expect(result.landlordId).toBeNull();
  });
});
