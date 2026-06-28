/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module before importing the resolver
vi.mock('@api/server', () => ({
  db: {
    property: {
      findFirst: vi.fn(),
    },
  },
}));

import { resolveRoutingType } from '../model/constants';
import type { MaintenanceRoutingContext } from '../model/types';

describe('resolveRoutingType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns LANDLORD with landlordId for RENTAL household with known owner', async () => {
    const { db } = await import('@api/server');
    (db.property.findFirst as any).mockResolvedValue({
      ownerId: 'owner-1',
      households: [{ occupancyType: 'RENTAL' }],
    });

    const result: MaintenanceRoutingContext = await resolveRoutingType('prop-1', 'tenant-1');

    expect(result.routingType).toBe('LANDLORD');
    expect(result.landlordId).toBe('owner-1');
    expect(result.reason).toContain('rental');
  });

  it('returns HOA for OWNER_OCCUPIED household', async () => {
    const { db } = await import('@api/server');
    (db.property.findFirst as any).mockResolvedValue({
      ownerId: 'owner-1',
      households: [{ occupancyType: 'OWNER_OCCUPIED' }],
    });

    const result = await resolveRoutingType('prop-1', 'tenant-1');

    expect(result.routingType).toBe('HOA');
    expect(result.landlordId).toBeNull();
    expect(result.reason).toContain('OWNER_OCCUPIED');
  });

  it('returns HOA for VACANT household', async () => {
    const { db } = await import('@api/server');
    (db.property.findFirst as any).mockResolvedValue({
      ownerId: 'owner-1',
      households: [{ occupancyType: 'VACANT' }],
    });

    const result = await resolveRoutingType('prop-1', 'tenant-1');

    expect(result.routingType).toBe('HOA');
    expect(result.landlordId).toBeNull();
    expect(result.reason).toContain('VACANT');
  });

  it('returns HOA when no active household found (safe default)', async () => {
    const { db } = await import('@api/server');
    (db.property.findFirst as any).mockResolvedValue({
      ownerId: 'owner-1',
      households: [],
    });

    const result = await resolveRoutingType('prop-1', 'tenant-1');

    expect(result.routingType).toBe('HOA');
    expect(result.landlordId).toBeNull();
    expect(result.reason).toContain('no active household');
  });

  it('returns HOA when property not found', async () => {
    const { db } = await import('@api/server');
    (db.property.findFirst as any).mockResolvedValue(null);

    const result = await resolveRoutingType('nonexistent', 'tenant-1');

    expect(result.routingType).toBe('HOA');
    expect(result.landlordId).toBeNull();
    expect(result.reason).toContain('property not found');
  });

  it('returns HOA for RENTAL when property has no ownerId', async () => {
    const { db } = await import('@api/server');
    (db.property.findFirst as any).mockResolvedValue({
      ownerId: null,
      households: [{ occupancyType: 'RENTAL' }],
    });

    const result = await resolveRoutingType('prop-1', 'tenant-1');

    expect(result.routingType).toBe('HOA');
    expect(result.landlordId).toBeNull();
  });
});
