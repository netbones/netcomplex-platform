import { pgEnum } from 'drizzle-orm/pg-core';

export const disputeStatusEnum = pgEnum('DisputeStatus', ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MEDIATION_OFFERED', 'MEDIATION_ACTIVE', 'MEDIATED_RESOLVED', 'FORMAL_RULING', 'RESOLVED', 'WITHDRAWN', 'ESCALATED_CSOS', 'CSOS_CLOSED']);