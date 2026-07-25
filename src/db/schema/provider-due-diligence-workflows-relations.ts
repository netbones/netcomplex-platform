import { relations } from 'drizzle-orm';
import { providerDueDiligenceWorkflows } from './provider-due-diligence-workflows';
import { tenants } from './tenants';
import { serviceProviders } from './service-providers';
import { providerDueDiligenceItems } from './provider-due-diligence-items';
import { providerDueDiligenceDocuments } from './provider-due-diligence-documents';
import { providerDueDiligenceEvents } from './provider-due-diligence-events';

export const providerDueDiligenceWorkflowsRelations = relations(
  providerDueDiligenceWorkflows,
  helpers => ({
    Tenant: helpers.one(tenants, {
      relationName: 'ProviderDueDiligenceWorkflowToTenant',
      fields: [providerDueDiligenceWorkflows.tenantId],
      references: [tenants.id],
    }),
    provider: helpers.one(serviceProviders, {
      relationName: 'ProviderDueDiligenceWorkflowToServiceProvider',
      fields: [providerDueDiligenceWorkflows.providerId],
      references: [serviceProviders.id],
    }),
    items: helpers.many(providerDueDiligenceItems, {
      relationName: 'ProviderDueDiligenceItemToProviderDueDiligenceWorkflow',
    }),
    documents: helpers.many(providerDueDiligenceDocuments, {
      relationName: 'ProviderDueDiligenceDocumentToProviderDueDiligenceWorkflow',
    }),
    events: helpers.many(providerDueDiligenceEvents, {
      relationName: 'ProviderDueDiligenceEventToProviderDueDiligenceWorkflow',
    }),
  })
);
