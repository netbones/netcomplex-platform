import { relations } from 'drizzle-orm';
import { platformSuspensions } from './platform-suspensions';
import { users } from './users';

export const platformSuspensionsRelations = relations(platformSuspensions, helpers => ({
  user: helpers.one(users, {
    relationName: 'PlatformSuspensionTouser',
    fields: [platformSuspensions.userId],
    references: [users.id],
  }),
}));
