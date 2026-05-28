import { z } from 'zod';

/**
 * Zod schema for maintenance request form validation.
 * @property category - Type of maintenance issue
 * @property priority - Urgency level
 * @property description - Detailed description (10-2000 chars)
 * @property preferredDate - Optional preferred service date
 * @property preferredTime - Optional preferred service time
 */
export const maintenanceRequestSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description cannot exceed 2000 characters')
    .trim(),
  preferredDate: z
    .string()
    .optional()
    .refine(val => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'Date must be in YYYY-MM-DD format',
    }),
  preferredTime: z
    .string()
    .optional()
    .refine(val => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
      message: 'Time must be in HH:MM 24-hour format',
    }),
  images: z.array(z.string().url()).max(5).optional().default([]),
});

export type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;
