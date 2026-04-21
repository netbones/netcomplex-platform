import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { inquiryStatusEnum } from './inquiry-status-enum';

export const communityServiceInquiries = pgTable('communityServiceInquiry', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  listingId: text('listingId').notNull(),
  inquirerId: text('inquirerId').notNull(),
  serviceType: text('serviceType'),
  preferredDate: timestamp('preferredDate', { mode: 'date', precision: 3 }),
  preferredTime: text('preferredTime'),
  location: text('location'),
  description: text('description').notNull(),
  contactMethod: text('contactMethod').default('PLATFORM_MESSAGE').notNull(),
  status: inquiryStatusEnum('status').default('PENDING').notNull(),
  providerResponse: text('providerResponse'),
  respondedAt: timestamp('respondedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
