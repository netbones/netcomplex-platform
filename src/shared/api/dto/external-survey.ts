import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { externalSurveys } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const externalSurveyDto = createSelectSchema(externalSurveys, {
  createdAt: dateSch,
}).pick({ id: true, isActive: true, createdAt: true });

export type ExternalSurveyDto = z.infer<typeof externalSurveyDto>;
