import { pgEnum } from 'drizzle-orm/pg-core';

export const behaviorCategoryEnum = pgEnum('BehaviorCategory', ['COMMUNITY_SERVICE', 'VOLUNTEERISM', 'MAINTENANCE', 'NOISE', 'PARKING', 'SECURITY', 'PETS', 'COMPLIANCE', 'OTHER']);