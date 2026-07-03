import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { settings } from '../db';

const dateSch = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const settingDto = createSelectSchema(settings, {
  updatedAt: dateSch,
}).pick({ key: true, value: true });

export type SettingDto = z.infer<typeof settingDto>;
