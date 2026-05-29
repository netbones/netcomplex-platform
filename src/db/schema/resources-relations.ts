import { relations } from 'drizzle-orm';
import { resources } from './resources';
import { users } from './users';
import { resourceVersions } from './resource-versions';
import { announcements } from './announcements';

export const resourcesRelations = relations(resources, (helpers) => ({ user: helpers.one(users, { relationName: 'ResourceTouser', fields: [ resources.authorId ], references: [ users.id ] }), versions: helpers.many(resourceVersions, { relationName: 'ResourceToResourceVersion' }), announcements: helpers.many(announcements, { relationName: 'AnnouncementToResource' }) }));