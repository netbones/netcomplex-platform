import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { surveys } from '@/db/schema/surveys';
import { questions } from '@/db/schema/questions';
import { responses } from '@/db/schema/responses';

const dateSchema = z.date().transform(d => d.toISOString());

export const surveyDto = createSelectSchema(surveys, {
  startDate: dateSchema.nullable(),
  endDate: dateSchema.nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  title: true,
  description: true,
  type: true,
  status: true,
  startDate: true,
  endDate: true,
  config: true,
  createdAt: true,
  updatedAt: true,
});

export const questionDto = createSelectSchema(questions).pick({
  id: true,
  surveyId: true,
  sectionId: true,
  text: true,
  type: true,
  options: true,
  required: true,
  order: true,
  config: true,
});

export const responseDto = createSelectSchema(responses, {
  createdAt: dateSchema,
}).pick({
  id: true,
  surveyId: true,
  userId: true,
  answers: true,
  createdAt: true,
});

export const externalSurveyDto = createSelectSchema(surveys, {
  createdAt: dateSchema,
}).pick({ id: true, isActive: true, createdAt: true });

export type SurveyDto = z.infer<typeof surveyDto>;
export type QuestionDto = z.infer<typeof questionDto>;
export type ResponseDto = z.infer<typeof responseDto>;
export type ExternalSurveyDto = z.infer<typeof externalSurveyDto>;
