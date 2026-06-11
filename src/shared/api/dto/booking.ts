import type { InferSelectModel } from 'drizzle-orm';
import { bookings } from '../db';

// API-safe booking shape
export interface BookingDTO {
  id: string;
  propertyId: string | null;
  userId: string;
  facility: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Maps a Drizzle booking row to BookingDTO
export function toBookingDTO(booking: InferSelectModel<typeof bookings>): BookingDTO {
  return {
    id: booking.id,
    propertyId: booking.propertyId || null,
    userId: booking.userId,
    facility: booking.facility,
    date: booking.date?.toISOString() ?? new Date().toISOString(),
    startTime: booking.startTime,
    endTime: booking.endTime,
    purpose: booking.purpose || null,
    status: booking.status,
    createdAt: booking.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: booking.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps an array of Drizzle booking rows to BookingDTO[]
export function toBookingDTOs(bookingRows: InferSelectModel<typeof bookings>[]): BookingDTO[] {
  return bookingRows.map(toBookingDTO);
}
