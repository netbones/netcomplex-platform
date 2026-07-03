import { z } from 'zod/v4';
import { maintenanceRequestDto } from './maintenance';

const nullDate = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const maintenanceRequestDetailDto = maintenanceRequestDto.extend({
  user: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })
    .nullable()
    .optional(),
  property: z
    .object({
      id: z.string(),
      street: z.string(),
      unit: z.string(),
    })
    .nullable()
    .optional(),
  assignedTeam: z.unknown().nullable().optional(),
  assignedProvider: z.unknown().nullable().optional(),
});

export type MaintenanceRequestDetailDto = z.infer<typeof maintenanceRequestDetailDto>;
