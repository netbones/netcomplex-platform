import { relations } from 'drizzle-orm';
import { meetingProxies } from './meeting-proxies';
import { tenants } from './tenants';
import { events } from './events';
import { credentials } from './credentials';
import { users } from './users';

export const meetingProxiesRelations = relations(meetingProxies, helpers => ({
  Tenant: helpers.one(tenants, {
    relationName: 'MeetingProxyToTenant',
    fields: [meetingProxies.tenantId],
    references: [tenants.id],
  }),
  Meeting: helpers.one(events, {
    relationName: 'EventProxy',
    fields: [meetingProxies.meetingId],
    references: [events.id],
  }),
  credential: helpers.one(credentials, {
    relationName: 'MeetingProxyToCredential',
    fields: [meetingProxies.credentialId],
    references: [credentials.id],
  }),
  owner: helpers.one(users, {
    relationName: 'MeetingProxyOwner',
    fields: [meetingProxies.ownerUserId],
    references: [users.id],
  }),
  proxy: helpers.one(users, {
    relationName: 'MeetingProxyProxy',
    fields: [meetingProxies.proxyUserId],
    references: [users.id],
  }),
  approver: helpers.one(users, {
    relationName: 'MeetingProxyApprover',
    fields: [meetingProxies.approvedBy],
    references: [users.id],
  }),
}));
