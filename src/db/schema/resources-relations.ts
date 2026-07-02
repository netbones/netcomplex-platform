import { relations } from 'drizzle-orm';
import { resources } from './resources';
import { announcements } from './announcements';
import { users } from './users';
import { tenants } from './tenants';
import { resourceVersions } from './resource-versions';

export const resourcesRelations = relations(resources, helpers => ({
  announcements: helpers.many(announcements, { relationName: 'AnnouncementToResource' }),
  user: helpers.one(users, {
    relationName: 'ResourceTouser',
    fields: [resources.authorId],
    references: [users.id],
  }),
  Tenant: helpers.one(tenants, {
    relationName: 'ResourceToTenant',
    fields: [resources.tenantId],
    references: [tenants.id],
  }),
  versions: helpers.many(resourceVersions, { relationName: 'ResourceToResourceVersion' }),
}));
