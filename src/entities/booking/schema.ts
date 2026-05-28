import { z } from 'zod';

/**
 * Zod schema for facility booking form validation.
 * @property facility - Facility to book
 * @property date - Booking date
 * @property startTime - Start time
 * @property endTime - End time
 * @property purpose - Purpose of booking (optional, max 500 chars)
 */
export const bookingSchema = z
  .object({
    facility: z.string().min(1, 'Facility is required'),
    date: z
      .string()
      .min(1, 'Date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startTime: z
      .string()
      .min(1, 'Start time is required')
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM 24-hour format'),
    endTime: z
      .string()
      .min(1, 'End time is required')
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM 24-hour format'),
    purpose: z.string().max(500, 'Purpose too long').trim().optional().default(''),
  })
  .refine(data => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })
  .refine(
    data => {
      const today = new Date().toISOString().split('T')[0];
      return data.date >= today;
    },
    { message: 'Cannot book for past dates', path: ['date'] }
  );

export type BookingFormData = z.infer<typeof bookingSchema>;
