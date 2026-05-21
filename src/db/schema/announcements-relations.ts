import { relations } from 'drizzle-orm';
import { announcements } from './announcements';
import { resources } from './resources';

export const announcementsRelations = relations(announcements, helpers => ({
  resource: helpers.one(resources, {
    relationName: 'AnnouncementToResource',
    fields: [announcements.resourceId],
    references: [resources.id],
  }),
}));
