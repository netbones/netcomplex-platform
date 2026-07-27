/**
 * Entity-layer types for the proxy-vote feature slice.
 *
 * Mirrors the Prisma `MeetingProxy` model definition and the
 * `ProxyStatus` / `SignatureProvider` enum definitions exactly. Server-side
 * owners must update this file in lockstep with the Prisma schema.
 *
 * All clients of the entity layer should consume these types — never the
 * lower-level Zod schemas directly — so that the wire shape stays stable
 * across request/response boundaries.
 */

import type { ProxyStatus, SignatureProvider } from '@prisma/client';

export type { ProxyStatus, SignatureProvider };

export const PROXY_STATUS_VALUES = [
  'Draft',
  'WaitingForUpload',
  'WaitingForProxy',
  'PendingHoaReview',
  'Approved',
  'Rejected',
  'Withdrawn',
] as const satisfies readonly ProxyStatus[];

export const SIGNATURE_PROVIDER_VALUES = [
  'INTERNAL',
  'DOCUSIGN',
  'ADOBE_SIGN',
  'PGP',
  'GOV_EID',
] as const satisfies readonly SignatureProvider[];

export interface MeetingProxy {
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
  ownerSignedAt: Date | string | null;
  proxySignedAt: Date | string | null;
  approvedBy: string | null;
  approvedAt: Date | string | null;
  status: ProxyStatus;
  notes: string | null;
  signatureProvider: SignatureProvider;
  signatureEvidence: SignatureEvidence | Record<string, never>;
  createdAt: Date | string;
  updatedAt: Date | string;
  referenceCode: string | null;
}

export interface ProxyStatusMeta {
  label: string;
  color: string;
  description: string;
}

export interface SignatureEvidenceInternal {
  provider: 'INTERNAL';
  mode: 'draw' | 'type';
  signatureDataUrl?: string;
  typedName?: string;
  timestamp: string;
}

export type SignatureEvidence = SignatureEvidenceInternal;
