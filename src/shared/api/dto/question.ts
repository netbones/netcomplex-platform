import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { questions } from '../db';

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

export type QuestionDto = z.infer<typeof questionDto>;
