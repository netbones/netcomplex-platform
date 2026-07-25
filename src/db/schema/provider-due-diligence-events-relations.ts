import { relations } from 'drizzle-orm';
import { providerDueDiligenceEvents } from './provider-due-diligence-events';
import { providerDueDiligenceWorkflows } from './provider-due-diligence-workflows';

export const providerDueDiligenceEventsRelations = relations(
  providerDueDiligenceEvents,
  helpers => ({
    workflow: helpers.one(providerDueDiligenceWorkflows, {
      relationName: 'ProviderDueDiligenceEventToProviderDueDiligenceWorkflow',
      fields: [providerDueDiligenceEvents.workflowId],
      references: [providerDueDiligenceWorkflows.id],
    }),
  })
);
