// Webhook endpoint — governed API per API.md §24
// Required protections (future): signed payloads, replay protection, idempotency
import { apiSuccess, apiInternalError } from '@api/api-response';
import { apiLogger } from '@shared/lib';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    apiLogger.info({ webhookBody: body }, 'Webhook received');
    return apiSuccess({ received: true });
  } catch (error) {
    apiLogger.error({ err: error }, 'Webhook processing error');
    return apiInternalError();
  }
}
