import { pgEnum } from 'drizzle-orm/pg-core';

export const communityServiceCategoryEnum = pgEnum('CommunityServiceCategory', [
  'TUTORING',
  'PET_CARE',
  'CHILDCARE',
  'TRANSPORT',
  'HEALTH_WELLNESS',
  'TECHNOLOGY',
  'CREATIVE_ARTS',
  'HOME_HELP',
  'LEGAL_FINANCIAL',
  'OTHER',
]);
