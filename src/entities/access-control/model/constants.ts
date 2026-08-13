import type {
  AccessEventActorType,
  AccessEventMethod,
  AccessEventState,
  VisitorStatus,
} from './types';

export const VISITOR_STATUS_STYLES: Record<VisitorStatus, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  EXPIRED: 'bg-gray-50 text-gray-600 border-gray-200',
  CANCELLED: 'bg-gray-50 text-gray-600 border-gray-200',
  DENIED: 'bg-red-50 text-red-700 border-red-200',
};

export const ACCESS_EVENT_STATE_STYLES: Record<AccessEventState, string> = {
  GRANTED: 'bg-green-50 text-green-700',
  DENIED: 'bg-red-50 text-red-700',
  PENDING: 'bg-amber-50 text-amber-700',
};

export const ACCESS_REQUEST_DEFAULT_TTL_MS = 3 * 60 * 1000; // 3 minutes
export const QUICK_ACCESS_VALIDITY_MS = 2 * 60 * 60 * 1000; // 2 hours

export function formatVisitorStatus(status: VisitorStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function formatEventMethod(method: AccessEventMethod): string {
  const map: Record<AccessEventMethod, string> = {
    QR: 'QR',
    CODE: 'Code',
    MANUAL: 'Manual',
    ANPR: 'ANPR',
    INTERCOM: 'Intercom',
    AUTO_LIST: 'Auto-list',
  };
  return map[method];
}

export function formatActorLabel(
  actorType: AccessEventActorType,
  actorName: string | null
): string {
  switch (actorType) {
    case 'RESIDENT':
      return actorName ? `Resident: ${actorName}` : 'Resident';
    case 'MANAGER':
      return actorName ? `Manager: ${actorName}` : 'Manager';
    case 'GUARD':
      return actorName ? `Guard: ${actorName}` : 'Guard';
    case 'AUTO_LIST':
      return 'Auto-list';
    case 'AUTO_DENY':
      return 'Auto-deny';
    case 'AWAITING_RESIDENT':
      return 'Awaiting resident';
    default:
      return actorType;
  }
}

export function buildShareMessage(opts: {
  visitorName: string;
  propertyLabel: string;
  code: string;
  shareUrl: string;
}): string {
  return [
    `Hi ${opts.visitorName},`,
    `Your access code for ${opts.propertyLabel} is ${opts.code}.`,
    `Show this at the gate or open: ${opts.shareUrl}`,
  ].join('\n');
}
