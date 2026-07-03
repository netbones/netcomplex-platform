import { z } from 'zod/v4';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullableDateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const maintenanceRequestDto = z.object({
  id: z.string(),
  propertyId: z.string().nullable(),
  userId: z.string(),
  category: z.string(),
  priority: z.string(),
  description: z.string(),
  status: z.string(),
  images: z.array(z.string()),
  assignedTo: z.string().nullable(),
  vendor: z.string().nullable(),
  scheduledDate: nullableDateSchema,
  estimatedCost: z.number().nullable(),
  actualCost: z.number().nullable(),
  resolution: z.string().nullable(),
  completedAt: nullableDateSchema,
  ticketNumber: z.string(),
  preferredDate: nullableDateSchema,
  preferredTime: z.string().nullable(),
  assignedTeamId: z.string().nullable(),
  assignedProviderId: z.string().nullable(),
  routingType: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const maintenanceSummaryDto = maintenanceRequestDto.pick({
  id: true,
  category: true,
  priority: true,
  status: true,
  createdAt: true,
  ticketNumber: true,
});

export type MaintenanceRequestDto = z.infer<typeof maintenanceRequestDto>;
export type MaintenanceSummaryDto = z.infer<typeof maintenanceSummaryDto>;

export type MaintenanceRequestDTO = MaintenanceRequestDto;
export type MaintenanceSummaryDTO = MaintenanceSummaryDto;

export function toMaintenanceRequestDTO(
  row: z.input<typeof maintenanceRequestDto>
): MaintenanceRequestDto {
  return maintenanceRequestDto.parse(row);
}

export function toMaintenanceRequestDTOs(
  rows: z.input<typeof maintenanceRequestDto>[]
): MaintenanceRequestDto[] {
  return rows.map(row => maintenanceRequestDto.parse(row));
}

export function toMaintenanceSummaryDTO(
  row: z.input<typeof maintenanceSummaryDto>
): MaintenanceSummaryDto {
  return maintenanceSummaryDto.parse(row);
}
