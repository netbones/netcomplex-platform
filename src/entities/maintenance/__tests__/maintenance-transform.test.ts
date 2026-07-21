/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { toMaintenanceRequestViewList } from '@entities/maintenance/server';

const row = () =>
  ({
    MaintenanceRequest: {
      id: 'mr-1',
      tenantId: 't1',
      userId: 'u1',
      propertyId: 'p1',
      category: 'PLUMBING',
      priority: 'HIGH' as const,
      status: 'SUBMITTED' as const,
      description: 'Leaking pipe',
      ticketNumber: 'SRV-2026-0001',
      images: [],
      assignedTo: null,
      vendor: null,
      scheduledDate: null,
      estimatedCost: null,
      actualCost: null,
      resolution: null,
      completedAt: null,
      preferredDate: null,
      preferredTime: null,
      assignedTeamId: null,
      assignedProviderId: null,
      routingType: 'HOA',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    } as any,
    user: { id: 'u1', name: 'Alice', email: 'alice@test.com' } as any,
    property: { id: 'p1', street: '123 Main St', unit: '4B' } as any,
    team: { id: 't1', name: 'FixIt Co', trade: 'PLUMBING' } as any,
    provider: null as any,
  }) as any;

describe('toMaintenanceRequestViewList', () => {
  it('returns full DTO with user/team for admin scope', () => {
    const result = toMaintenanceRequestViewList([row()], 'all') as any[];
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('mr-1');
    expect(result[0].user.name).toBe('Alice');
    expect(result[0].assignedTeam.name).toBe('FixIt Co');
  });

  it('strips PII for community scope', () => {
    const result = toMaintenanceRequestViewList([row()], 'community');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('mr-1');
    expect(result[0].ticketNumber).toBe('SRV-2026-0001');
  });

  it('filters by search in description', () => {
    expect(toMaintenanceRequestViewList([row()], 'all', 'leaking')).toHaveLength(1);
  });

  it('filters by search in user name', () => {
    expect(toMaintenanceRequestViewList([row()], 'all', 'alice')).toHaveLength(1);
  });

  it('returns empty when search mismatch', () => {
    expect(toMaintenanceRequestViewList([row()], 'all', 'xyz123')).toHaveLength(0);
  });

  it('no filter when scope is community', () => {
    expect(toMaintenanceRequestViewList([row()], 'community', 'leaking')).toHaveLength(1);
  });
});
