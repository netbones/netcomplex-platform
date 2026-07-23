import { onEvent, registerHandler } from '../events';
import type { DomainEvent } from '../events';
import { processAchievementEvent } from './service';
import { logger } from '@/shared/lib/logger';

const EVENT_TYPES: Array<DomainEvent['type']> = [
  'booking.created',
  'maintenance.created',
  'event.rsvp',
  'content.created',
  'group.joined',
  'competition.entered',
];

async function handleAchievementEvent(tenantId: string, userId: string, eventType: string) {
  try {
    await processAchievementEvent({ tenantId, userId, eventType });
  } catch (err) {
    logger.error(
      { component: 'achievements', event: eventType, error: err },
      'Failed to process achievement event'
    );
  }
}

for (const eventType of EVENT_TYPES) {
  onEvent(eventType, async (event: { payload: { tenantId: string; userId: string } }) => {
    await handleAchievementEvent(event.payload.tenantId, event.payload.userId, eventType);
  });

  registerHandler(eventType, async envelope => {
    const payload = envelope.payload as { tenantId: string; userId: string };
    await handleAchievementEvent(payload.tenantId, payload.userId, eventType);
  });
}
