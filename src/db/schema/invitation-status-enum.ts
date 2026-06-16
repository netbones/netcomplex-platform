import { pgEnum } from 'drizzle-orm/pg-core';

export const invitationStatusEnum = pgEnum('InvitationStatus', ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']);