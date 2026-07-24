import { relations } from 'drizzle-orm';
import { announcements } from './announcements';
import { resources } from './resources';
import { tenants } from './tenants';

export const announcementsRelations = relations(announcements, (helpers) => ({ resource: helpers.one(resources, { relationName: 'AnnouncementToResource', fields: [ announcements.resourceId ], references: [ resources.id ] }), Tenant: helpers.one(tenants, { relationName: 'AnnouncementToTenant', fields: [ announcements.tenantId ], references: [ tenants.id ] }) }));