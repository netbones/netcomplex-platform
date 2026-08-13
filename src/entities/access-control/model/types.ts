export type VisitorType = 'WALK_IN' | 'VEHICLE';
export type VisitType = 'SINGLE' | 'RECURRING';
export type VisitorStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'DENIED';
export type AccessRequestStatus = 'PENDING' | 'ALLOWED' | 'DENIED' | 'EXPIRED';
export type GateIntegrationType = 'MANUAL' | 'THIRD_PARTY_API';
export type AccessEventState = 'GRANTED' | 'DENIED' | 'PENDING';
export type AccessEventMethod = 'QR' | 'CODE' | 'MANUAL' | 'ANPR' | 'INTERCOM' | 'AUTO_LIST';
export type AccessEventActorType =
  | 'RESIDENT'
  | 'MANAGER'
  | 'AUTO_LIST'
  | 'AUTO_DENY'
  | 'GUARD'
  | 'AWAITING_RESIDENT';

export interface AccessCodePublic {
  id: string;
  code: string;
  qrPayload: string;
  shareUrl: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface VisitorListItem {
  id: string;
  fullName: string;
  phone: string | null;
  visitorType: VisitorType;
  vehicleReg: string | null;
  roleLabel: string | null;
  visitType: VisitType;
  validFrom: string;
  validUntil: string | null;
  status: VisitorStatus;
  accessCode: AccessCodePublic | null;
}

export interface AccessRequestListItem {
  id: string;
  visitorName: string;
  visitorPhotoUrl: string | null;
  roleLabel: string | null;
  vehicleReg: string | null;
  status: AccessRequestStatus;
  requestedAt: string;
  expiresAt: string;
  gateName: string;
}

export interface AccessEventListItem {
  id: string;
  occurredAt: string;
  visitorLabel: string;
  vehicleReg: string | null;
  propertyLabel: string | null;
  state: AccessEventState;
  method: AccessEventMethod;
  actorType: AccessEventActorType;
  actorName: string | null;
  gateName: string;
  visitorId: string | null;
  accessRequestId: string | null;
}
