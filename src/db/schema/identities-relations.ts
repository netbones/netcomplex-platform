import { relations } from 'drizzle-orm';
import { identities } from './identities';
import { credentials } from './credentials';

export const identitiesRelations = relations(identities, helpers => ({
  credentials: helpers.many(credentials, { relationName: 'CredentialToIdentity' }),
}));
