// ── Shim: re-exports from shared/api/dto (ADR-024) ──
export { maintenanceRequestDto, maintenanceSummaryDto } from '@/shared/api/dto/maintenance';
export type { MaintenanceRequestDto, MaintenanceSummaryDto } from '@/shared/api/dto/maintenance';

// Locally defined schemas not yet in shared/api/dto
import { z } from 'zod/v4';
import { maintenanceRequestDto } from '@/shared/api/dto/maintenance';

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
