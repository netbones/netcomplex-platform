import { relations } from 'drizzle-orm';
import { albums } from './albums';
import { tenants } from './tenants';
import { users } from './users';

export const albumsRelations = relations(albums, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'AlbumToTenant',
    fields: [albums.tenantId],
    references: [tenants.id],
  }),
  user: helpers.one(users, {
    relationName: 'AlbumTouser',
    fields: [albums.userId],
    references: [users.id],
  }),
}));
