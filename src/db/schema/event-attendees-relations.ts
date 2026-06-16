import { relations } from 'drizzle-orm';
import { eventAttendees } from './event-attendees';
import { events } from './events';
import { users } from './users';

export const eventAttendeesRelations = relations(eventAttendees, (helpers) => ({ event: helpers.one(events, { relationName: 'EventToEventAttendee', fields: [ eventAttendees.eventId ], references: [ events.id ] }), user: helpers.one(users, { relationName: 'EventAttendeeTouser', fields: [ eventAttendees.userId ], references: [ users.id ] }) }));