import { pgEnum } from 'drizzle-orm/pg-core';

export const seatStatusEnum = pgEnum('SeatStatus', ['ACTIVE', 'ARCHIVED', 'COOLING_OFF']);
