import { z } from 'zod';

/**
 * Zod schema for checkout request validation.
 */
export const checkoutRequestSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  gateway: z.enum(['paystack', 'paypal']).optional().default('paystack'),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

/**
 * Zod schema for service booking form validation.
 * Reuses patterns from @entities/booking/schema.ts (HH:MM format, startTime < endTime).
 */
export const serviceBookingSchema = z
  .object({
    listingId: z.string().min(1, 'Listing ID is required'),
    date: z
      .string()
      .min(1, 'Date is required')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startTime: z
      .string()
      .min(1, 'Start time is required')
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM 24-hour format'),
    endTime: z
      .string()
      .min(1, 'End time is required')
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM 24-hour format'),
  })
  .refine(data => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export type ServiceBookingFormData = z.infer<typeof serviceBookingSchema>;
