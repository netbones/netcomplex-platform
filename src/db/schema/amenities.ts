import { pgTable, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const amenities = pgTable('Amenity', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon').notNull(),
  photoUrl: text('photoUrl'),
  hoursOpen: text('hoursOpen'),
  hoursClose: text('hoursClose'),
  bookable: boolean('bookable').default(true).notNull(),
  contactEnabled: boolean('contactEnabled').default(true).notNull(),
  contactPhone: text('contactPhone'),
  maxOccupancy: integer('maxOccupancy'),
  slotDurationMins: integer('slotDurationMins'),
  rulesText: text('rulesText'),
  waitlistEnabled: boolean('waitlistEnabled').default(false).notNull(),
  sortOrder: integer('sortOrder').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
