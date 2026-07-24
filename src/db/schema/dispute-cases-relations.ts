import { relations } from 'drizzle-orm';
import { disputeCases } from './dispute-cases';
import { tenants } from './tenants';
import { users } from './users';
import { disputeEvents } from './dispute-events';
import { disputeEvidences } from './dispute-evidences';
import { disputeMessages } from './dispute-messages';
import { disputeNotifications } from './dispute-notifications';

export const disputeCasesRelations = relations(disputeCases, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'DisputeCaseToTenant', fields: [ disputeCases.tenantId ], references: [ tenants.id ] }), assignedModerator: helpers.one(users, { relationName: 'DisputeModerator', fields: [ disputeCases.assignedModeratorId ], references: [ users.id ] }), closedBy: helpers.one(users, { relationName: 'DisputeClosedBy', fields: [ disputeCases.closedById ], references: [ users.id ] }), complainant: helpers.one(users, { relationName: 'DisputeComplainant', fields: [ disputeCases.complainantId ], references: [ users.id ] }), respondent: helpers.one(users, { relationName: 'DisputeRespondent', fields: [ disputeCases.respondentId ], references: [ users.id ] }), events: helpers.many(disputeEvents, { relationName: 'DisputeCaseToDisputeEvent' }), evidence: helpers.many(disputeEvidences, { relationName: 'DisputeCaseToDisputeEvidence' }), mediationThread: helpers.many(disputeMessages, { relationName: 'DisputeCaseToDisputeMessage' }), notifications: helpers.many(disputeNotifications, { relationName: 'DisputeCaseToDisputeNotification' }) }));