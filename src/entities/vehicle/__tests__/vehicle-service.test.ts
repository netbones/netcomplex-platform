import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  db: {
    update: vi.fn(),
    select: vi.fn(),
  },
  now: vi.fn(() => new Date('2026-08-16T10:00:00.000Z')),
}));

vi.mock('@api/server', () => ({
  db: mocks.db,
  vehicles: {
    id: 'id',
    joinRequestId: 'joinRequestId',
    tenantId: 'tenantId',
    deletedAt: 'deletedAt',
  },
  profiles: { id: 'id', userId: 'userId', tenantId: 'tenantId', deletedAt: 'deletedAt' },
  standardSeats: { id: 'id', userId: 'userId', tenantId: 'tenantId', archivedAt: 'archivedAt' },
  propertyJoinRequests: {
    id: 'id',
    resultingInvitationId: 'resultingInvitationId',
    tenantId: 'tenantId',
    deletedAt: 'deletedAt',
  },
  notDeleted: vi.fn((t: unknown) => t),
  now: mocks.now,
}));

import {
  softDeleteVehiclesForJoinRequest,
  reparentVehiclesForAcceptedInvitation,
  listStagedVehicles,
} from '@/entities/vehicle/services';

function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  const thenable = {
    then: (resolve: (v: unknown[]) => void) => Promise.resolve(result).then(resolve),
    limit: () => thenable,
    orderBy: () => thenable,
  };
  chain.where = vi.fn(() => thenable);
  chain.limit = vi.fn(() => thenable);
  return chain;
}

function makeUpdateChain() {
  const set = vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) }));
  return { set };
}

describe('vehicle service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('softDeleteVehiclesForJoinRequest', () => {
    it('soft-deletes staged vehicles for a join request', async () => {
      const update = makeUpdateChain();
      mocks.db.update.mockReturnValue(update);

      await softDeleteVehiclesForJoinRequest('jr-1', 'tenant-1');

      expect(mocks.db.update).toHaveBeenCalledTimes(1);
      expect(update.set).toHaveBeenCalledWith({ deletedAt: mocks.now() });
    });
  });

  describe('reparentVehiclesForAcceptedInvitation', () => {
    it('does nothing when no join request references the invitation', async () => {
      mocks.db.select.mockReturnValueOnce(makeSelectChain([]));

      await reparentVehiclesForAcceptedInvitation('inv-1', 'user-1', 'tenant-1');

      expect(mocks.db.select).toHaveBeenCalledTimes(1);
      expect(mocks.db.update).not.toHaveBeenCalled();
    });

    it('re-parents staged vehicles to an existing profile', async () => {
      mocks.db.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'jr-1' }])) // join request lookup
        .mockReturnValueOnce(makeSelectChain([{ id: 'profile-1' }])); // profile lookup

      const update = makeUpdateChain();
      mocks.db.update.mockReturnValue(update);

      await reparentVehiclesForAcceptedInvitation('inv-1', 'user-1', 'tenant-1');

      expect(mocks.db.select).toHaveBeenCalledTimes(2);
      expect(mocks.db.update).toHaveBeenCalledTimes(1);
      expect(update.set).toHaveBeenCalledWith({
        profileId: 'profile-1',
        joinRequestId: null,
      });
    });

    it('re-parents to a standard seat when no profile exists', async () => {
      mocks.db.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'jr-1' }])) // join request lookup
        .mockReturnValueOnce(makeSelectChain([])) // profile lookup (none)
        .mockReturnValueOnce(makeSelectChain([{ id: 'seat-1' }])); // seat lookup

      const update = makeUpdateChain();
      mocks.db.update.mockReturnValue(update);

      await reparentVehiclesForAcceptedInvitation('inv-1', 'user-1', 'tenant-1');

      expect(mocks.db.select).toHaveBeenCalledTimes(3);
      expect(mocks.db.update).toHaveBeenCalledTimes(1);
      expect(update.set).toHaveBeenCalledWith({
        standardSeatId: 'seat-1',
        joinRequestId: null,
      });
    });

    it('does not re-parent when neither profile nor seat exists', async () => {
      mocks.db.select
        .mockReturnValueOnce(makeSelectChain([{ id: 'jr-1' }])) // join request lookup
        .mockReturnValueOnce(makeSelectChain([])) // profile lookup (none)
        .mockReturnValueOnce(makeSelectChain([])); // seat lookup (none)

      await reparentVehiclesForAcceptedInvitation('inv-1', 'user-1', 'tenant-1');

      expect(mocks.db.select).toHaveBeenCalledTimes(3);
      expect(mocks.db.update).not.toHaveBeenCalled();
    });
  });

  describe('listStagedVehicles', () => {
    it('returns active staged vehicles', async () => {
      const vehicles = [
        { id: 'v-1', joinRequestId: 'jr-1', registration: 'ABC123' },
        { id: 'v-2', joinRequestId: 'jr-1', registration: 'XYZ789' },
      ];
      mocks.db.select.mockReturnValueOnce(makeSelectChain(vehicles));

      const result = await listStagedVehicles('jr-1', 'tenant-1');

      expect(result).toEqual(vehicles);
      expect(mocks.db.select).toHaveBeenCalledTimes(1);
    });
  });
});
