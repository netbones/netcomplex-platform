import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { invitations } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const invitationDto = createSelectSchema(invitations, {
  expiresAt: dateSchema,
  createdAt: dateSchema,
}).pick({
  id: true,
  email: true,
  name: true,
  street: true,
  unit: true,
  residencyType: true,
  role: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  organizationId: true,
  inviterId: true,
});

export type InvitationDto = z.infer<typeof invitationDto>;
export type InvitationDTO = InvitationDto;

export function toInvitationDTO(row: z.input<typeof invitationDto>): InvitationDto {
  return invitationDto.parse(row);
}

export function toInvitationDTOs(rows: z.input<typeof invitationDto>[]): InvitationDto[] {
  return rows.map(row => invitationDto.parse(row));
}
