import { relations } from 'drizzle-orm';
import { contentVersions } from './content-versions';
import { contents } from './contents';
import { users } from './users';

export const contentVersionsRelations = relations(contentVersions, (helpers) => ({ content: helpers.one(contents, { relationName: 'ContentToContentVersion', fields: [ contentVersions.contentId ], references: [ contents.id ] }), user: helpers.one(users, { relationName: 'ContentVersionTouser', fields: [ contentVersions.userId ], references: [ users.id ] }) }));