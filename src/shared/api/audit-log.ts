import { apiLogger } from '@shared/lib';

export type AuditAction =
  | 'USER_SUSPENDED'
  | 'USER_UNSUSPENDED'
  | 'USER_ROLE_CHANGED'
  | 'USER_DEACTIVATED'
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'TENANT_DELETED'
  | 'PERMISSIONS_CHANGED'
  | 'SETTINGS_CHANGED'
  | 'CONTENT_DELETED'
  | 'INVITATION_CREATED'
  | 'INVITATION_REVOKED'
  | 'MERIT_RECORD_CREATED'
  | 'MERIT_RECORD_UPDATED'
  | 'MERIT_RECORD_DELETED'
  | 'MERIT_DISPUTE_FILED'
  | 'MERIT_DISPUTE_RESOLVED'
  | 'PROVIDER_APPROVED'
  | 'PROVIDER_REJECTED'
  | 'PROVIDER_SUSPENDED'
  | 'PROVIDER_REINSTATED'
  | 'PROVIDER_REPUTATION_ADJUSTED'
  | 'PROVIDER_REGISTRATION_MODE_CHANGED'
  | 'PROVIDER_REFUND_REVIEWED'
  | 'PROVIDER_DUE_DILIGENCE_UPDATED'
  | 'ACHIEVEMENT_CONFIG_CHANGED';

export interface AuditLogEntry {
  action: AuditAction;
  actorId: string;
  targetId?: string;
  tenantId?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Write an audit log entry.
 * In the current infrastructure, this writes to the structured Pino logger.
 * Future: will write to a dedicated audit_log table.
 */
export function writeAuditLog(entry: AuditLogEntry): void {
  apiLogger.info(
    {
      audit: true,
      action: entry.action,
      actorId: entry.actorId,
      targetId: entry.targetId,
      tenantId: entry.tenantId,
      details: entry.details,
      requestId: entry.requestId,
    },
    `AUDIT: ${entry.action}`
  );
}
