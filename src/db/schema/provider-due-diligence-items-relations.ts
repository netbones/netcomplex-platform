import { relations } from 'drizzle-orm';
import { providerDueDiligenceItems } from './provider-due-diligence-items';
import { providerDueDiligenceWorkflows } from './provider-due-diligence-workflows';
import { providerDueDiligenceDocuments } from './provider-due-diligence-documents';

export const providerDueDiligenceItemsRelations = relations(providerDueDiligenceItems, helpers => ({
  workflow: helpers.one(providerDueDiligenceWorkflows, {
    relationName: 'ProviderDueDiligenceItemToProviderDueDiligenceWorkflow',
    fields: [providerDueDiligenceItems.workflowId],
    references: [providerDueDiligenceWorkflows.id],
  }),
  documents: helpers.many(providerDueDiligenceDocuments, {
    relationName: 'ProviderDueDiligenceDocumentToProviderDueDiligenceItem',
  }),
}));
