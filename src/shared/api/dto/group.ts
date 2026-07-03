import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { groups } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const groupDto = createSelectSchema(groups, {
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  name: true,
  description: true,
  category: true,
  image: true,
  color: true,
  isPublic: true,
  accessType: true,
  residentFilter: true,
  isActive: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
});

export const groupDetailDto = groupDto.extend({
  memberCount: z.number().optional(),
});

export type GroupDto = z.infer<typeof groupDto>;
export type GroupDetailDto = z.infer<typeof groupDetailDto>;

export type GroupDTO = GroupDto;
export type GroupDetailDTO = GroupDetailDto;

export function toGroupDTO(row: z.input<typeof groupDto>): GroupDto {
  return groupDto.parse(row);
}

export function toGroupDTOs(rows: z.input<typeof groupDto>[]): GroupDto[] {
  return rows.map(row => groupDto.parse(row));
}
