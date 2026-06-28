import { z } from 'zod';

const dateSchema = z.date().transform(d => d.toISOString());

export const surveyDto = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  status: z.string(),
  startDate: dateSchema.nullable(),
  endDate: dateSchema.nullable(),
  config: z.unknown().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const questionDto = z.object({
  id: z.string(),
  surveyId: z.string(),
  sectionId: z.string().nullable(),
  text: z.string(),
  type: z.string(),
  options: z.array(z.string()),
  required: z.boolean(),
  order: z.number(),
  config: z.unknown().nullable(),
});

export const responseDto = z.object({
  id: z.string(),
  surveyId: z.string(),
  userId: z.string().nullable(),
  answers: z.unknown(),
  createdAt: dateSchema,
});

export const externalSurveyDto = z.object({
  id: z.string(),
  isActive: z.boolean(),
  createdAt: dateSchema,
});

export type SurveyDto = z.infer<typeof surveyDto>;
export type QuestionDto = z.infer<typeof questionDto>;
export type ResponseDto = z.infer<typeof responseDto>;
export type ExternalSurveyDto = z.infer<typeof externalSurveyDto>;
