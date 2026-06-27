import { relations } from 'drizzle-orm';
import { internalMaintenanceNotes } from './internal-maintenance-notes';
import { maintenanceRequests } from './maintenance-requests';
import { users } from './users';

export const internalMaintenanceNotesRelations = relations(internalMaintenanceNotes, helpers => ({
  request: helpers.one(maintenanceRequests, {
    relationName: 'InternalMaintenanceNoteToMaintenanceRequest',
    fields: [internalMaintenanceNotes.requestId],
    references: [maintenanceRequests.id],
  }),
  user: helpers.one(users, {
    relationName: 'InternalMaintenanceNoteTouser',
    fields: [internalMaintenanceNotes.userId],
    references: [users.id],
  }),
}));
