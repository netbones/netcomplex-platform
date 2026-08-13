export type SecurityAlertType = 'PANIC' | 'ANONYMOUS_TIP';

export type SecurityAlertStatus = 'SENT' | 'ACKNOWLEDGED' | 'RESPONDING' | 'RESOLVED' | 'FAILED';

export type SecurityContactType = 'INTERNAL_SECURITY' | 'EMERGENCY_SERVICES' | 'ARMED_RESPONSE';

export interface SecurityContact {
  id: string;
  tenantId: string;
  label: string;
  phone: string;
  contactType: SecurityContactType;
  isDefaultCallTarget: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Resident-facing contact fields — no creator or tenant internals. */
export type SecurityContactPublic = Pick<
  SecurityContact,
  'id' | 'label' | 'phone' | 'contactType' | 'isDefaultCallTarget'
>;

export interface ResidentPanicAlert {
  id: string;
  status: SecurityAlertStatus;
  createdAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
}

export interface SecurityAlert {
  id: string;
  tenantId: string;
  propertyId: string | null;
  triggeredByUserId: string | null;
  alertType: SecurityAlertType;
  latitude: string | null;
  longitude: string | null;
  locationAccuracyM: string | null;
  withinBoundary: boolean | null;
  message: string | null;
  status: SecurityAlertStatus;
  createdAt: Date;
  acknowledgedAt: Date | null;
  acknowledgedByUserId: string | null;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  updatedAt: Date;
}

export interface PanicLocationPayload {
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracyM?: number | null;
}
