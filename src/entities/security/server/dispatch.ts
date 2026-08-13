import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('security-dispatch');

export interface DispatchResult {
  success: boolean;
  channel: 'sms_push' | 'none';
  errorMessage?: string;
}

/**
 * v1 dispatch: SMS + in-app push to default internal security contact.
 * Returns honest failure when SECURITY_DISPATCH_ENABLED is not true.
 */
export async function dispatchPanicAlert(params: {
  tenantId: string;
  alertId: string;
  defaultContactPhone: string | null;
}): Promise<DispatchResult> {
  if (process.env.SECURITY_DISPATCH_ENABLED !== 'true') {
    return {
      success: false,
      channel: 'none',
      errorMessage:
        'Emergency dispatch is not enabled for this community yet. Use Call security or Call 10111 now.',
    };
  }

  if (!params.defaultContactPhone) {
    return {
      success: false,
      channel: 'none',
      errorMessage:
        'No default security contact is configured. Use Call 10111 or ask management to add contacts.',
    };
  }

  // Integration point: wire SMS gateway + in-app push with delivery confirmation.
  log.info(
    { alertId: params.alertId, tenantId: params.tenantId },
    'SECURITY_DISPATCH_ENABLED — dispatch adapter not wired; failing closed'
  );

  return {
    success: false,
    channel: 'sms_push',
    errorMessage:
      'Dispatch channel is not fully configured. Use Call security or Call 10111 immediately.',
  };
}
