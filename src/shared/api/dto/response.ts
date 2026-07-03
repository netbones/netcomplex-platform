import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { responses } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const responseDto = createSelectSchema(responses, {
  createdAt: dateSch,
}).pick({
  id: true,
  surveyId: true,
  userId: true,
  answers: true,
  createdAt: true,
});

export type ResponseDto = z.infer<typeof responseDto>;
