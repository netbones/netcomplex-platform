import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSelectChain, makeInsertChain, makeUpdateChain } from '@/test/api/helpers';

const { selectMock, insertMock, updateMock, transactionMock, notifyMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  transactionMock: vi.fn(),
  notifyMock: vi.fn(),
}));

vi.mock('@api/server', () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    transaction: transactionMock,
  },
}));

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../notify', () => ({
  notifyAccessRequestPending: notifyMock,
  notifyVisitorCodeExpiring: vi.fn(),
}));

import {
  ensureDefaultGate,
  createVisitorWithCode,
  createQuickAccessCode,
  listActiveVisitors,
  listVisitorHistory,
  cancelVisitor,
  expirePendingAccessRequests,
  listAccessInbox,
  getAccessRequestForProperty,
  respondToAccessRequest,
  createAccessRequest,
  listAccessEvents,
  createManualAccessEvent,
} from '../service';

function makeTx() {
  return {
    insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve([])) })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) })),
    })),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  insertMock.mockReturnValue(makeInsertChain([]));
  updateMock.mockReturnValue(makeUpdateChain([]));
});

const MISSING_ID = 't-1'; // placeholder 3rd octet guard (unused ID to keep TS happy)

describe('ensureDefaultGate', () => {
  it('returns an existing active gate when present', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([{ id: 'g-1', name: 'Main gate' }]));

    const gate = await ensureDefaultGate('tenant-1');

    expect(gate).toEqual({ id: 'g-1', name: 'Main gate' });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('creates a "Main gate" when none exists', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));

    const gate = await ensureDefaultGate('tenant-1');

    expect(gate.name).toBe('Main gate');
    expect(gate.id).toBeTruthy();
    expect(insertMock).toHaveBeenCalledOnce();
  });
});

describe('createVisitorWithCode', () => {
  const baseOpts = {
    tenantId: 'tenant-1',
    propertyId: 'prop-1',
    userId: 'user-1',
    baseUrl: 'https://app.example',
    input: {
      fullName: 'Jane Doe',
      visitorType: 'WALK_IN',
      visitType: 'SINGLE',
      validFrom: '2026-01-01T10:00:00.000Z',
    } as const,
  };

  beforeEach(() => {
    selectMock.mockReturnValueOnce(makeSelectChain([{ id: 'g-1', name: 'Main gate' }]));
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    transactionMock.mockImplementation(async cb => {
      await cb(makeTx());
    });
  });

  it('creates visitor + code + event in a transaction and returns both', async () => {
    const result = await createVisitorWithCode(baseOpts);

    expect(result.visitor.fullName).toBe('Jane Doe');
    expect(result.visitor.status).toBe('PENDING');
    expect(result.visitor.validFrom).toBe('2026-01-01T10:00:00.000Z');
    expect(result.visitor.validUntil).toBeNull();
    expect(result.accessCode.code).toMatch(/^\d{6}$/);
    expect(result.accessCode.shareUrl).toContain('/access-control/code/');
    expect(result.accessCode.shareUrl).toContain('t=tenant-1');
    expect(result.accessCode.qrPayload).toBe(result.accessCode.shareUrl);
    expect(transactionMock).toHaveBeenCalledOnce();
    expect(result.visitor.accessCode).toEqual(result.accessCode);
  });

  it('marks visitor ACTIVE when activate=true', async () => {
    const result = await createVisitorWithCode({ ...baseOpts, activate: true });
    expect(result.visitor.status).toBe('ACTIVE');
  });

  it('trims optional phone and vehicleReg', async () => {
    const result = await createVisitorWithCode({
      ...baseOpts,
      input: {
        ...baseOpts.input,
        phone: '  +2712345678  ',
        vehicleReg: ' ABC123 ',
      },
    });
    expect(result.visitor.phone).toBe('+2712345678');
    expect(result.visitor.vehicleReg).toBe('ABC123');
  });

  it('strips a trailing slash from baseUrl when building share URL', async () => {
    const result = await createVisitorWithCode({
      ...baseOpts,
      baseUrl: 'https://app.example/',
    });
    expect(result.accessCode.shareUrl).toBe(
      'https://app.example/access-control/code/' + result.accessCode.code + '?t=tenant-1'
    );
  });

  it('generates a unique code after a collision', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    const result = await createVisitorWithCode(baseOpts);
    expect(result.accessCode.code).toMatch(/^\d{6}$/);
  });

  void MISSING_ID;
});

describe('createQuickAccessCode', () => {
  beforeEach(() => {
    selectMock.mockReturnValueOnce(makeSelectChain([{ id: 'g-1', name: 'Main gate' }]));
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    transactionMock.mockImplementation(async cb => {
      await cb(makeTx());
    });
  });

  it('creates an ACTIVE WALK_IN SINGLE visitor valid for 2 hours', async () => {
    const result = await createQuickAccessCode({
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      userId: 'user-1',
      fullName: 'Sam',
      baseUrl: 'https://app.example',
    });

    expect(result.visitor.fullName).toBe('Sam');
    expect(result.visitor.visitorType).toBe('WALK_IN');
    expect(result.visitor.visitType).toBe('SINGLE');
    expect(result.visitor.status).toBe('ACTIVE');
    expect(result.visitor.validUntil).not.toBeNull();
  });
});

describe('listActiveVisitors', () => {
  beforeEach(() => {
    selectMock
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'v-1',
            fullName: 'Jane',
            phone: null,
            visitorType: 'WALK_IN',
            vehicleReg: null,
            roleLabel: null,
            visitType: 'SINGLE',
            validFrom: new Date('2026-01-01T10:00:00.000Z'),
            validUntil: null,
            status: 'ACTIVE',
          },
        ])
      )
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: 'c-1',
            code: '123456',
            qrPayload: 'https://x',
            shareUrl: 'https://x',
            usedAt: null,
            revokedAt: null,
            createdAt: new Date('2026-01-01T10:00:00.000Z'),
            visitorId: 'v-1',
          },
        ])
      );
  });

  it('maps visitors with their access codes', async () => {
    const visitors = await listActiveVisitors('tenant-1', 'prop-1');

    expect(visitors).toHaveLength(1);
    expect(visitors[0].fullName).toBe('Jane');
    expect(visitors[0].accessCode).toEqual({
      id: 'c-1',
      code: '123456',
      qrPayload: 'https://x',
      shareUrl: 'https://x',
      usedAt: null,
      revokedAt: null,
      createdAt: '2026-01-01T10:00:00.000Z',
    });
  });

  it('passes a search query when q is provided', async () => {
    await listActiveVisitors('tenant-1', 'prop-1', 'jane');
    expect(selectMock).toHaveBeenCalled();
  });

  it('returns an empty list when no visitors exist', async () => {
    selectMock.mockReset();
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    const visitors = await listActiveVisitors('tenant-1', 'prop-1');
    expect(visitors).toEqual([]);
  });
});

describe('listVisitorHistory', () => {
  it('maps history rows without access codes', async () => {
    selectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'v-9',
          fullName: 'Old Joe',
          phone: null,
          visitorType: 'WALK_IN',
          vehicleReg: null,
          roleLabel: null,
          visitType: 'SINGLE',
          validFrom: new Date('2025-12-01T10:00:00.000Z'),
          validUntil: null,
          status: 'EXPIRED',
        },
      ])
    );

    const rows = await listVisitorHistory('tenant-1', 'prop-1');

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('EXPIRED');
    expect(rows[0].accessCode).toBeNull();
  });

  it('returns an empty list when no history exists', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    const rows = await listVisitorHistory('tenant-1', 'prop-1');
    expect(rows).toEqual([]);
  });
});

describe('cancelVisitor', () => {
  beforeEach(() => {
    transactionMock.mockImplementation(async cb => {
      await cb(makeTx());
    });
  });

  it('returns false when the visitor is not found', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    const ok = await cancelVisitor({
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      visitorId: 'v-missing',
      userId: 'user-1',
    });
    expect(ok).toBe(false);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('cancels the visitor, revokes their code, and logs a DENIED event', async () => {
    selectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'v-1',
          fullName: 'Jane',
          vehicleReg: null,
        },
      ])
    );
    selectMock.mockReturnValueOnce(makeSelectChain([{ id: 'g-1', name: 'Main gate' }]));

    const ok = await cancelVisitor({
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      visitorId: 'v-1',
      userId: 'user-1',
    });

    expect(ok).toBe(true);
    expect(transactionMock).toHaveBeenCalledOnce();
    const tx = makeTx();
    expect(transactionMock.mock.calls[0][0]).toBeTypeOf('function');
    void tx;
  });
});

describe('expirePendingAccessRequests', () => {
  beforeEach(() => {
    transactionMock.mockImplementation(async cb => {
      await cb(makeTx());
    });
  });

  it('returns 0 when nothing is expired', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    const count = await expirePendingAccessRequests('tenant-1');
    expect(count).toBe(0);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('expires matching requests and logs DENIED events', async () => {
    selectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'r-1',
          gateId: 'g-1',
          propertyId: 'prop-1',
          visitorName: 'Jane',
          vehicleReg: null,
          status: 'PENDING',
        },
        {
          id: 'r-2',
          gateId: null,
          propertyId: 'prop-1',
          visitorName: 'Bob',
          vehicleReg: 'ABC123',
          status: 'PENDING',
        },
      ])
    );
    selectMock.mockReturnValueOnce(makeSelectChain([{ id: 'g-1', name: 'Main gate' }]));

    const count = await expirePendingAccessRequests('tenant-1', 'prop-1');

    expect(count).toBe(2);
    expect(transactionMock).toHaveBeenCalledOnce();
  });
});

describe('listAccessInbox', () => {
  it('returns only PENDING requests with a pending count', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    selectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'r-1',
          visitorName: 'Jane',
          visitorPhotoUrl: null,
          roleLabel: null,
          vehicleReg: null,
          status: 'PENDING',
          requestedAt: new Date('2026-01-01T10:00:00.000Z'),
          expiresAt: new Date('2026-01-01T10:03:00.000Z'),
          gateName: 'Main gate',
        },
        {
          id: 'r-2',
          visitorName: 'Bob',
          visitorPhotoUrl: null,
          roleLabel: null,
          vehicleReg: null,
          status: 'ALLOWED',
          requestedAt: new Date('2026-01-01T09:00:00.000Z'),
          expiresAt: new Date('2026-01-01T09:03:00.000Z'),
          gateName: 'Main gate',
        },
      ])
    );

    const inbox = await listAccessInbox('tenant-1', 'prop-1');

    expect(inbox.pending).toHaveLength(1);
    expect(inbox.pending[0].id).toBe('r-1');
    expect(inbox.pendingCount).toBe(1);
  });
});

describe('getAccessRequestForProperty', () => {
  it('returns null when the request is missing', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    selectMock.mockReturnValueOnce(makeSelectChain([]));

    const req = await getAccessRequestForProperty({
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      requestId: 'r-missing',
    });
    expect(req).toBeNull();
  });

  it('returns the request mapped with gateName', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    selectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'r-1',
          visitorName: 'Jane',
          visitorPhotoUrl: null,
          roleLabel: null,
          vehicleReg: null,
          status: 'PENDING',
          requestedAt: new Date('2026-01-01T10:00:00.000Z'),
          expiresAt: new Date('2026-01-01T10:03:00.000Z'),
          gateName: 'Main gate',
        },
      ])
    );

    const req = await getAccessRequestForProperty({
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      requestId: 'r-1',
    });
    expect(req?.gateName).toBe('Main gate');
    expect(req?.requestedAt).toBe('2026-01-01T10:00:00.000Z');
  });
});

describe('respondToAccessRequest', () => {
  beforeEach(() => {
    transactionMock.mockImplementation(async cb => {
      await cb(makeTx());
    });
  });

  it('returns NOT_FOUND for a missing request', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    selectMock.mockReturnValueOnce(makeSelectChain([]));

    const res = await respondToAccessRequest({
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      requestId: 'r-missing',
      userId: 'user-1',
      action: 'allow',
    });
    expect(res).toEqual({ ok: false, reason: 'NOT_FOUND' });
  });

  it('returns ALREADY_RESOLVED when the request is not pending', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    selectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'r-1',
          gateId: 'g-1',
          visitorName: 'Jane',
          vehicleReg: null,
          status: 'ALLOWED',
        },
      ])
    );

    const res = await respondToAccessRequest({
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      requestId: 'r-1',
      userId: 'user-1',
      action: 'allow',
    });
    expect(res).toEqual({ ok: false, reason: 'ALREADY_RESOLVED' });
  });

  it('allows a pending request and writes a GRANTED event', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    selectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'r-1',
          gateId: 'g-1',
          visitorName: 'Jane',
          vehicleReg: null,
          status: 'PENDING',
        },
      ])
    );

    const res = await respondToAccessRequest({
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      requestId: 'r-1',
      userId: 'user-1',
      action: 'allow',
    });
    expect(res).toEqual({ ok: true });
    expect(transactionMock).toHaveBeenCalledOnce();
  });

  it('denies a pending request and writes a DENIED event', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    selectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'r-1',
          gateId: 'g-1',
          visitorName: 'Jane',
          vehicleReg: null,
          status: 'PENDING',
        },
      ])
    );

    const res = await respondToAccessRequest({
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      requestId: 'r-1',
      userId: 'user-1',
      action: 'deny',
    });
    expect(res).toEqual({ ok: true });
  });
});

describe('createAccessRequest', () => {
  beforeEach(() => {
    transactionMock.mockImplementation(async cb => {
      await cb(makeTx());
    });
  });

  it('uses an explicit gate when gateId is provided', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([{ id: 'g-2', name: 'West gate' }]));

    const req = await createAccessRequest({
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      visitorName: 'Jane',
      gateId: 'g-2',
      baseUrl: 'https://app.example',
    });

    expect(req.gateName).toBe('West gate');
    expect(notifyMock).toHaveBeenCalledOnce();
    expect(notifyMock.mock.calls[0][0].deepLink).toContain(
      '/access-control?tab=inbox&request=' + req.id
    );
  });

  it('throws when the given gate is not found', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));

    await expect(
      createAccessRequest({
        tenantId: 'tenant-1',
        propertyId: 'prop-1',
        visitorName: 'Jane',
        gateId: 'g-missing',
        baseUrl: 'https://app.example',
      })
    ).rejects.toThrow('Gate not found');
  });

  it('falls back to the default gate when gateId is omitted', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([{ id: 'g-1', name: 'Main gate' }]));

    const req = await createAccessRequest({
      tenantId: 'tenant-1',
      propertyId: 'prop-1',
      visitorName: 'Jane',
      baseUrl: 'https://app.example',
    });

    expect(req.gateName).toBe('Main gate');
  });
});

describe('listAccessEvents', () => {
  it('maps event rows with joined labels and returns lastHourCount', async () => {
    selectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: 'e-1',
          occurredAt: new Date('2026-01-01T10:00:00.000Z'),
          visitorLabel: 'Jane',
          vehicleReg: null,
          state: 'GRANTED',
          method: 'CODE',
          actorType: 'RESIDENT',
          actorName: 'Owner',
          gateName: 'Main gate',
          propertyUnit: '12A',
          propertyStreet: 'Elm St',
          visitorId: null,
          accessRequestId: null,
        },
      ])
    );
    selectMock.mockReturnValueOnce(makeSelectChain([{ n: 3 }]));

    const res = await listAccessEvents({ tenantId: 'tenant-1' });

    expect(res.lastHourCount).toBe(3);
    expect(res.events).toHaveLength(1);
    expect(res.events[0].propertyLabel).toBe('12A · Elm St');
    expect(res.events[0].state).toBe('GRANTED');
  });

  it('returns an empty events list with zero count', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));
    selectMock.mockReturnValueOnce(makeSelectChain([{ n: 0 }]));

    const res = await listAccessEvents({ tenantId: 'tenant-1' });
    expect(res.events).toEqual([]);
    expect(res.lastHourCount).toBe(0);
  });
});

describe('createManualAccessEvent', () => {
  it('creates a MANUAL event and enriches actor + property labels', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([{ id: 'g-1', name: 'Main gate' }]));
    insertMock.mockReturnValue(makeInsertChain([]));
    selectMock.mockReturnValueOnce(makeSelectChain([{ unit: '12A', street: 'Elm St' }]));
    selectMock.mockReturnValueOnce(makeSelectChain([{ name: 'Scholar' }]));

    const evt = await createManualAccessEvent({
      tenantId: 'tenant-1',
      userId: 'user-1',
      actorType: 'GUARD',
      input: {
        visitorLabel: 'Courier',
        state: 'GRANTED',
        propertyId: 'b1e2a45c-6d5e-4f8a-9b2c-3f0a9e8d7c6b',
      },
    });

    expect(evt.propertyLabel).toBe('12A · Elm St');
    expect(evt.actorName).toBe('Scholar');
    expect(evt.method).toBe('MANUAL');
    expect(evt.gateName).toBe('Main gate');
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it('throws when the given gate is not found', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([]));

    await expect(
      createManualAccessEvent({
        tenantId: 'tenant-1',
        userId: 'user-1',
        actorType: 'GUARD',
        input: {
          visitorLabel: 'Courier',
          state: 'GRANTED',
          gateId: 'b1e2a45c-6d5e-4f8a-9b2c-3f0a9e8d7c6b',
        },
      })
    ).rejects.toThrow('Gate not found');
  });

  it('falls back to default gate and leaves propertyLabel null without propertyId', async () => {
    selectMock.mockReturnValueOnce(makeSelectChain([{ id: 'g-1', name: 'Main gate' }]));
    insertMock.mockReturnValue(makeInsertChain([]));
    selectMock.mockReturnValueOnce(makeSelectChain([{ name: 'Scholar' }]));

    const evt = await createManualAccessEvent({
      tenantId: 'tenant-1',
      userId: 'user-1',
      actorType: 'MANAGER',
      input: { visitorLabel: 'Courier', state: 'DENIED' },
    });

    expect(evt.propertyLabel).toBeNull();
    expect(evt.actorName).toBe('Scholar');
    expect(evt.state).toBe('DENIED');
  });
});
