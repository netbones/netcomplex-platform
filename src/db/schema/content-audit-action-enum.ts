import { pgEnum } from 'drizzle-orm/pg-core';

export const contentAuditActionEnum = pgEnum('ContentAuditAction', ['CREATED', 'UPDATED', 'PUBLISHED', 'UNPUBLISHED', 'FLAGGED', 'DELETED', 'RESTORED']);