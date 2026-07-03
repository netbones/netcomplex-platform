import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { surveys } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const surveyDto = createSelectSchema(surveys, {
  startDate: nullDate,
  endDate: nullDate,
  createdAt: dateSch,
  updatedAt: dateSch,
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

export type SurveyDto = z.infer<typeof surveyDto>;
