import { pgEnum } from 'drizzle-orm/pg-core';

export const disputeCategoryEnum = pgEnum('DisputeCategory', [
  'NOISE',
  'PETS',
  'PARKING',
  'BOUNDARIES',
  'COMMON_PROPERTY',
  'LEVY_DISPUTE',
  'RULE_ENFORCEMENT',
  'GOVERNANCE',
  'CONDUCT',
  'DAMAGE',
  'OTHER',
]);
