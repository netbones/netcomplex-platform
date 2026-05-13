import { pgTable, text } from 'drizzle-orm/pg-core';

export const propertiesTopremiumSeats = pgTable('_PremiumSeatPortfolio', { A: text('A').notNull(), B: text('B').notNull() });