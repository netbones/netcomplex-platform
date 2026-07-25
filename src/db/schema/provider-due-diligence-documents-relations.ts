import { relations } from 'drizzle-orm';
import { providerDueDiligenceDocuments } from './provider-due-diligence-documents';
import { providerDueDiligenceWorkflows } from './provider-due-diligence-workflows';
import { providerDueDiligenceItems } from './provider-due-diligence-items';

export const providerDueDiligenceDocumentsRelations = relations(
  providerDueDiligenceDocuments,
  helpers => ({
    workflow: helpers.one(providerDueDiligenceWorkflows, {
      relationName: 'ProviderDueDiligenceDocumentToProviderDueDiligenceWorkflow',
      fields: [providerDueDiligenceDocuments.workflowId],
      references: [providerDueDiligenceWorkflows.id],
    }),
    item: helpers.one(providerDueDiligenceItems, {
      relationName: 'ProviderDueDiligenceDocumentToProviderDueDiligenceItem',
      fields: [providerDueDiligenceDocuments.itemId],
      references: [providerDueDiligenceItems.id],
    }),
  })
);
