import { relations } from 'drizzle-orm';
import { passkeys } from './passkeys';
import { users } from './users';

export const passkeysRelations = relations(passkeys, helpers => ({
  user: helpers.one(users, {
    relationName: 'passkeyTouser',
    fields: [passkeys.userId],
    references: [users.id],
  }),
}));
