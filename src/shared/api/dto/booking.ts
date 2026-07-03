import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { bookings } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const bookingDto = createSelectSchema(bookings, {
  date: dateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  propertyId: true,
  userId: true,
  facility: true,
  date: true,
  startTime: true,
  endTime: true,
  purpose: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export type BookingDto = z.infer<typeof bookingDto>;
export type BookingDTO = BookingDto;

export function toBookingDTO(row: z.input<typeof bookingDto>): BookingDto {
  return bookingDto.parse(row);
}

export function toBookingDTOs(rows: z.input<typeof bookingDto>[]): BookingDto[] {
  return rows.map(row => bookingDto.parse(row));
}
