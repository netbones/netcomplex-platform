import { relations } from 'drizzle-orm';
import { twoFactors } from './two-factors';
import { users } from './users';

export const twoFactorsRelations = relations(twoFactors, (helpers) => ({ user: helpers.one(users, { relationName: 'twoFactorTouser', fields: [ twoFactors.userId ], references: [ users.id ] }) }));