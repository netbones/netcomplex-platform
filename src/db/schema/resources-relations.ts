import { relations } from 'drizzle-orm';
import { resources } from './resources';
import { users } from './users';

export const resourcesRelations = relations(resources, helpers => ({
  user: helpers.one(users, {
    relationName: 'ResourceTouser',
    fields: [resources.authorId],
    references: [users.id],
  }),
}));
