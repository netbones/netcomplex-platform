import { z } from 'zod';

/**
 * Zod schema for survey form validation.
 */
export const surveySchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
    description: z.string().max(1000, 'Description too long').trim().optional().default(''),
    questions: z
      .array(
        z.object({
          id: z.string().optional(),
          text: z.string().min(1, 'Question text is required').max(500),
          type: z.enum(['TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE']),
          options: z.array(z.string()).optional(),
          required: z.boolean().default(false),
          order: z.number().int().nonnegative(),
        })
      )
      .min(1, 'At least one question is required'),
    expiresAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiration date must be YYYY-MM-DD')
      .optional(),
    allowMultipleResponses: z.boolean().default(false),
    showResults: z.boolean().default(true),
  })
  .refine(data => !data.expiresAt || data.expiresAt >= new Date().toISOString().split('T')[0], {
    message: 'Expiration date cannot be in the past',
    path: ['expiresAt'],
  });

export type SurveyFormData = z.infer<typeof surveySchema>;
