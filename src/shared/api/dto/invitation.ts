import type { InferSelectModel } from 'drizzle-orm';
import { invitations } from '../db';

// API-safe invitation shape — never exposes token
export interface InvitationDTO {
  id: string;
  email: string;
  name: string;
  street: string | null;
  unit: string | null;
  residentType: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  organizationId: string;
  inviterId: string;
}

// Maps a Drizzle invitation row to InvitationDTO
export function toInvitationDTO(invitation: InferSelectModel<typeof invitations>): InvitationDTO {
  return {
    id: invitation.id,
    email: invitation.email,
    name: invitation.name,
    street: invitation.street || null,
    unit: invitation.unit || null,
    residentType: invitation.residentType,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt?.toISOString() ?? new Date().toISOString(),
    createdAt: invitation.createdAt?.toISOString() ?? new Date().toISOString(),
    organizationId: invitation.organizationId,
    inviterId: invitation.inviterId,
  };
}

// Maps an array of Drizzle invitation rows to InvitationDTO[]
export function toInvitationDTOs(
  invitationRows: InferSelectModel<typeof invitations>[]
): InvitationDTO[] {
  return invitationRows.map(toInvitationDTO);
}
