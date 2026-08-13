import { pgEnum } from 'drizzle-orm/pg-core';

export const gateIntegrationTypeEnum = pgEnum('GateIntegrationType', ['MANUAL', 'THIRD_PARTY_API']);
