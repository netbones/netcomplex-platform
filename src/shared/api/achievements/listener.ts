import { onEvent } from '../events';
import { processAchievementEvent } from './service';

onEvent('booking.created', async event => {
  try {
    await processAchievementEvent({
      tenantId: event.payload.tenantId,
      userId: event.payload.userId,
      eventType: 'booking.created',
    });
  } catch (err) {
    console.error('[achievements] Failed to process booking.created:', err);
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
    console.error('[achievements] Failed to process maintenance.created:', err);
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
    console.error('[achievements] Failed to process event.rsvp:', err);
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
    console.error('[achievements] Failed to process content.created:', err);
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
    console.error('[achievements] Failed to process group.joined:', err);
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
    console.error('[achievements] Failed to process competition.entered:', err);
  }
});
