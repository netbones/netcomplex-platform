import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { events, meetingProxies, notifications, users } from '@api/server';
import { ALLOWED_EVENT_CATEGORIES, isProxyEligible } from '@/features/proxy-vote/lib/constants';
import type { ProxyStatus, ProxyStatusEvent } from '@/features/proxy-vote/lib/status-transitions';
import { transition } from '@/features/proxy-vote/lib/status-transitions';
import { db, type DbSchema } from '@api/server';
import { createId } from '@shared/lib/id';
import type {
  CreateProxyInput,
  SignProxyInput,
  UpdateProxyInput,
} from '@/features/proxy-vote/model/proxy-vote.zod';
import type { MeetingProxy } from '@/features/proxy-vote/model/types';

export type DrizzleDB = DbSchema | typeof db;

export interface CreateProxyParams {
  input: CreateProxyInput;
  ownerUserId: string;
  ownerHouseholdId: string;
  tenantId: string;
}

export interface RealtimeEventLite {
  id: string;
  category: string | null;
  tenantId: string;
}

async function fetchMeeting(
  meetingId: string,
  tenantId: string
): Promise<RealtimeEventLite | null> {
  const [meeting] = await db
    .select({ id: events.id, category: events.category, tenantId: events.tenantId })
    .from(events)
    .where(and(eq(events.id, meetingId), eq(events.tenantId, tenantId), isNull(events.deletedAt)));
  return meeting ?? null;
}

async function createProxy(params: CreateProxyParams): Promise<MeetingProxy> {
  const { input, ownerUserId, ownerHouseholdId, tenantId } = params;
  const meeting = await fetchMeeting(input.meetingId, tenantId);
  if (!meeting) {
    throw new Error('Meeting not found or not accessible in this tenant');
  }
  if (!meeting.category || !isProxyEligible(meeting.category)) {
    throw new Error(
      `Meeting category "${meeting.category ?? 'unknown'}" is not proxy-eligible (allowed: ${ALLOWED_EVENT_CATEGORIES.join(', ')})`
    );
  }

  const id = createId();
  const ts = new Date();
  const values = {
    id,
    tenantId,
    meetingId: input.meetingId,
    ownerUserId,
    ownerHouseholdId,
    proxyUserId: input.proxyUserId ?? null,
    proxyName: input.proxyName ?? null,
    proxyEmail: input.proxyEmail ?? null,
    proxyPhone: input.proxyPhone ?? null,
    status: 'Draft' as ProxyStatus,
    signatureProvider: 'INTERNAL' as const,
    signatureEvidence: {},
    createdAt: ts,
    updatedAt: ts,
  };

  await db.insert(meetingProxies).values(values);
  const [inserted] = await db.select().from(meetingProxies).where(eq(meetingProxies.id, id));
  return inserted as unknown as MeetingProxy;
}

async function applyTransition(
  proxyId: string,
  tenantId: string,
  eventName: ProxyStatusEvent
): Promise<ProxyStatus> {
  const [current] = await db
    .select({ status: meetingProxies.status })
    .from(meetingProxies)
    .where(and(eq(meetingProxies.id, proxyId), eq(meetingProxies.tenantId, tenantId)));
  if (!current) throw new Error('MeetingProxy not found');
  return transition(current.status as ProxyStatus, eventName);
}

async function ownerScopedFetch(
  proxyId: string,
  userId: string,
  tenantId: string
): Promise<MeetingProxy> {
  const [record] = await db
    .select()
    .from(meetingProxies)
    .where(
      and(
        eq(meetingProxies.id, proxyId),
        eq(meetingProxies.tenantId, tenantId),
        eq(meetingProxies.ownerUserId, userId)
      )
    );
  if (!record) {
    throw new Error('MeetingProxy not found or not owned by user');
  }
  return record as unknown as MeetingProxy;
}

async function updateProxy(
  proxyId: string,
  input: UpdateProxyInput,
  userId: string,
  tenantId: string
): Promise<MeetingProxy> {
  const owner = await ownerScopedFetch(proxyId, userId, tenantId);
  const status = owner.status as ProxyStatus;

  if (status === 'Approved' || status === 'Rejected' || status === 'Withdrawn') {
    throw new Error(`Cannot update proxy in terminal state (${status})`);
  }

  const updates: Partial<typeof meetingProxies.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.proxyName !== undefined) updates.proxyName = input.proxyName;
  if (input.proxyEmail !== undefined) updates.proxyEmail = input.proxyEmail;
  if (input.proxyPhone !== undefined) updates.proxyPhone = input.proxyPhone;
  if (input.proxyUserId !== undefined) updates.proxyUserId = input.proxyUserId;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.status !== undefined) updates.status = input.status;

  await db.update(meetingProxies).set(updates).where(eq(meetingProxies.id, proxyId));

  const [updated] = await db.select().from(meetingProxies).where(eq(meetingProxies.id, proxyId));
  return updated as unknown as MeetingProxy;
}

async function signProxy(
  proxyId: string,
  input: SignProxyInput,
  userId: string,
  tenantId: string
): Promise<MeetingProxy> {
  const [record] = await db
    .select()
    .from(meetingProxies)
    .where(and(eq(meetingProxies.id, proxyId), eq(meetingProxies.tenantId, tenantId)));
  if (!record) throw new Error('MeetingProxy not found');
  if (record.proxyUserId !== userId) {
    throw new Error('Only the nominated proxy can sign this appointment');
  }

  const nextStatus = await applyTransition(proxyId, tenantId, 'proxyAccepted');

  await db
    .update(meetingProxies)
    .set({
      status: nextStatus,
      signatureProvider: 'INTERNAL',
      signatureEvidence: input.signatureEvidence,
      proxySignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(meetingProxies.id, proxyId));

  const [updated] = await db.select().from(meetingProxies).where(eq(meetingProxies.id, proxyId));
  return updated as unknown as MeetingProxy;
}

function pad4(n: number): string {
  return String(n).padStart(4, '0');
}

function currentYearCode(): string {
  return String(new Date().getUTCFullYear());
}

async function nextReferenceCode(tenantId: string): Promise<string> {
  const year = currentYearCode();
  const [{ value: countValue }] = await db
    .select({ value: count() })
    .from(meetingProxies)
    .where(
      and(eq(meetingProxies.tenantId, tenantId), sql`${meetingProxies.referenceCode} IS NOT NULL`)
    );
  return `PV-${year}-${pad4(Number(countValue) + 1)}`;
}

async function approveProxy(
  proxyId: string,
  approverUserId: string,
  tenantId: string,
  notes?: string
): Promise<MeetingProxy> {
  const nextStatus = await applyTransition(proxyId, tenantId, 'approve');
  const referenceCode = await nextReferenceCode(tenantId);

  const updates: Partial<MeetingProxy> = {
    status: nextStatus,
    approvedBy: approverUserId,
    approvedAt: new Date(),
    referenceCode,
    updatedAt: new Date(),
  };
  if (notes !== undefined) updates.notes = notes;

  await db.update(meetingProxies).set(updates).where(eq(meetingProxies.id, proxyId));

  const [updated] = await db.select().from(meetingProxies).where(eq(meetingProxies.id, proxyId));
  return updated as unknown as MeetingProxy;
}

async function rejectProxy(
  proxyId: string,
  approverUserId: string,
  tenantId: string,
  notes: string
): Promise<MeetingProxy> {
  if (!notes || notes.trim().length === 0) {
    throw new Error('Rejection notes are required');
  }
  const nextStatus = await applyTransition(proxyId, tenantId, 'reject');

  await db
    .update(meetingProxies)
    .set({
      status: nextStatus,
      approvedBy: approverUserId,
      approvedAt: new Date(),
      notes,
      updatedAt: new Date(),
    })
    .where(eq(meetingProxies.id, proxyId));

  const [updated] = await db.select().from(meetingProxies).where(eq(meetingProxies.id, proxyId));
  return updated as unknown as MeetingProxy;
}

async function withdrawProxy(
  proxyId: string,
  userId: string,
  tenantId: string
): Promise<MeetingProxy> {
  const owner = await ownerScopedFetch(proxyId, userId, tenantId);
  const nextStatus = transition(owner.status as ProxyStatus, 'withdraw');

  await db
    .update(meetingProxies)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(meetingProxies.id, proxyId));

  const [updated] = await db.select().from(meetingProxies).where(eq(meetingProxies.id, proxyId));
  return updated as unknown as MeetingProxy;
}

async function getProxyById(proxyId: string, tenantId: string): Promise<MeetingProxy | null> {
  const [record] = await db
    .select()
    .from(meetingProxies)
    .where(and(eq(meetingProxies.id, proxyId), eq(meetingProxies.tenantId, tenantId)));
  return (record as unknown as MeetingProxy) ?? null;
}

async function getProxiesByMeeting(meetingId: string, tenantId: string): Promise<MeetingProxy[]> {
  const records = await db
    .select()
    .from(meetingProxies)
    .where(and(eq(meetingProxies.meetingId, meetingId), eq(meetingProxies.tenantId, tenantId)))
    .orderBy(desc(meetingProxies.createdAt));
  return records as unknown as MeetingProxy[];
}

async function getProxiesByOwner(ownerUserId: string, tenantId: string): Promise<MeetingProxy[]> {
  const records = await db
    .select()
    .from(meetingProxies)
    .where(and(eq(meetingProxies.ownerUserId, ownerUserId), eq(meetingProxies.tenantId, tenantId)))
    .orderBy(desc(meetingProxies.createdAt));
  return records as unknown as MeetingProxy[];
}

void asc;
void users;
void notifications;

export const proxyCrudService = {
  createProxy,
  updateProxy,
  signProxy,
  approveProxy,
  rejectProxy,
  withdrawProxy,
  getProxyById,
  getProxiesByMeeting,
  getProxiesByOwner,
  nextReferenceCode,
};

export {
  createProxy as createProxyCrud,
  updateProxy as updateProxyCrud,
  signProxy as signProxyCrud,
  approveProxy as approveProxyCrud,
  rejectProxy as rejectProxyCrud,
  withdrawProxy as withdrawProxyCrud,
  getProxyById as getProxyByIdCrud,
  getProxiesByMeeting as getProxiesByMeetingCrud,
};
