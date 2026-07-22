import { relations } from 'drizzle-orm';
import { mediaUploads } from './media-uploads';
import { users } from './users';
import { tenants } from './tenants';

export const mediaUploadsRelations = relations(mediaUploads, helpers => ({
  user: helpers.one(users, {
    relationName: 'MediaUploadTouser',
    fields: [mediaUploads.userId],
    references: [users.id],
  }),
  tenant: helpers.one(tenants, {
    relationName: 'MediaUploadToTenant',
    fields: [mediaUploads.tenantId],
    references: [tenants.id],
  }),
}));
