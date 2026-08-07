import { relations } from 'drizzle-orm';
import { userKeys } from './user-keys';
import { users } from './users';

export const userKeysRelations = relations(userKeys, helpers => ({
  user: helpers.one(users, {
    relationName: 'UserKeyTouser',
    fields: [userKeys.userId],
    references: [users.id],
  }),
}));
