import type { MaintenanceTeam, ServiceProvider, MaintenanceCategory } from '@entities/maintenance';

export type { MaintenanceTeam, ServiceProvider, MaintenanceCategory };

export interface MaintenanceRequest {
  id: string;
  ticketNumber?: string | null;
  category: string;
  priority: string;
  description: string;
  status: string;
  images: string[];
  assignedTo: string | null;
  assignedTeamId?: string | null;
  assignedProviderId?: string | null;
  assignedTeam?: { id: string; name: string; trade: string } | null;
  assignedProvider?: { id: string; companyName: string; trade: string } | null;
  vendor: string | null;
  scheduledDate: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  resolution: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  preferredDate?: string | null;
  preferredTime?: string | null;
  user: {
    name: string;
    email: string;
    address?: {
      street: string;
      unit: string | null;
    } | null;
  };
}

export interface BoardMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface HistoryEntry {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
  } | null;
}

export interface NoteEntry {
  id: string;
  requestId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
  } | null;
}
