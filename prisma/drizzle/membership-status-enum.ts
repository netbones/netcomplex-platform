import { pgEnum } from 'drizzle-orm/pg-core';

export const membershipStatusEnum = pgEnum('MembershipStatus', ['PENDING', 'APPROVED', 'REJECTED']);
