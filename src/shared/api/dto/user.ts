import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { users } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const userDto = createSelectSchema(users, {
  email: z.string().optional(),
  phone: z.string().nullable().optional(),
  avatar: z.string().nullable(),
  profileSlug: z.string().nullable().optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  name: true,
  email: true,
  image: true,
  avatar: true,
  role: true,
  isActive: true,
  isPublic: true,
  profileSlug: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
});

export const userSummaryDto = userDto.pick({
  id: true,
  name: true,
  image: true,
  role: true,
  profileSlug: true,
});

export type UserDto = z.infer<typeof userDto>;
export type UserSummaryDto = z.infer<typeof userSummaryDto>;

export type UserDTO = UserDto;
export type UserSummaryDTO = UserSummaryDto;

export function toUserDTO(row: z.input<typeof userDto>): UserDto {
  return userDto.parse(row);
}

export function toUserDTOs(rows: z.input<typeof userDto>[]): UserDto[] {
  return rows.map(row => userDto.parse(row));
}

export function toUserSummaryDTO(row: z.input<typeof userSummaryDto>): UserSummaryDto {
  return userSummaryDto.parse(row);
}
