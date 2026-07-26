import { relations } from 'drizzle-orm';
import { commentVotes } from './comment-votes';
import { tenants } from './tenants';
import { comments } from './comments';
import { users } from './users';

export const commentVotesRelations = relations(commentVotes, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'CommentVoteToTenant',
    fields: [commentVotes.tenantId],
    references: [tenants.id],
  }),
  comment: helpers.one(comments, {
    relationName: 'CommentToCommentVote',
    fields: [commentVotes.commentId],
    references: [comments.id],
  }),
  user: helpers.one(users, {
    relationName: 'CommentVoteTouser',
    fields: [commentVotes.userId],
    references: [users.id],
  }),
}));
