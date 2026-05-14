import { pgEnum } from 'drizzle-orm/pg-core';

export const serviceCategoryEnum = pgEnum('ServiceCategory', [
  'GARDENING',
  'MAINTENANCE',
  'PLUMBING',
  'ELECTRICAL',
  'CLEANING',
  'SECURITY',
  'PEST_CONTROL',
  'APPLIANCE_REPAIR',
  'OTHER',
]);
