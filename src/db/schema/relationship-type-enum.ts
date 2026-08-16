import { pgEnum } from 'drizzle-orm/pg-core';

export const relationshipTypeEnum = pgEnum('RelationshipType', [
  'OWNER_RESIDENT',
  'OWNER_LEASING',
  'TENANT_RENTER',
  'ADDITIONAL_USER',
]);
