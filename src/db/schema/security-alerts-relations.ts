import { relations } from 'drizzle-orm';
import { securityAlerts } from './security-alerts';
import { tenants } from './tenants';
import { properties } from './properties';
import { users } from './users';

export const securityAlertsRelations = relations(securityAlerts, helpers => ({
  tenant: helpers.one(tenants, {
    relationName: 'SecurityAlertToTenant',
    fields: [securityAlerts.tenantId],
    references: [tenants.id],
  }),
  property: helpers.one(properties, {
    relationName: 'PropertyToSecurityAlert',
    fields: [securityAlerts.propertyId],
    references: [properties.id],
  }),
  triggeredByUser: helpers.one(users, {
    relationName: 'SecurityAlertTriggeredBy',
    fields: [securityAlerts.triggeredByUserId],
    references: [users.id],
  }),
  acknowledgedByUser: helpers.one(users, {
    relationName: 'SecurityAlertAcknowledgedBy',
    fields: [securityAlerts.acknowledgedByUserId],
    references: [users.id],
  }),
  resolvedByUser: helpers.one(users, {
    relationName: 'SecurityAlertResolvedBy',
    fields: [securityAlerts.resolvedByUserId],
    references: [users.id],
  }),
}));
