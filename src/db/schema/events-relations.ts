import { relations } from 'drizzle-orm';
import { events } from './events';
import { tenants } from './tenants';
import { eventAttendees } from './event-attendees';

export const eventsRelations = relations(events, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'EventToTenant',
    fields: [events.tenantId],
    references: [tenants.id],
  }),
  attendees: helpers.many(eventAttendees, { relationName: 'EventToEventAttendee' }),
}));
