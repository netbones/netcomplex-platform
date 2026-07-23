import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('event-registry');

export interface DomainEventEnvelope {
  id: string;
  type: string;
  version: number;
  tenantId: string;
  correlationId: string;
  causationId?: string;
  actorId?: string;
  payload: Record<string, unknown>;
}

export type EventHandler = (envelope: DomainEventEnvelope) => Promise<void>;

const handlers = new Map<string, EventHandler[]>();

export function registerHandler(type: string, handler: EventHandler): void {
  const list = handlers.get(type) ?? [];
  list.push(handler);
  handlers.set(type, list);
  log.info({ eventType: type, handlerCount: list.length }, 'Handler registered');
}

export function getHandlers(type: string): EventHandler[] {
  return handlers.get(type) ?? [];
}

export function clearHandlers(): void {
  handlers.clear();
}

export function listRegisteredTypes(): string[] {
  return Array.from(handlers.keys());
}
