import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('access-control-notify');

/**
 * Notification routing hook only — no copy/templates in this pass
 * (INSTRUCTIONS_ACCESS_CONTROL.md §6).
 */
export async function notifyAccessRequestPending(input: {
  tenantId: string;
  accessRequestId: string;
  propertyId: string;
  deepLink: string;
}): Promise<void> {
  log.info(
    {
      tenantId: input.tenantId,
      accessRequestId: input.accessRequestId,
      propertyId: input.propertyId,
      deepLink: input.deepLink,
    },
    'access_request.pending — push routing hook (not wired)'
  );
}

export async function notifyVisitorCodeExpiring(input: {
  tenantId: string;
  visitorId: string;
  userId: string;
}): Promise<void> {
  log.info(
    {
      tenantId: input.tenantId,
      visitorId: input.visitorId,
      userId: input.userId,
    },
    'visitor.code_expiring — optional reminder hook (not wired for v1)'
  );
}
