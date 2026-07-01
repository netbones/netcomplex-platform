import { pgEnum } from 'drizzle-orm/pg-core';

export const delegationStatusEnum = pgEnum('DelegationStatus', ['PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED']);