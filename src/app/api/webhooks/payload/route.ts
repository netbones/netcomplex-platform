import { apiSuccess, apiError, apiInternalError, emitDomainEvent } from '@api/server';
import { apiLogger } from '@shared/lib';
import { verifyWebhookSignature, checkIdempotency } from '@shared/lib/webhook';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('X-Signature-256');
    const timestamp = request.headers.get('X-Signature-Timestamp');
    const idempotencyKey = request.headers.get('Idempotency-Key');

    const bodyText = await request.text();

    const sigResult = verifyWebhookSignature(bodyText, signature, timestamp);
    if (!sigResult.verified) {
      apiLogger.warn({ reason: sigResult.reason }, 'Webhook signature verification failed');
      return apiError('UNAUTHORIZED', sigResult.reason ?? 'Invalid signature', 401);
    }

    const idemResult = checkIdempotency(idempotencyKey);
    if (!idemResult.ok) {
      apiLogger.info({ idempotencyKey }, 'Idempotent webhook — skipping');
      return apiSuccess({ received: true, idempotent: true });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return apiError('INVALID_JSON', 'Invalid JSON body', 400);
    }

    const eventType = (body.event as string) ?? 'webhook.received';
    const tenantId = (body.tenantId as string) ?? (body.tenant_id as string);

    if (!tenantId) {
      return apiError('VALIDATION_ERROR', 'Missing tenantId in payload', 400);
    }

    await emitDomainEvent(eventType, body, {
      tenantId,
      correlationId: idempotencyKey ?? undefined,
      actorId: (body.actorId as string) ?? (body.actor_id as string) ?? undefined,
    });

    apiLogger.info({ eventType, tenantId }, 'Webhook processed and emitted as domain event');
    return apiSuccess({ received: true, eventId: eventType });
  } catch (error) {
    apiLogger.error({ err: error }, 'Webhook processing error');
    return apiInternalError();
  }
}
