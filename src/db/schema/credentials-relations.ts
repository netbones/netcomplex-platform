import { relations } from 'drizzle-orm';
import { credentials } from './credentials';
import { identities } from './identities';
import { meetingProxies } from './meeting-proxies';

export const credentialsRelations = relations(credentials, helpers => ({
  identity: helpers.one(identities, {
    relationName: 'CredentialToIdentity',
    fields: [credentials.identityId],
    references: [identities.id],
  }),
  meetingProxies: helpers.many(meetingProxies, { relationName: 'MeetingProxyToCredential' }),
}));
