/**
 * Zod validation schemas for proxy-vote entity layer.
 *
 * Each schema mirrors one tRPC mutation input contract:
 *  - createProxySchema  → POST /api/proxy-vote (initial draft)
 *  - updateProxySchema  → PATCH /api/proxy-vote/[id] (partial fields)
 *  - signProxySchema    → POST /api/proxy-vote/[id]/sign (signature capture)
 *  - approveProxySchema → POST /api/proxy-vote/[id]/approve (HOA board)
 *  - rejectProxySchema  → POST /api/proxy-vote/[id]/reject (HOA board, notes required)
 *
 * The createProxySchema `refine()` enforces that at least one proxy identifier
 * is supplied — either a resident (proxyUserId) OR a full non-resident name
 * trio (proxyName + proxyEmail + proxyPhone). Half-filled forms are rejected
 * before they reach the database.
 *
 * Provider-specific evidence shapes (Lightning, Nostr, DocuSign, etc.) are
 * deferred; INTERNAL is the only validated provider in Phase 125. Each future
 * provider adapter supplies its own Zod literal in a separate adapter module
 * and the discriminated union is extended in-place.
 */

import { z } from 'zod';
import { PROXY_STATUS_VALUES, SIGNATURE_PROVIDER_VALUES } from './types';

export const proxyStatusSchema = z.enum(PROXY_STATUS_VALUES);
export const signatureProviderSchema = z.enum(SIGNATURE_PROVIDER_VALUES);

export const signatureEvidenceInternalSchema = z.object({
  provider: z.literal('INTERNAL'),
  mode: z.enum(['draw', 'type']),
  signatureDataUrl: z.string().optional(),
  typedName: z.string().optional(),
  timestamp: z.string(),
});

export const signatureEvidenceSchema = z.discriminatedUnion('provider', [
  signatureEvidenceInternalSchema,
]);

export const createProxySchema = z
  .object({
    meetingId: z.string().min(1),
    proxyUserId: z.string().optional(),
    proxyName: z.string().optional(),
    proxyEmail: z.string().email().optional(),
    proxyPhone: z.string().optional(),
  })
  .refine(
    data => {
      const hasResident = Boolean(data.proxyUserId);
      const hasNonResident =
        Boolean(data.proxyName) && Boolean(data.proxyEmail) && Boolean(data.proxyPhone);
      return hasResident || hasNonResident;
    },
    {
      message:
        'Provide either a resident proxyUserId, or all three non-resident fields (name, email, phone).',
      path: ['proxyUserId'],
    }
  );

export const updateProxySchema = z.object({
  status: proxyStatusSchema.optional(),
  notes: z.string().nullable().optional(),
  proxyUserId: z.string().nullable().optional(),
  proxyName: z.string().nullable().optional(),
  proxyEmail: z.string().email().nullable().optional(),
  proxyPhone: z.string().nullable().optional(),
});

export const approveProxySchema = z.object({
  notes: z.string().optional(),
});

export const rejectProxySchema = z.object({
  notes: z.string().min(1, 'Rejection reason required'),
});

export const signProxySchema = z.object({
  signatureEvidence: signatureEvidenceInternalSchema,
});

export type CreateProxyInput = z.infer<typeof createProxySchema>;
export type UpdateProxyInput = z.infer<typeof updateProxySchema>;
export type ApproveProxyInput = z.infer<typeof approveProxySchema>;
export type RejectProxyInput = z.infer<typeof rejectProxySchema>;
export type SignProxyInput = z.infer<typeof signProxySchema>;
export type SignatureEvidenceInput = z.infer<typeof signatureEvidenceInternalSchema>;
