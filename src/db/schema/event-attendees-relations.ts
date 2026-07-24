import { relations } from 'drizzle-orm';
import { eventAttendees } from './event-attendees';
import { events } from './events';
import { tenants } from './tenants';
import { users } from './users';

export const eventAttendeesRelations = relations(eventAttendees, (helpers) => ({ event: helpers.one(events, { relationName: 'EventToEventAttendee', fields: [ eventAttendees.eventId ], references: [ events.id ] }), Tenant: helpers.one(tenants, { relationName: 'EventAttendeeToTenant', fields: [ eventAttendees.tenantId ], references: [ tenants.id ] }), user: helpers.one(users, { relationName: 'EventAttendeeTouser', fields: [ eventAttendees.userId ], references: [ users.id ] }) }));