import type { InferSelectModel } from 'drizzle-orm';
import { maintenanceRequests } from '@api/db';

// API-safe maintenance request shape
export interface MaintenanceRequestDTO {
  id: string;
  propertyId: string | null;
  userId: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  images: string[];
  assignedTo: string | null;
  vendor: string | null;
  scheduledDate: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  resolution: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // New fields for ticketing system
  ticketNumber: string;
  preferredDate: string | null;
  preferredTime: string | null;
  assignedTeamId: string | null;
  assignedProviderId: string | null;
}

// Lightweight maintenance summary for dashboard lists
export interface MaintenanceSummaryDTO {
  id: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  ticketNumber: string;
}

// Maps a Drizzle maintenance request row to MaintenanceRequestDTO
export function toMaintenanceRequestDTO(
  mr: InferSelectModel<typeof maintenanceRequests>
): MaintenanceRequestDTO {
  return {
    id: mr.id,
    propertyId: mr.propertyId || null,
    userId: mr.userId,
    category: mr.category,
    priority: mr.priority,
    description: mr.description,
    status: mr.status,
    images: mr.images || [],
    assignedTo: mr.assignedTo || null,
    vendor: mr.vendor || null,
    scheduledDate: mr.scheduledDate?.toISOString() ?? null,
    estimatedCost: mr.estimatedCost || null,
    actualCost: mr.actualCost || null,
    resolution: mr.resolution || null,
    completedAt: mr.completedAt?.toISOString() ?? null,
    createdAt: mr.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: mr.updatedAt?.toISOString() ?? new Date().toISOString(),
    // New fields
    ticketNumber: mr.ticketNumber || '',
    preferredDate: mr.preferredDate?.toISOString()?.split('T')[0] ?? null,
    preferredTime: mr.preferredTime || null,
    assignedTeamId: mr.assignedTeamId || null,
    assignedProviderId: mr.assignedProviderId || null,
  };
}

// Maps an array of Drizzle maintenance request rows to MaintenanceRequestDTO[]
export function toMaintenanceRequestDTOs(
  mrs: InferSelectModel<typeof maintenanceRequests>[]
): MaintenanceRequestDTO[] {
  return mrs.map(toMaintenanceRequestDTO);
}

// Maps a Drizzle maintenance request row to MaintenanceSummaryDTO
export function toMaintenanceSummaryDTO(
  mr: InferSelectModel<typeof maintenanceRequests>
): MaintenanceSummaryDTO {
  return {
    id: mr.id,
    category: mr.category,
    priority: mr.priority,
    status: mr.status,
    createdAt: mr.createdAt?.toISOString() ?? new Date().toISOString(),
    ticketNumber: mr.ticketNumber || '',
  };
}
