import { relations } from 'drizzle-orm';
import { commentReports } from './comment-reports';
import { tenants } from './tenants';
import { comments } from './comments';
import { users } from './users';

export const commentReportsRelations = relations(commentReports, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'CommentReportToTenant',
    fields: [commentReports.tenantId],
    references: [tenants.id],
  }),
  comment: helpers.one(comments, {
    relationName: 'CommentToCommentReport',
    fields: [commentReports.commentId],
    references: [comments.id],
  }),
  reporter: helpers.one(users, {
    relationName: 'CommentReportTouser',
    fields: [commentReports.reporterId],
    references: [users.id],
  }),
}));
