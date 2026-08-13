import { db } from '@api/server';
import { visitors } from '@/db/schema/visitors';
import { accessCodes } from '@/db/schema/access-codes';
import { accessRequests } from '@/db/schema/access-requests';
import { accessEvents } from '@/db/schema/access-events';
import { gates } from '@/db/schema/gates';
import { properties } from '@/db/schema/properties';
import { users } from '@/db/schema/users';
import { createId } from '@shared/lib/id';
import { and, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import type { CreateVisitorInput, ManualAccessEventInput } from '../model/schemas';
import { QUICK_ACCESS_VALIDITY_MS, ACCESS_REQUEST_DEFAULT_TTL_MS } from '../model/constants';
import type {
  AccessCodePublic,
  AccessEventListItem,
  AccessRequestListItem,
  VisitorListItem,
} from '../model/types';
import { notifyAccessRequestPending } from './notify';

function randomSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function allocateUniqueCode(tenantId: string): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = randomSixDigitCode();
    const [existing] = await db
      .select({ id: accessCodes.id })
      .from(accessCodes)
      .where(
        and(
          eq(accessCodes.tenantId, tenantId),
          eq(accessCodes.code, code),
          isNull(accessCodes.revokedAt)
        )
      )
      .limit(1);
    if (!existing) return code;
  }
  throw new Error('Could not allocate unique access code');
}

export async function ensureDefaultGate(tenantId: string): Promise<{ id: string; name: string }> {
  const [existing] = await db
    .select({ id: gates.id, name: gates.name })
    .from(gates)
    .where(and(eq(gates.tenantId, tenantId), eq(gates.active, true)))
    .orderBy(gates.createdAt)
    .limit(1);

  if (existing) return existing;

  const id = createId();
  const name = 'Main gate';
  const now = new Date();
  await db.insert(gates).values({
    id,
    tenantId,
    name,
    integrationType: 'MANUAL',
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  return { id, name };
}

function toAccessCodePublic(row: typeof accessCodes.$inferSelect): AccessCodePublic {
  return {
    id: row.id,
    code: row.code,
    qrPayload: row.qrPayload,
    shareUrl: row.shareUrl,
    usedAt: row.usedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function buildCodeUrls(tenantId: string, code: string, baseUrl: string) {
  const shareUrl = `${baseUrl.replace(/\/$/, '')}/access-control/code/${code}?t=${tenantId}`;
  const qrPayload = shareUrl;
  return { shareUrl, qrPayload };
}

export async function createVisitorWithCode(opts: {
  tenantId: string;
  propertyId: string;
  userId: string;
  input: CreateVisitorInput;
  baseUrl: string;
  activate?: boolean;
}): Promise<{ visitor: VisitorListItem; accessCode: AccessCodePublic }> {
  const gate = await ensureDefaultGate(opts.tenantId);
  const visitorId = createId();
  const codeId = createId();
  const eventId = createId();
  const now = new Date();
  const code = await allocateUniqueCode(opts.tenantId);
  const { shareUrl, qrPayload } = buildCodeUrls(opts.tenantId, code, opts.baseUrl);
  const status = opts.activate ? 'ACTIVE' : 'PENDING';
  const validFrom = new Date(opts.input.validFrom);
  const validUntil = opts.input.validUntil ? new Date(opts.input.validUntil) : null;

  await db.transaction(async tx => {
    await tx.insert(visitors).values({
      id: visitorId,
      tenantId: opts.tenantId,
      propertyId: opts.propertyId,
      requestedByUserId: opts.userId,
      fullName: opts.input.fullName,
      phone: opts.input.phone?.trim() || null,
      photoUrl: null,
      visitorType: opts.input.visitorType,
      vehicleReg: opts.input.vehicleReg?.trim() || null,
      roleLabel: opts.input.roleLabel?.trim() || null,
      visitType: opts.input.visitType,
      validFrom,
      validUntil,
      recurrenceRule: opts.input.recurrenceRule?.trim() || null,
      status,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(accessCodes).values({
      id: codeId,
      tenantId: opts.tenantId,
      visitorId,
      code,
      qrPayload,
      shareUrl,
      usedAt: null,
      revokedAt: null,
      createdAt: now,
    });

    await tx.insert(accessEvents).values({
      id: eventId,
      tenantId: opts.tenantId,
      gateId: gate.id,
      propertyId: opts.propertyId,
      visitorId,
      accessRequestId: null,
      visitorLabel: opts.input.fullName,
      vehicleReg: opts.input.vehicleReg?.trim() || null,
      state: 'PENDING',
      method: 'CODE',
      actorType: 'RESIDENT',
      actorUserId: opts.userId,
      occurredAt: now,
    });
  });

  const accessCode = {
    id: codeId,
    code,
    qrPayload,
    shareUrl,
    usedAt: null,
    revokedAt: null,
    createdAt: now.toISOString(),
  };

  return {
    visitor: {
      id: visitorId,
      fullName: opts.input.fullName,
      phone: opts.input.phone?.trim() || null,
      visitorType: opts.input.visitorType,
      vehicleReg: opts.input.vehicleReg?.trim() || null,
      roleLabel: opts.input.roleLabel?.trim() || null,
      visitType: opts.input.visitType,
      validFrom: validFrom.toISOString(),
      validUntil: validUntil?.toISOString() ?? null,
      status,
      accessCode,
    },
    accessCode,
  };
}

export async function createQuickAccessCode(opts: {
  tenantId: string;
  propertyId: string;
  userId: string;
  fullName: string;
  phone?: string | null;
  baseUrl: string;
}) {
  const now = new Date();
  return createVisitorWithCode({
    tenantId: opts.tenantId,
    propertyId: opts.propertyId,
    userId: opts.userId,
    baseUrl: opts.baseUrl,
    activate: true,
    input: {
      fullName: opts.fullName,
      phone: opts.phone ?? null,
      visitorType: 'WALK_IN',
      vehicleReg: null,
      roleLabel: null,
      visitType: 'SINGLE',
      validFrom: now.toISOString(),
      validUntil: new Date(now.getTime() + QUICK_ACCESS_VALIDITY_MS).toISOString(),
      recurrenceRule: null,
    },
  });
}

export async function listActiveVisitors(
  tenantId: string,
  propertyId: string,
  q?: string
): Promise<VisitorListItem[]> {
  const conditions = [
    eq(visitors.tenantId, tenantId),
    eq(visitors.propertyId, propertyId),
    inArray(visitors.status, ['PENDING', 'ACTIVE']),
  ];

  if (q?.trim()) {
    const like = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(visitors.fullName, like),
        ilike(visitors.phone, like),
        ilike(visitors.vehicleReg, like)
      )!
    );
  }

  const rows = await db
    .select()
    .from(visitors)
    .where(and(...conditions))
    .orderBy(desc(visitors.validFrom));

  const visitorIds = rows.map(r => r.id);
  const codes =
    visitorIds.length === 0
      ? []
      : await db
          .select()
          .from(accessCodes)
          .where(
            and(
              eq(accessCodes.tenantId, tenantId),
              inArray(accessCodes.visitorId, visitorIds),
              isNull(accessCodes.revokedAt)
            )
          );

  const codeByVisitor = new Map(codes.map(c => [c.visitorId, c]));

  return rows.map(row => ({
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    visitorType: row.visitorType,
    vehicleReg: row.vehicleReg,
    roleLabel: row.roleLabel,
    visitType: row.visitType,
    validFrom: row.validFrom.toISOString(),
    validUntil: row.validUntil?.toISOString() ?? null,
    status: row.status,
    accessCode: codeByVisitor.has(row.id) ? toAccessCodePublic(codeByVisitor.get(row.id)!) : null,
  }));
}

export async function listVisitorHistory(
  tenantId: string,
  propertyId: string
): Promise<VisitorListItem[]> {
  const rows = await db
    .select()
    .from(visitors)
    .where(
      and(
        eq(visitors.tenantId, tenantId),
        eq(visitors.propertyId, propertyId),
        inArray(visitors.status, ['EXPIRED', 'CANCELLED', 'DENIED'])
      )
    )
    .orderBy(desc(visitors.updatedAt))
    .limit(100);

  return rows.map(row => ({
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    visitorType: row.visitorType,
    vehicleReg: row.vehicleReg,
    roleLabel: row.roleLabel,
    visitType: row.visitType,
    validFrom: row.validFrom.toISOString(),
    validUntil: row.validUntil?.toISOString() ?? null,
    status: row.status,
    accessCode: null,
  }));
}

export async function cancelVisitor(opts: {
  tenantId: string;
  propertyId: string;
  visitorId: string;
  userId: string;
}): Promise<boolean> {
  const [visitor] = await db
    .select()
    .from(visitors)
    .where(
      and(
        eq(visitors.id, opts.visitorId),
        eq(visitors.tenantId, opts.tenantId),
        eq(visitors.propertyId, opts.propertyId)
      )
    )
    .limit(1);

  if (!visitor) return false;

  const gate = await ensureDefaultGate(opts.tenantId);
  const now = new Date();

  await db.transaction(async tx => {
    await tx
      .update(visitors)
      .set({ status: 'CANCELLED', updatedAt: now })
      .where(eq(visitors.id, opts.visitorId));

    await tx
      .update(accessCodes)
      .set({ revokedAt: now })
      .where(
        and(
          eq(accessCodes.visitorId, opts.visitorId),
          eq(accessCodes.tenantId, opts.tenantId),
          isNull(accessCodes.revokedAt)
        )
      );

    await tx.insert(accessEvents).values({
      id: createId(),
      tenantId: opts.tenantId,
      gateId: gate.id,
      propertyId: opts.propertyId,
      visitorId: opts.visitorId,
      accessRequestId: null,
      visitorLabel: visitor.fullName,
      vehicleReg: visitor.vehicleReg,
      state: 'DENIED',
      method: 'CODE',
      actorType: 'RESIDENT',
      actorUserId: opts.userId,
      occurredAt: now,
    });
  });

  return true;
}

export async function expirePendingAccessRequests(tenantId: string, propertyId?: string) {
  const now = new Date();
  const conditions = [
    eq(accessRequests.tenantId, tenantId),
    eq(accessRequests.status, 'PENDING'),
    lte(accessRequests.expiresAt, now),
  ];
  if (propertyId) conditions.push(eq(accessRequests.propertyId, propertyId));

  const expired = await db
    .select()
    .from(accessRequests)
    .where(and(...conditions));

  if (expired.length === 0) return 0;

  const gate = await ensureDefaultGate(tenantId);

  await db.transaction(async tx => {
    for (const req of expired) {
      await tx
        .update(accessRequests)
        .set({ status: 'EXPIRED', respondedAt: now })
        .where(eq(accessRequests.id, req.id));

      await tx.insert(accessEvents).values({
        id: createId(),
        tenantId,
        gateId: req.gateId || gate.id,
        propertyId: req.propertyId,
        visitorId: null,
        accessRequestId: req.id,
        visitorLabel: req.visitorName,
        vehicleReg: req.vehicleReg,
        state: 'DENIED',
        method: 'INTERCOM',
        actorType: 'AUTO_DENY',
        actorUserId: null,
        occurredAt: now,
      });
    }
  });

  return expired.length;
}

export async function listAccessInbox(
  tenantId: string,
  propertyId: string
): Promise<{ pending: AccessRequestListItem[]; pendingCount: number }> {
  await expirePendingAccessRequests(tenantId, propertyId);

  const rows = await db
    .select({
      id: accessRequests.id,
      visitorName: accessRequests.visitorName,
      visitorPhotoUrl: accessRequests.visitorPhotoUrl,
      roleLabel: accessRequests.roleLabel,
      vehicleReg: accessRequests.vehicleReg,
      status: accessRequests.status,
      requestedAt: accessRequests.requestedAt,
      expiresAt: accessRequests.expiresAt,
      gateName: gates.name,
    })
    .from(accessRequests)
    .innerJoin(gates, eq(accessRequests.gateId, gates.id))
    .where(
      and(
        eq(accessRequests.tenantId, tenantId),
        eq(accessRequests.propertyId, propertyId),
        inArray(accessRequests.status, ['PENDING', 'ALLOWED', 'DENIED', 'EXPIRED'])
      )
    )
    .orderBy(desc(accessRequests.requestedAt))
    .limit(50);

  const pending = rows
    .filter(r => r.status === 'PENDING')
    .map(r => ({
      id: r.id,
      visitorName: r.visitorName,
      visitorPhotoUrl: r.visitorPhotoUrl,
      roleLabel: r.roleLabel,
      vehicleReg: r.vehicleReg,
      status: r.status,
      requestedAt: r.requestedAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      gateName: r.gateName,
    }));

  return { pending, pendingCount: pending.length };
}

export async function getAccessRequestForProperty(opts: {
  tenantId: string;
  propertyId: string;
  requestId: string;
}): Promise<AccessRequestListItem | null> {
  await expirePendingAccessRequests(opts.tenantId, opts.propertyId);

  const [row] = await db
    .select({
      id: accessRequests.id,
      visitorName: accessRequests.visitorName,
      visitorPhotoUrl: accessRequests.visitorPhotoUrl,
      roleLabel: accessRequests.roleLabel,
      vehicleReg: accessRequests.vehicleReg,
      status: accessRequests.status,
      requestedAt: accessRequests.requestedAt,
      expiresAt: accessRequests.expiresAt,
      gateName: gates.name,
    })
    .from(accessRequests)
    .innerJoin(gates, eq(accessRequests.gateId, gates.id))
    .where(
      and(
        eq(accessRequests.id, opts.requestId),
        eq(accessRequests.tenantId, opts.tenantId),
        eq(accessRequests.propertyId, opts.propertyId)
      )
    )
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    visitorName: row.visitorName,
    visitorPhotoUrl: row.visitorPhotoUrl,
    roleLabel: row.roleLabel,
    vehicleReg: row.vehicleReg,
    status: row.status,
    requestedAt: row.requestedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    gateName: row.gateName,
  };
}

export async function respondToAccessRequest(opts: {
  tenantId: string;
  propertyId: string;
  requestId: string;
  userId: string;
  action: 'allow' | 'deny';
}): Promise<{ ok: boolean; reason?: string }> {
  await expirePendingAccessRequests(opts.tenantId, opts.propertyId);

  const [req] = await db
    .select()
    .from(accessRequests)
    .where(
      and(
        eq(accessRequests.id, opts.requestId),
        eq(accessRequests.tenantId, opts.tenantId),
        eq(accessRequests.propertyId, opts.propertyId)
      )
    )
    .limit(1);

  if (!req) return { ok: false, reason: 'NOT_FOUND' };
  if (req.status !== 'PENDING') return { ok: false, reason: 'ALREADY_RESOLVED' };

  const now = new Date();
  const status = opts.action === 'allow' ? 'ALLOWED' : 'DENIED';
  const state = opts.action === 'allow' ? 'GRANTED' : 'DENIED';

  await db.transaction(async tx => {
    await tx
      .update(accessRequests)
      .set({
        status,
        respondedAt: now,
        respondedByUserId: opts.userId,
      })
      .where(and(eq(accessRequests.id, opts.requestId), eq(accessRequests.status, 'PENDING')));

    await tx.insert(accessEvents).values({
      id: createId(),
      tenantId: opts.tenantId,
      gateId: req.gateId,
      propertyId: opts.propertyId,
      visitorId: null,
      accessRequestId: opts.requestId,
      visitorLabel: req.visitorName,
      vehicleReg: req.vehicleReg,
      state,
      method: 'INTERCOM',
      actorType: 'RESIDENT',
      actorUserId: opts.userId,
      occurredAt: now,
    });
  });

  return { ok: true };
}

/** Guard-house / kiosk writer — creates pending request + pending event + notify hook. */
export async function createAccessRequest(opts: {
  tenantId: string;
  propertyId: string;
  visitorName: string;
  visitorPhotoUrl?: string | null;
  roleLabel?: string | null;
  vehicleReg?: string | null;
  gateId?: string | null;
  ttlMs?: number;
  baseUrl: string;
}): Promise<AccessRequestListItem> {
  const gate = opts.gateId
    ? (
        await db
          .select({ id: gates.id, name: gates.name })
          .from(gates)
          .where(and(eq(gates.id, opts.gateId), eq(gates.tenantId, opts.tenantId)))
          .limit(1)
      )[0]
    : await ensureDefaultGate(opts.tenantId);

  if (!gate) throw new Error('Gate not found');

  const id = createId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (opts.ttlMs ?? ACCESS_REQUEST_DEFAULT_TTL_MS));

  await db.transaction(async tx => {
    await tx.insert(accessRequests).values({
      id,
      tenantId: opts.tenantId,
      propertyId: opts.propertyId,
      gateId: gate.id,
      visitorName: opts.visitorName,
      visitorPhotoUrl: opts.visitorPhotoUrl ?? null,
      roleLabel: opts.roleLabel ?? null,
      vehicleReg: opts.vehicleReg ?? null,
      status: 'PENDING',
      requestedAt: now,
      respondedAt: null,
      respondedByUserId: null,
      expiresAt,
    });

    await tx.insert(accessEvents).values({
      id: createId(),
      tenantId: opts.tenantId,
      gateId: gate.id,
      propertyId: opts.propertyId,
      visitorId: null,
      accessRequestId: id,
      visitorLabel: opts.visitorName,
      vehicleReg: opts.vehicleReg ?? null,
      state: 'PENDING',
      method: 'INTERCOM',
      actorType: 'AWAITING_RESIDENT',
      actorUserId: null,
      occurredAt: now,
    });
  });

  await notifyAccessRequestPending({
    tenantId: opts.tenantId,
    accessRequestId: id,
    propertyId: opts.propertyId,
    deepLink: `${opts.baseUrl.replace(/\/$/, '')}/access-control?tab=inbox&request=${id}`,
  });

  return {
    id,
    visitorName: opts.visitorName,
    visitorPhotoUrl: opts.visitorPhotoUrl ?? null,
    roleLabel: opts.roleLabel ?? null,
    vehicleReg: opts.vehicleReg ?? null,
    status: 'PENDING',
    requestedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    gateName: gate.name,
  };
}

function rangeStart(range: 'today' | '7d' | '30d'): Date {
  const d = new Date();
  if (range === 'today') {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const days = range === '7d' ? 7 : 30;
  d.setDate(d.getDate() - days);
  return d;
}

export async function listAccessEvents(opts: {
  tenantId: string;
  q?: string;
  state?: 'GRANTED' | 'DENIED' | 'PENDING' | 'ANY';
  method?: 'QR' | 'CODE' | 'MANUAL' | 'ANPR' | 'INTERCOM' | 'AUTO_LIST' | 'ANY';
  range?: 'today' | '7d' | '30d';
}): Promise<{ events: AccessEventListItem[]; lastHourCount: number }> {
  const conditions = [eq(accessEvents.tenantId, opts.tenantId)];
  if (opts.state && opts.state !== 'ANY') conditions.push(eq(accessEvents.state, opts.state));
  if (opts.method && opts.method !== 'ANY') conditions.push(eq(accessEvents.method, opts.method));
  if (opts.range) conditions.push(gte(accessEvents.occurredAt, rangeStart(opts.range)));

  if (opts.q?.trim()) {
    const like = `%${opts.q.trim()}%`;
    conditions.push(
      or(
        ilike(accessEvents.visitorLabel, like),
        ilike(accessEvents.vehicleReg, like),
        ilike(properties.unit, like),
        ilike(properties.street, like)
      )!
    );
  }

  const rows = await db
    .select({
      id: accessEvents.id,
      occurredAt: accessEvents.occurredAt,
      visitorLabel: accessEvents.visitorLabel,
      vehicleReg: accessEvents.vehicleReg,
      state: accessEvents.state,
      method: accessEvents.method,
      actorType: accessEvents.actorType,
      actorName: users.name,
      gateName: gates.name,
      propertyUnit: properties.unit,
      propertyStreet: properties.street,
      visitorId: accessEvents.visitorId,
      accessRequestId: accessEvents.accessRequestId,
    })
    .from(accessEvents)
    .innerJoin(gates, eq(accessEvents.gateId, gates.id))
    .leftJoin(users, eq(accessEvents.actorUserId, users.id))
    .leftJoin(properties, eq(accessEvents.propertyId, properties.id))
    .where(and(...conditions))
    .orderBy(desc(accessEvents.occurredAt))
    .limit(100);

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [hourRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(accessEvents)
    .where(and(eq(accessEvents.tenantId, opts.tenantId), gte(accessEvents.occurredAt, hourAgo)));

  return {
    lastHourCount: hourRow?.n ?? 0,
    events: rows.map(r => ({
      id: r.id,
      occurredAt: r.occurredAt.toISOString(),
      visitorLabel: r.visitorLabel,
      vehicleReg: r.vehicleReg,
      propertyLabel:
        r.propertyUnit || r.propertyStreet
          ? [r.propertyUnit, r.propertyStreet].filter(Boolean).join(' · ')
          : null,
      state: r.state,
      method: r.method,
      actorType: r.actorType,
      actorName: r.actorName,
      gateName: r.gateName,
      visitorId: r.visitorId,
      accessRequestId: r.accessRequestId,
    })),
  };
}

export async function createManualAccessEvent(opts: {
  tenantId: string;
  userId: string;
  actorType: 'MANAGER' | 'GUARD';
  input: ManualAccessEventInput;
}): Promise<AccessEventListItem> {
  const gate = opts.input.gateId
    ? (
        await db
          .select({ id: gates.id, name: gates.name })
          .from(gates)
          .where(and(eq(gates.id, opts.input.gateId), eq(gates.tenantId, opts.tenantId)))
          .limit(1)
      )[0]
    : await ensureDefaultGate(opts.tenantId);

  if (!gate) throw new Error('Gate not found');

  const id = createId();
  const now = new Date();

  await db.insert(accessEvents).values({
    id,
    tenantId: opts.tenantId,
    gateId: gate.id,
    propertyId: opts.input.propertyId ?? null,
    visitorId: null,
    accessRequestId: null,
    visitorLabel: opts.input.visitorLabel,
    vehicleReg: opts.input.vehicleReg ?? null,
    state: opts.input.state,
    method: 'MANUAL',
    actorType: opts.actorType,
    actorUserId: opts.userId,
    occurredAt: now,
  });

  let propertyLabel: string | null = null;
  if (opts.input.propertyId) {
    const [prop] = await db
      .select({ unit: properties.unit, street: properties.street })
      .from(properties)
      .where(eq(properties.id, opts.input.propertyId))
      .limit(1);
    if (prop) propertyLabel = [prop.unit, prop.street].filter(Boolean).join(' · ');
  }

  const [actor] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, opts.userId))
    .limit(1);

  return {
    id,
    occurredAt: now.toISOString(),
    visitorLabel: opts.input.visitorLabel,
    vehicleReg: opts.input.vehicleReg ?? null,
    propertyLabel,
    state: opts.input.state,
    method: 'MANUAL',
    actorType: opts.actorType,
    actorName: actor?.name ?? null,
    gateName: gate.name,
    visitorId: null,
    accessRequestId: null,
  };
}
