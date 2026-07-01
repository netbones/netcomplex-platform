import { pgEnum } from 'drizzle-orm/pg-core';

export const achievementCategoryEnum = pgEnum('AchievementCategory', ['ENGAGEMENT', 'CONTRIBUTION', 'MILESTONE']);