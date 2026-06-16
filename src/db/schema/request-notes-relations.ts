import { relations } from 'drizzle-orm';
import { requestNotes } from './request-notes';
import { maintenanceRequests } from './maintenance-requests';
import { users } from './users';

export const requestNotesRelations = relations(requestNotes, (helpers) => ({ request: helpers.one(maintenanceRequests, { relationName: 'MaintenanceRequestToRequestNote', fields: [ requestNotes.requestId ], references: [ maintenanceRequests.id ] }), user: helpers.one(users, { relationName: 'RequestNoteTouser', fields: [ requestNotes.userId ], references: [ users.id ] }) }));