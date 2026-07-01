import { relations } from 'drizzle-orm';
import { contentLikes } from './content-likes';
import { contents } from './contents';
import { users } from './users';

export const contentLikesRelations = relations(contentLikes, (helpers) => ({ content: helpers.one(contents, { relationName: 'ContentToContentLike', fields: [ contentLikes.contentId ], references: [ contents.id ] }), user: helpers.one(users, { relationName: 'ContentLikeTouser', fields: [ contentLikes.userId ], references: [ users.id ] }) }));