// Dispute entity DTO types — client-safe, no server imports.
// All date fields are ISO strings (not Date objects) for portable API contracts.

export type DisputeStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'MEDIATION_OFFERED'
  | 'MEDIATION_ACTIVE'
  | 'MEDIATED_RESOLVED'
  | 'FORMAL_RULING'
  | 'RESOLVED'
  | 'WITHDRAWN'
  | 'ESCALATED_CSOS'
  | 'CSOS_CLOSED';

export type DisputeCategory =
  | 'NOISE'
  | 'PETS'
  | 'PARKING'
  | 'BOUNDARIES'
  | 'COMMON_PROPERTY'
  | 'LEVY_DISPUTE'
  | 'RULE_ENFORCEMENT'
  | 'GOVERNANCE'
  | 'CONDUCT'
  | 'DAMAGE'
  | 'OTHER';

export type DisputeSeverity = 'MINOR' | 'MODERATE' | 'SERIOUS' | 'URGENT';

export type DisputeRespondent = 'RESIDENT' | 'HOA' | 'BOARD_MEMBER' | 'TENANT_PROVIDER';

export type DisputeEventType =
  | 'CREATED'
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'MEDIATION_OFFERED'
  | 'MEDIATION_ACCEPTED'
  | 'MEDIATION_DECLINED'
  | 'MEDIATION_CONCLUDED'
  | 'RULING_ISSUED'
  | 'RESOLVED'
  | 'WITHDRAWN'
  | 'ESCALATED_CSOS'
  | 'CSOS_CLOSED'
  | 'NOTE_ADDED'
  | 'EVIDENCE_ADDED'
  | 'STATUS_CHANGED';

export interface DisputeCaseDTO {
  id: string;
  tenantId: string;
  referenceNumber: string;
  complainantId: string;
  respondentId?: string;
  respondentType: DisputeRespondent;
  category: DisputeCategory;
  subcategory?: string;
  title: string;
  description: string;
  desiredOutcome?: string;
  severity: DisputeSeverity;
  status: DisputeStatus;
  intakeCompletedAt?: string;
  coolingOffEndsAt?: string;
  submittedAt?: string;
  assignedModeratorId?: string;
  mediationOfferedAt?: string;
  mediationAcceptedAt?: string;
  rulingIssuedAt?: string;
  rulingDescription?: string;
  csosReferenceNumber?: string;
  csosEscalatedAt?: string;
  csosClosedAt?: string;
  resolvedAt?: string;
  closedById?: string;
  closedReason?: string;
  isConfidential: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface DisputeEventDTO {
  id: string;
  tenantId: string;
  disputeId: string;
  actorId?: string;
  eventType: DisputeEventType;
  fromStatus?: DisputeStatus;
  toStatus?: DisputeStatus;
  note?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DisputeMessageDTO {
  id: string;
  tenantId: string;
  disputeId: string;
  senderId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
}

export interface DisputeEvidenceDTO {
  id: string;
  tenantId: string;
  disputeId: string;
  uploadedBy: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  description?: string;
  createdAt: string;
  deletedAt?: string;
}

export interface DisputeNotificationDTO {
  id: string;
  tenantId: string;
  disputeId: string;
  userId: string;
  type: string;
  read: boolean;
  createdAt: string;
}
