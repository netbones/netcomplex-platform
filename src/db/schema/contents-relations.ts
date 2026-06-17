import { relations } from 'drizzle-orm';
import { contents } from './contents';
import { users } from './users';
import { groups } from './groups';
import { contentLikes } from './content-likes';

export const contentsRelations = relations(contents, helpers => ({
  user: helpers.one(users, {
    relationName: 'ContentTouser',
    fields: [contents.authorId],
    references: [users.id],
  }),
  Group: helpers.one(groups, {
    relationName: 'ContentToGroup',
    fields: [contents.groupId],
    references: [groups.id],
  }),
  likes: helpers.many(contentLikes, { relationName: 'ContentToContentLike' }),
}));
