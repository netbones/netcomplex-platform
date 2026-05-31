import { relations } from 'drizzle-orm';
import { events } from './events';
import { eventAttendees } from './event-attendees';

export const eventsRelations = relations(events, helpers => ({
  attendees: helpers.many(eventAttendees, { relationName: 'EventToEventAttendee' }),
}));
