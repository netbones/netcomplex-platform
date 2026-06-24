import 'server-only';

import { and, eq, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { withTenant } from '@entities/tenant/server';
import {
  apiForbidden,
  apiUnauthorized,
  db,
  getSessionAndRole,
  now,
  serviceProviders,
  providerVerifications,
  providerReputations,
  communityServiceListings,
  users,
  type SessionAndRole,
} from './server';
import { hasPermission } from '@shared/lib';

export type ProviderDisplayStatus = 'UNVERIFIED' | 'PROBATION' | 'VERIFIED' | 'SUSPENDED';
export type ProviderVerificationStatus = 'PENDING' | 'PROBATION' | 'VERIFIED' | 'SUSPENDED';

export interface ProviderVerificationSnapshot {
  providerId: string | null;
  rawStatus: ProviderVerificationStatus;
  displayStatus: ProviderDisplayStatus;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  verificationThreshold: number;
  probationThreshold: number;
  isDefault: boolean;
  isVerified: boolean;
  isSuspended: boolean;
}

export interface ProviderReputationSnapshot {
  providerId: string | null;
  totalScore: number;
  responseTimeScore: number;
  qualityScore: number;
  reviewScore: number;
  complianceScore: number;
  engagementScore: number;
  verificationThreshold: number;
  remainingToVerification: number;
  progressPercentage: number;
  lastCalculatedAt: string | null;
}

export interface ProviderAccessContext {
  auth: SessionAndRole;
  tenantId: string;
  providerRecord: typeof serviceProviders.$inferSelect | null;
  verification: ProviderVerificationSnapshot;
  reputation: ProviderReputationSnapshot;
  hasProviderListings: boolean;
  accessMode: 'permission' | 'provider-record' | 'provider-listings';
}

function toDisplayStatus(status: ProviderVerificationStatus): ProviderDisplayStatus {
  switch (status) {
    case 'VERIFIED':
      return 'VERIFIED';
    case 'PROBATION':
      return 'PROBATION';
    case 'SUSPENDED':
      return 'SUSPENDED';
    default:
      return 'UNVERIFIED';
  }
}

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function getProviderRecordForUser(
  tenantId: string,
  userEmail: string | null | undefined
): Promise<typeof serviceProviders.$inferSelect | null> {
  if (!userEmail) {
    return null;
  }

  const [providerRecord] = await db
    .select()
    .from(serviceProviders)
    .where(
      and(
        eq(serviceProviders.tenantId, tenantId),
        eq(serviceProviders.email, userEmail),
        isNull(serviceProviders.deletedAt)
      )
    )
    .limit(1);

  return providerRecord ?? null;
}

export async function hasProviderListingsForUser(
  tenantId: string,
  userId: string
): Promise<boolean> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(communityServiceListings)
    .where(
      and(
        eq(communityServiceListings.tenantId, tenantId),
        eq(communityServiceListings.providerId, userId),
        isNull(communityServiceListings.deletedAt)
      )
    );

  return (row?.count ?? 0) > 0;
}

export async function getProviderVerificationSnapshot(
  tenantId: string,
  providerId: string | null
): Promise<ProviderVerificationSnapshot> {
  if (!providerId) {
    return {
      providerId: null,
      rawStatus: 'PROBATION',
      displayStatus: 'PROBATION',
      notes: null,
      startDate: null,
      endDate: null,
      verificationThreshold: 300,
      probationThreshold: 0,
      isDefault: true,
      isVerified: false,
      isSuspended: false,
    };
  }

  const [verificationRow] = await db
    .select()
    .from(providerVerifications)
    .where(
      and(
        eq(providerVerifications.tenantId, tenantId),
        eq(providerVerifications.providerId, providerId)
      )
    )
    .limit(1);

  const rawStatus = (verificationRow?.status ?? 'PROBATION') as ProviderVerificationStatus;
  const displayStatus = toDisplayStatus(rawStatus);

  return {
    providerId,
    rawStatus,
    displayStatus,
    notes: verificationRow?.notes ?? null,
    startDate: toIsoString(verificationRow?.startDate),
    endDate: toIsoString(verificationRow?.endDate),
    verificationThreshold: verificationRow?.verificationThreshold ?? 300,
    probationThreshold: verificationRow?.probationThreshold ?? 0,
    isDefault: !verificationRow,
    isVerified: displayStatus === 'VERIFIED',
    isSuspended: displayStatus === 'SUSPENDED',
  };
}

export async function getProviderReputationSnapshot(
  tenantId: string,
  providerId: string | null,
  verificationThreshold = 300
): Promise<ProviderReputationSnapshot> {
  if (!providerId) {
    return {
      providerId: null,
      totalScore: 0,
      responseTimeScore: 0,
      qualityScore: 0,
      reviewScore: 0,
      complianceScore: 0,
      engagementScore: 0,
      verificationThreshold,
      remainingToVerification: verificationThreshold,
      progressPercentage: 0,
      lastCalculatedAt: null,
    };
  }

  const [reputationRow] = await db
    .select()
    .from(providerReputations)
    .where(
      and(
        eq(providerReputations.tenantId, tenantId),
        eq(providerReputations.providerId, providerId)
      )
    )
    .limit(1);

  const totalScore = reputationRow?.totalScore ?? 0;

  return {
    providerId,
    totalScore,
    responseTimeScore: reputationRow?.responseTimeScore ?? 0,
    qualityScore: reputationRow?.qualityScore ?? 0,
    reviewScore: reputationRow?.reviewScore ?? 0,
    complianceScore: reputationRow?.complianceScore ?? 0,
    engagementScore: reputationRow?.engagementScore ?? 0,
    verificationThreshold,
    remainingToVerification: Math.max(verificationThreshold - totalScore, 0),
    progressPercentage: clampPercentage((totalScore / Math.max(verificationThreshold, 1)) * 100),
    lastCalculatedAt: toIsoString(reputationRow?.lastCalculatedAt),
  };
}

export async function requireProviderAccess(
  request: Request
): Promise<
  ProviderAccessContext | ReturnType<typeof apiUnauthorized> | ReturnType<typeof apiForbidden>
> {
  const auth = await getSessionAndRole(request);

  if (!auth) {
    return apiUnauthorized();
  }

  const { tenantId } = await withTenant();
  const providerRecord = await getProviderRecordForUser(tenantId, auth.session.user.email);
  const hasProviderListings = await hasProviderListingsForUser(tenantId, auth.userId);

  const hasRoleAccess = hasPermission(auth.role, 'providers');
  if (!hasRoleAccess && !providerRecord && !hasProviderListings) {
    return apiForbidden('Provider access required');
  }

  const verification = await getProviderVerificationSnapshot(tenantId, providerRecord?.id ?? null);

  // ADVISORY-015: Suspended providers cannot access provider endpoints
  if (providerRecord && verification.isSuspended) {
    return apiForbidden(
      'Your provider account has been suspended. Contact your community administrator.'
    );
  }

  const reputation = await getProviderReputationSnapshot(
    tenantId,
    providerRecord?.id ?? null,
    verification.verificationThreshold
  );

  return {
    auth,
    tenantId,
    providerRecord,
    verification,
    reputation,
    hasProviderListings,
    accessMode: hasRoleAccess
      ? 'permission'
      : providerRecord
        ? 'provider-record'
        : 'provider-listings',
  };
}

export async function upsertProviderVerification(params: {
  tenantId: string;
  providerId: string;
  status: ProviderVerificationStatus;
  notes?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  verificationThreshold?: number;
  probationThreshold?: number;
  dueDiligenceItems?: Array<{ key: string; status: string; notes?: string }>;
}) {
  const [existing] = await db
    .select({ id: providerVerifications.id })
    .from(providerVerifications)
    .where(
      and(
        eq(providerVerifications.tenantId, params.tenantId),
        eq(providerVerifications.providerId, params.providerId)
      )
    )
    .limit(1);

  const timestamp = now();

  if (existing) {
    const [updated] = await db
      .update(providerVerifications)
      .set({
        status: params.status,
        notes: params.notes ?? null,
        dueDiligenceItems: params.dueDiligenceItems ?? undefined,
        startDate: params.startDate ?? undefined,
        endDate: params.endDate ?? null,
        verificationThreshold: params.verificationThreshold ?? undefined,
        probationThreshold: params.probationThreshold ?? undefined,
        updatedAt: timestamp,
      })
      .where(eq(providerVerifications.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(providerVerifications)
    .values({
      id: crypto.randomUUID(),
      providerId: params.providerId,
      tenantId: params.tenantId,
      status: params.status,
      notes: params.notes ?? null,
      dueDiligenceItems: params.dueDiligenceItems ?? [],
      startDate: params.startDate ?? timestamp,
      endDate: params.endDate ?? null,
      verificationThreshold: params.verificationThreshold ?? 300,
      probationThreshold: params.probationThreshold ?? 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .returning();

  return created;
}

/**
 * ADVISORY-015 Phase 3B: Create provider stub records for a newly registered provider.
 * Called from both invitation acceptance (PROVIDER path) and self-registration.
 * Does NOT set user.role — the user stays at USER until admin approval (Phase 3C).
 */
export async function createProviderStub(userId: string, tenantId: string, companyName?: string) {
  const timestamp = now();
  const providerId = crypto.randomUUID();

  const [provider] = await db
    .insert(serviceProviders)
    .values({
      id: providerId,
      tenantId,
      userId,
      companyName: companyName || '',
      trade: 'GENERAL',
      isActive: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .returning();

  await db.insert(providerVerifications).values({
    id: crypto.randomUUID(),
    providerId,
    tenantId,
    status: 'PROBATION',
    verificationThreshold: 300,
    probationThreshold: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return provider;
}

/**
 * ADVISORY-015 Phase 3C / GAP-5: Shared provider activation — used by both
 * approve and verify routes. Atomically sets isActive, verification status,
 * and promotes user.role (only from USER — never downgrades).
 */
export async function activateProvider(
  tx: NodePgDatabase<Record<string, unknown>>,
  providerId: string,
  userId: string | null,
  notes: string
): Promise<void> {
  const timestamp = now();

  await tx
    .update(serviceProviders)
    .set({ isActive: true, updatedAt: timestamp })
    .where(eq(serviceProviders.id, providerId));

  await tx
    .update(providerVerifications)
    .set({ status: 'VERIFIED', endDate: null, notes, updatedAt: timestamp })
    .where(eq(providerVerifications.providerId, providerId));

  if (userId) {
    const [user] = await tx
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (user && user.role === 'USER') {
      await tx.update(users).set({ role: 'PROVIDER' }).where(eq(users.id, userId));
    }
  }
}
