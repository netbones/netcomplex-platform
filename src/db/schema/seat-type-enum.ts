import { pgEnum } from 'drizzle-orm/pg-core';

export const seatTypeEnum = pgEnum('SeatType', ['STANDARD', 'SOLO', 'PREMIUM']);
