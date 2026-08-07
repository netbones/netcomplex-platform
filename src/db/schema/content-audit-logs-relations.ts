import { relations } from 'drizzle-orm';
import { contentAuditLogs } from './content-audit-logs';
import { contents } from './contents';
import { users } from './users';

export const contentAuditLogsRelations = relations(contentAuditLogs, helpers => ({
  content: helpers.one(contents, {
    relationName: 'ContentToContentAuditLog',
    fields: [contentAuditLogs.contentId],
    references: [contents.id],
  }),
  user: helpers.one(users, {
    relationName: 'ContentAuditLogTouser',
    fields: [contentAuditLogs.userId],
    references: [users.id],
  }),
}));
