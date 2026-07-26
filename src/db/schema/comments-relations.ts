import { relations } from 'drizzle-orm';
import { comments } from './comments';
import { tenants } from './tenants';
import { contents } from './contents';
import { users } from './users';
import { commentVotes } from './comment-votes';
import { commentReports } from './comment-reports';

export const commentsRelations = relations(comments, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'CommentToTenant',
    fields: [comments.tenantId],
    references: [tenants.id],
  }),
  content: helpers.one(contents, {
    relationName: 'CommentToContent',
    fields: [comments.contentId],
    references: [contents.id],
  }),
  author: helpers.one(users, {
    relationName: 'CommentTouser',
    fields: [comments.authorId],
    references: [users.id],
  }),
  parent: helpers.one(comments, {
    relationName: 'CommentReplies',
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: helpers.many(comments, { relationName: 'CommentReplies' }),
  votes: helpers.many(commentVotes, { relationName: 'CommentToCommentVote' }),
  reports: helpers.many(commentReports, { relationName: 'CommentToCommentReport' }),
}));
