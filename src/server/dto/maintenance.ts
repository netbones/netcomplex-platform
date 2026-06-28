import { z } from 'zod';

const dateSchema = z.date().transform(d => d.toISOString());

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
  scheduledDate: dateSchema.nullable(),
  estimatedCost: z.number().nullable(),
  actualCost: z.number().nullable(),
  resolution: z.string().nullable(),
  completedAt: dateSchema.nullable(),
  ticketNumber: z.string(),
  preferredDate: dateSchema.nullable(),
  preferredTime: z.string().nullable(),
  routingType: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

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

export type MaintenanceRequestDto = z.infer<typeof maintenanceRequestDto>;
export type MaintenanceRequestDetailDto = z.infer<typeof maintenanceRequestDetailDto>;
