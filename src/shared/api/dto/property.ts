import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { properties } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const propertyDto = createSelectSchema(properties, {
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  street: true,
  unit: true,
  platformAddress: true,
  homeImage: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
});

export const propertySummaryDto = propertyDto.pick({
  id: true,
  street: true,
  unit: true,
  platformAddress: true,
  homeImage: true,
});

export type PropertyDto = z.infer<typeof propertyDto>;
export type PropertySummaryDto = z.infer<typeof propertySummaryDto>;

export type PropertyDTO = PropertyDto;
export type PropertySummaryDTO = PropertySummaryDto;

export function toPropertyDTO(row: z.input<typeof propertyDto>): PropertyDto {
  return propertyDto.parse(row);
}

export function toPropertyDTOs(rows: z.input<typeof propertyDto>[]): PropertyDto[] {
  return rows.map(row => propertyDto.parse(row));
}

export function toPropertySummaryDTO(row: z.input<typeof propertySummaryDto>): PropertySummaryDto {
  return propertySummaryDto.parse(row);
}
