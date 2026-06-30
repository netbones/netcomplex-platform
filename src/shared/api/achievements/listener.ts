import { onEvent } from '../events';
import { processAchievementEvent } from './service';
import { logger } from '@/shared/lib/logger';

onEvent('booking.created', async event => {
  try {
    await processAchievementEvent({
      tenantId: event.payload.tenantId,
      userId: event.payload.userId,
      eventType: 'booking.created',
    });
  } catch (err) {
    logger.error(
      { component: 'achievements', event: 'booking.created', error: err },
      'Failed to process booking.created'
    );
  }
});

onEvent('maintenance.created', async event => {
  try {
    await processAchievementEvent({
      tenantId: event.payload.tenantId,
      userId: event.payload.userId,
      eventType: 'maintenance.created',
    });
  } catch (err) {
    logger.error(
      { component: 'achievements', event: 'maintenance.created', error: err },
      'Failed to process maintenance.created'
    );
  }
});

onEvent('event.rsvp', async event => {
  try {
    await processAchievementEvent({
      tenantId: event.payload.tenantId,
      userId: event.payload.userId,
      eventType: 'event.rsvp',
    });
  } catch (err) {
    logger.error(
      { component: 'achievements', event: 'event.rsvp', error: err },
      'Failed to process event.rsvp'
    );
  }
});

onEvent('content.created', async event => {
  try {
    await processAchievementEvent({
      tenantId: event.payload.tenantId,
      userId: event.payload.userId,
      eventType: 'content.created',
    });
  } catch (err) {
    logger.error(
      { component: 'achievements', event: 'content.created', error: err },
      'Failed to process content.created'
    );
  }
});

onEvent('group.joined', async event => {
  try {
    await processAchievementEvent({
      tenantId: event.payload.tenantId,
      userId: event.payload.userId,
      eventType: 'group.joined',
    });
  } catch (err) {
    logger.error(
      { component: 'achievements', event: 'group.joined', error: err },
      'Failed to process group.joined'
    );
  }
});

onEvent('competition.entered', async event => {
  try {
    await processAchievementEvent({
      tenantId: event.payload.tenantId,
      userId: event.payload.userId,
      eventType: 'competition.entered',
    });
  } catch (err) {
    logger.error(
      { component: 'achievements', event: 'competition.entered', error: err },
      'Failed to process competition.entered'
    );
  }
});
