// Dispute entity constants — label maps and const arrays.
// Client-safe — no server imports.

import type {
  DisputeStatus,
  DisputeCategory,
  DisputeSeverity,
  DisputeRespondent,
  DisputeEventType,
} from './types';

export const STATUS_LABELS: Record<DisputeStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  MEDIATION_OFFERED: 'Mediation Offered',
  MEDIATION_ACTIVE: 'Mediation Active',
  MEDIATED_RESOLVED: 'Mediated — Resolved',
  FORMAL_RULING: 'Formal Ruling',
  RESOLVED: 'Resolved',
  WITHDRAWN: 'Withdrawn',
  ESCALATED_CSOS: 'Escalated to CSOS',
  CSOS_CLOSED: 'CSOS Closed',
};

export const CATEGORY_LABELS: Record<DisputeCategory, string> = {
  NOISE: 'Noise',
  PETS: 'Pets',
  PARKING: 'Parking',
  BOUNDARIES: 'Boundaries',
  COMMON_PROPERTY: 'Common Property',
  LEVY_DISPUTE: 'Levy Dispute',
  RULE_ENFORCEMENT: 'Rule Enforcement',
  GOVERNANCE: 'Governance',
  CONDUCT: 'Conduct',
  DAMAGE: 'Damage',
  OTHER: 'Other',
};

export const SEVERITY_LABELS: Record<DisputeSeverity, string> = {
  MINOR: 'Minor',
  MODERATE: 'Moderate',
  SERIOUS: 'Serious',
  URGENT: 'Urgent',
};

export const RESPONDENT_LABELS: Record<DisputeRespondent, string> = {
  RESIDENT: 'Resident',
  HOA: 'HOA',
  BOARD_MEMBER: 'Board Member',
  TENANT_PROVIDER: 'Tenant Provider',
};

export const EVENT_TYPE_LABELS: Record<DisputeEventType, string> = {
  CREATED: 'Created',
  SUBMITTED: 'Submitted',
  ASSIGNED: 'Assigned',
  MEDIATION_OFFERED: 'Mediation Offered',
  MEDIATION_ACCEPTED: 'Mediation Accepted',
  MEDIATION_DECLINED: 'Mediation Declined',
  MEDIATION_CONCLUDED: 'Mediation Concluded',
  RULING_ISSUED: 'Ruling Issued',
  RESOLVED: 'Resolved',
  WITHDRAWN: 'Withdrawn',
  ESCALATED_CSOS: 'Escalated to CSOS',
  CSOS_CLOSED: 'CSOS Closed',
  NOTE_ADDED: 'Note Added',
  EVIDENCE_ADDED: 'Evidence Added',
  STATUS_CHANGED: 'Status Changed',
};

export const CSOS_ELIGIBLE_STATUSES: DisputeStatus[] = [
  'FORMAL_RULING',
  'RESOLVED',
  'ESCALATED_CSOS',
  'CSOS_CLOSED',
];

export const ALL_DISPUTE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'MEDIATION_OFFERED',
  'MEDIATION_ACTIVE',
  'MEDIATED_RESOLVED',
  'FORMAL_RULING',
  'RESOLVED',
  'WITHDRAWN',
  'ESCALATED_CSOS',
  'CSOS_CLOSED',
] as const;

export const ALL_DISPUTE_CATEGORIES = [
  'NOISE',
  'PETS',
  'PARKING',
  'BOUNDARIES',
  'COMMON_PROPERTY',
  'LEVY_DISPUTE',
  'RULE_ENFORCEMENT',
  'GOVERNANCE',
  'CONDUCT',
  'DAMAGE',
  'OTHER',
] as const;
