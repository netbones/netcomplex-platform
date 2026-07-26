/**
 * Client-safe file upload constraints.
 * Kept in sync with src/shared/api/storage.ts (server-side validation).
 */
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Constants module for proxy-vote feature.
 *
 * Encodes:
 *  - ALLOWED_EVENT_CATEGORIES — const-tuple of governance event types that
 *    accept proxy appointments. Gated via isProxyEligible() at every tRPC
 *    createProxy entry point (plan 125-05) so non-governance events
 *    (COMMUNITY_EVENT etc.) can never create a proxy.
 *  - STATUS_META — exhaustive Record<ProxyStatus, ProxyStatusMeta> mapping
 *    each status to Tailwind badge palette tokens per UI-SPEC §Status Badge
 *    Palette. The Record type ensures any new ProxyStatus value triggers a
 *    TypeScript compile error when a metadata entry is missing.
 *  - REFERENCE_CODE_FORMAT — PV-{YYYY}-{NNNN} template for QR codes on the
 *    HOA dashboard widget (after approval). The placeholder string is filled
 *    once the proxy is approved and inserted into `meetingProxies.referenceCode`.
 */

import type { ProxyStatus } from '@/features/proxy-vote/lib/status-transitions';

export const ALLOWED_EVENT_CATEGORIES = [
  'AGM',
  'SGM',
  'SPECIAL_RESOLUTION',
  'TRUSTEE_ELECTION',
] as const;

export type AllowedEventCategory = (typeof ALLOWED_EVENT_CATEGORIES)[number];

/**
 * Returns true if the supplied event category accepts proxy appointments.
 * Anything outside the ALLOWED_EVENT_CATEGORIES const-tuple is rejected —
 * including COMMUNITY_EVENT, SOCIAL_GATHERING, and other non-governance types.
 */
export function isProxyEligible(category: string): boolean {
  return (ALLOWED_EVENT_CATEGORIES as readonly string[]).includes(category);
}

/**
 * Tailwind color tokens for status badges (per UI-SPEC §Status Badge Palette).
 * Each tone maps to a specific background/text/border triple when rendered —
 * this module only owns the semantic token, the rendering layer consumes it.
 */
export type StatusBadgeColor = 'gray' | 'amber' | 'green' | 'red';

export interface ProxyStatusMeta {
  label: string;
  color: StatusBadgeColor;
  description: string;
}

export const STATUS_META: Record<ProxyStatus, ProxyStatusMeta> = {
  Draft: {
    label: 'Draft',
    color: 'gray',
    description: 'Owner has initiated a proxy appointment but not yet submitted.',
  },
  WaitingForUpload: {
    label: 'Waiting for Upload',
    color: 'amber',
    description: 'Owner needs to upload the signed proxy form before the proxy can review.',
  },
  WaitingForProxy: {
    label: 'Waiting for Proxy',
    color: 'amber',
    description: 'Form uploaded. Awaiting the nominated proxy to accept and sign.',
  },
  PendingHoaReview: {
    label: 'Pending HOA Review',
    color: 'amber',
    description: 'Both signatures captured. HOA board has not yet reviewed this proxy.',
  },
  Approved: {
    label: 'Approved',
    color: 'green',
    description: 'HOA board approved this proxy. A QR reference code has been issued.',
  },
  Rejected: {
    label: 'Rejected',
    color: 'red',
    description: 'HOA board rejected this proxy. The owner has been notified.',
  },
  Withdrawn: {
    label: 'Withdrawn',
    color: 'gray',
    description: 'The owner withdrew this proxy before or after submission.',
  },
};

/**
 * Reference code format template `PV-{YYYY}-{NNNN}` consumed by the QR-code
 * generator on the HOA dashboard widget. The placeholder string is intentionally
 * raw — it is replaced at format-time via `String.prototype.replace(...)`.
 *
 * Example filled: `PV-2026-0001`.
 */
export const REFERENCE_CODE_FORMAT = 'PV-{YYYY}-{NNNN}';
