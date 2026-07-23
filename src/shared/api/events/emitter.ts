import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createComponentLogger } from '@shared/lib';
import { db } from '../db';
import { outboxes } from '@schema/outboxes';

const log = createComponentLogger('event-emitter');

export interface BookingCreatedEvent {
  tenantId: string;
  userId: string;
  bookingId: string;
  facility: string;
}

export interface ContentCreatedEvent {
  tenantId: string;
  userId: string;
  contentId: string;
  category: string;
}

export interface MaintenanceCreatedEvent {
  tenantId: string;
  userId: string;
  requestId: string;
  category: string;
}

export interface EventRsvpEvent {
  tenantId: string;
  userId: string;
  eventId: string;
}

export interface GroupJoinedEvent {
  tenantId: string;
  userId: string;
  groupId: string;
}

export interface CompetitionEnteredEvent {
  tenantId: string;
  userId: string;
  competitionId: string;
}

export interface MeritRecognitionEvent {
  tenantId: string;
  userId: string;
  meritId: string;
  points: number;
}

export interface MaintenanceTeamAssignedEvent {
  tenantId: string;
  requestId: string;
  teamId: string;
  teamName: string;
  category: string;
  memberUserIds: string[];
}

export type DomainEvent =
  | { type: 'booking.created'; payload: BookingCreatedEvent }
  | { type: 'content.created'; payload: ContentCreatedEvent }
  | { type: 'maintenance.created'; payload: MaintenanceCreatedEvent }
  | { type: 'event.rsvp'; payload: EventRsvpEvent }
  | { type: 'group.joined'; payload: GroupJoinedEvent }
  | { type: 'competition.entered'; payload: CompetitionEnteredEvent }
  | { type: 'merit.recognized'; payload: MeritRecognitionEvent }
  | { type: 'maintenance.team_assigned'; payload: MaintenanceTeamAssignedEvent };

export type EventType = DomainEvent['type'];

type EventHandlerMap = {
  [K in EventType]: (event: Extract<DomainEvent, { type: K }>) => void | Promise<void>;
};

class TypedEventEmitter {
  private emitter = new EventEmitter();

  on<K extends EventType>(type: K, handler: EventHandlerMap[K]): void {
    this.emitter.on(type, handler);
  }

  off<K extends EventType>(type: K, handler: EventHandlerMap[K]): void {
    this.emitter.off(type, handler);
  }

  emit<K extends EventType>(event: Extract<DomainEvent, { type: K }>): void {
    try {
      this.emitter.emit(event.type, event);
    } catch (err) {
      log.error({ err, eventType: event.type }, 'Unhandled error in event listener');
    }

    this.writeOutbox(event).catch(err =>
      log.error({ err, eventType: event.type }, 'Outbox write failed')
    );
  }

  private async writeOutbox<K extends EventType>(
    event: Extract<DomainEvent, { type: K }>
  ): Promise<void> {
    const payload = event.payload as unknown as Record<string, unknown>;
    const tenantId = payload.tenantId as string | undefined;
    if (!tenantId) return;

    try {
      await db.insert(outboxes).values({
        id: randomUUID(),
        type: event.type,
        version: 1,
        tenantId,
        correlationId: randomUUID(),
        causationId: null,
        actorId: (payload.userId as string) ?? null,
        payload,
        createdAt: new Date(),
        processedAt: null,
        attempts: 0,
        error: null,
      });
    } catch (err) {
      log.error({ err, eventType: event.type }, 'Failed to write outbox row');
    }
  }
}

const eventBus = new TypedEventEmitter();

/**
 * Emit a domain event. Fire-and-forget — never throws into the calling request.
 * Listener errors are logged via Pino and do not block the emitter.
 *
 * @example emitEvent('booking.created', { tenantId, userId, bookingId, facility });
 */
export function emitEvent<
  K extends EventType,
  P extends Extract<DomainEvent, { type: K }>['payload'],
>(type: K, payload: P): void {
  try {
    eventBus.emit({ type, payload } as Extract<DomainEvent, { type: K }>);
  } catch (err) {
    log.error({ err, eventType: type }, 'emitEvent failed');
  }
}

/**
 * Subscribe to domain events. Used by achievement listeners.
 */
export function onEvent<K extends EventType>(type: K, handler: EventHandlerMap[K]): void {
  eventBus.on(type, handler);
}

/**
 * Unsubscribe from domain events.
 */
export function offEvent<K extends EventType>(type: K, handler: EventHandlerMap[K]): void {
  eventBus.off(type, handler);
}
