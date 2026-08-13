import { z } from 'zod';

const contactTypeValues = ['INTERNAL_SECURITY', 'EMERGENCY_SERVICES', 'ARMED_RESPONSE'] as const;

export const securityContactSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(120),
  phone: z
    .string()
    .trim()
    .min(9, 'Phone number is required')
    .max(32)
    .refine(
      val => {
        const digits = val.replace(/\D/g, '');
        return digits.length >= 9 && digits.length <= 15;
      },
      { message: 'Enter a valid phone number' }
    ),
  contactType: z.enum(contactTypeValues),
  isDefaultCallTarget: z.boolean().default(false),
});

export type SecurityContactInput = z.infer<typeof securityContactSchema>;

export const anonymousTipSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(2000),
});

export const panicAlertSchema = z.object({
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  locationAccuracyM: z.number().nullable().optional(),
});

export const alertStatusActionSchema = z.enum(['acknowledge', 'responding', 'resolve']);
