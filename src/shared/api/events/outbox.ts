import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { outboxes } from '@schema/outboxes';
import { outboxDeadLetters } from '@schema/outbox-dead-letters';
import { eq, isNull } from 'drizzle-orm';
import { createComponentLogger } from '@shared/lib';
import { getHandlers, type DomainEventEnvelope } from './registry';

const log = createComponentLogger('outbox');

export type EmitContext = {
  tenantId: string;
  correlationId?: string;
  causationId?: string;
  actorId?: string;
  version?: number;
};

export async function emitDomainEvent(
  type: string,
  payload: Record<string, unknown>,
  ctx: EmitContext
): Promise<string> {
  const id = randomUUID();
  const envelope: DomainEventEnvelope = {
    id,
    type,
    version: ctx.version ?? 1,
    tenantId: ctx.tenantId,
    correlationId: ctx.correlationId ?? id,
    causationId: ctx.causationId,
    actorId: ctx.actorId,
    payload,
  };

  try {
    await db.insert(outboxes).values({
      id: envelope.id,
      type: envelope.type,
      version: envelope.version,
      tenantId: envelope.tenantId,
      correlationId: envelope.correlationId,
      causationId: envelope.causationId ?? null,
      actorId: envelope.actorId ?? null,
      payload: envelope.payload as Record<string, unknown>,
      createdAt: new Date(),
      processedAt: null,
      attempts: 0,
      error: null,
    });
    log.info({ eventType: type, eventId: id }, 'Domain event written to outbox');
  } catch (err) {
    log.error({ err, eventType: type }, 'Failed to write domain event to outbox');
    throw err;
  }

  return id;
}

export async function dispatchOutbox(batchSize = 50): Promise<{
  processed: number;
  deadLettered: number;
  failed: number;
}> {
  const unprocessed = await db
    .select()
    .from(outboxes)
    .where(isNull(outboxes.processedAt))
    .orderBy(outboxes.createdAt)
    .limit(batchSize);

  let processed = 0;
  let deadLettered = 0;
  let failed = 0;

  for (const row of unprocessed) {
    const envelope: DomainEventEnvelope = {
      id: row.id,
      type: row.type,
      version: row.version,
      tenantId: row.tenantId,
      correlationId: row.correlationId,
      causationId: row.causationId ?? undefined,
      actorId: row.actorId ?? undefined,
      payload: row.payload as Record<string, unknown>,
    };

    const handlers = getHandlers(row.type);

    if (handlers.length === 0) {
      await db
        .update(outboxes)
        .set({ processedAt: new Date(), error: 'no handlers registered' })
        .where(eq(outboxes.id, row.id));
      processed++;
      continue;
    }

    let handlerError: Error | undefined;
    for (const handler of handlers) {
      try {
        await handler(envelope);
      } catch (err) {
        handlerError = err instanceof Error ? err : new Error(String(err));
        log.error({ err, eventType: row.type, eventId: row.id }, 'Handler failed for outbox event');
      }
    }

    const newAttempts = row.attempts + 1;

    if (handlerError) {
      if (newAttempts >= 5) {
        await db.insert(outboxDeadLetters).values({
          id: randomUUID(),
          outboxId: row.id,
          type: row.type,
          version: row.version,
          tenantId: row.tenantId,
          correlationId: row.correlationId ?? null,
          payload: row.payload as Record<string, unknown>,
          error: handlerError.message,
          handler: 'unknown',
          attempts: newAttempts,
          deadLetteredAt: new Date(),
        });
        await db
          .update(outboxes)
          .set({
            processedAt: new Date(),
            error: handlerError.message,
            attempts: newAttempts,
          })
          .where(eq(outboxes.id, row.id));
        deadLettered++;
      } else {
        await db
          .update(outboxes)
          .set({ error: handlerError.message, attempts: newAttempts })
          .where(eq(outboxes.id, row.id));
        failed++;
      }
    } else {
      await db
        .update(outboxes)
        .set({ processedAt: new Date(), attempts: newAttempts })
        .where(eq(outboxes.id, row.id));
      processed++;
    }
  }

  return { processed, deadLettered, failed };
}
