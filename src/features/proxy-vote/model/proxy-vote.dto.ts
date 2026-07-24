/**
 * DTOs and JSON serializers for the proxy-vote entity layer.
 *
 * `MeetingProxyDTO` is the wire-stable shape returned across the API boundary.
 * Dates are serialized to ISO strings so JSON consumers in tools, widgets,
 * and external integrators receive a portable shape regardless of runtime.
 *
 * Builders:
 *  - createProxyDTO()  synthesizes a full MeetingProxy-shaped record from the
 *    user-supplied create input plus server-allocated fields (id, status,
 *    timestamps, signature provider default). Use this when stubbing data
 *    client-side before the POST round-trip lands.
 *  - proxyResponseDTO() converts a Drizzle/Prisma row (or any record matching
 *    MeetingProxy) into the DTO shape — used by tRPC procedures and route
 *    handlers at the response boundary.
 */

import type { MeetingProxy, SignatureEvidence } from './types';
import type { CreateProxyInput } from './proxy-vote.zod';

export interface MeetingProxyDTO {
  id: string;
  tenantId: string;
  meetingId: string;
  ownerUserId: string;
  ownerHouseholdId: string;
  proxyUserId: string | null;
  proxyName: string | null;
  proxyEmail: string | null;
  proxyPhone: string | null;
  formDocumentId: string | null;
  ownerSignedAt: string | null;
  proxySignedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  status: MeetingProxy['status'];
  notes: string | null;
  signatureProvider: MeetingProxy['signatureProvider'];
  signatureEvidence: SignatureEvidence | Record<string, never>;
  createdAt: string;
  updatedAt: string;
  referenceCode: string | null;
}

const toIsoString = (value: Date | string | null): string | null => {
  if (value === null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const toIsoStringRequired = (value: Date | string): string => {
  const iso = toIsoString(value);
  if (iso === null) {
    return new Date(0).toISOString();
  }
  return iso;
};

export function createProxyDTO(
  input: CreateProxyInput,
  overrides: Partial<MeetingProxy> = {}
): MeetingProxy {
  const now = new Date();
  return {
    id: overrides.id ?? cryptoRandomId(),
    tenantId: overrides.tenantId ?? '',
    meetingId: input.meetingId,
    ownerUserId: overrides.ownerUserId ?? '',
    ownerHouseholdId: overrides.ownerHouseholdId ?? '',
    proxyUserId: input.proxyUserId ?? null,
    proxyName: input.proxyName ?? null,
    proxyEmail: input.proxyEmail ?? null,
    proxyPhone: input.proxyPhone ?? null,
    formDocumentId: overrides.formDocumentId ?? null,
    ownerSignedAt: overrides.ownerSignedAt ?? null,
    proxySignedAt: overrides.proxySignedAt ?? null,
    approvedBy: overrides.approvedBy ?? null,
    approvedAt: overrides.approvedAt ?? null,
    status: overrides.status ?? 'Draft',
    notes: overrides.notes ?? null,
    signatureProvider: overrides.signatureProvider ?? 'INTERNAL',
    signatureEvidence: overrides.signatureEvidence ?? {},
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    referenceCode: overrides.referenceCode ?? null,
  };
}

export function proxyResponseDTO(row: MeetingProxy): MeetingProxyDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    meetingId: row.meetingId,
    ownerUserId: row.ownerUserId,
    ownerHouseholdId: row.ownerHouseholdId,
    proxyUserId: row.proxyUserId,
    proxyName: row.proxyName,
    proxyEmail: row.proxyEmail,
    proxyPhone: row.proxyPhone,
    formDocumentId: row.formDocumentId,
    ownerSignedAt: toIsoString(row.ownerSignedAt),
    proxySignedAt: toIsoString(row.proxySignedAt),
    approvedBy: row.approvedBy,
    approvedAt: toIsoString(row.approvedAt),
    status: row.status,
    notes: row.notes,
    signatureProvider: row.signatureProvider,
    signatureEvidence: row.signatureEvidence,
    createdAt: toIsoStringRequired(row.createdAt),
    updatedAt: toIsoStringRequired(row.updatedAt),
    referenceCode: row.referenceCode,
  };
}

function cryptoRandomId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `proxy_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
