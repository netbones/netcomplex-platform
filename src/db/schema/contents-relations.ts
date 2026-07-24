import { relations } from 'drizzle-orm';
import { contents } from './contents';
import { users } from './users';
import { groups } from './groups';
import { tenants } from './tenants';
import { contentLikes } from './content-likes';
import { contentVersions } from './content-versions';
import { contentAuditLogs } from './content-audit-logs';

export const contentsRelations = relations(contents, (helpers) => ({ user: helpers.one(users, { relationName: 'ContentTouser', fields: [ contents.authorId ], references: [ users.id ] }), Group: helpers.one(groups, { relationName: 'ContentToGroup', fields: [ contents.groupId ], references: [ groups.id ] }), Tenant: helpers.one(tenants, { relationName: 'ContentToTenant', fields: [ contents.tenantId ], references: [ tenants.id ] }), likes: helpers.many(contentLikes, { relationName: 'ContentToContentLike' }), versions: helpers.many(contentVersions, { relationName: 'ContentToContentVersion' }), auditLogs: helpers.many(contentAuditLogs, { relationName: 'ContentToContentAuditLog' }) }));