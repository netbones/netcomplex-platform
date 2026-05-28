import { db, users, properties } from '@api/db';
import * as maintenanceService from '../services';
import { toMaintenanceRequestDTO } from '@api/dto/maintenance';

/**
 * Lists maintenance requests for a tenant with optional filtering.
 */
export async function listMaintenanceRequests(params: {
  tenantId: string;
  userId: string;
  canViewAll: boolean;
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
}) {
  const results = await maintenanceService.listMaintenanceRequests(params);

  // Transform results using DTO
  let transformed = results.map(row => {
    const mr = row.MaintenanceRequest;
    const u = row.user;
    const prop = row.property;

    const address = prop ? { street: prop.street, unit: prop.unit } : null;

    return {
      ...toMaintenanceRequestDTO(mr),
      user: u
        ? {
            name: u.name,
            email: u.email,
            address: address,
          }
        : null,
    };
  });

  // Apply search filter in memory (on DTO-transformed data)
  if (params.search && params.canViewAll) {
    const searchLower = params.search.toLowerCase();
    transformed = transformed.filter(
      t =>
        t.description?.toLowerCase().includes(searchLower) ||
        t.user?.name?.toLowerCase().includes(searchLower) ||
        t.user?.email?.toLowerCase().includes(searchLower) ||
        t.user?.address?.street?.toLowerCase().includes(searchLower) ||
        t.user?.address?.unit?.toLowerCase().includes(searchLower) ||
        t.category?.toLowerCase().includes(searchLower)
    );
  }

  return transformed;
}

/**
 * Creates a new maintenance request.
 */
export async function createMaintenanceRequest(data: {
  tenantId: string;
  userId: string;
  propertyId: string | null;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  description: string;
  images?: string[];
}) {
  const [request] = await maintenanceService.createMaintenanceRequest({
    id: crypto.randomUUID(),
    tenantId: data.tenantId,
    userId: data.userId,
    propertyId: data.propertyId,
    category: data.category,
    priority: data.priority,
    description: data.description,
    images: data.images || [],
  });

  return request;
}
