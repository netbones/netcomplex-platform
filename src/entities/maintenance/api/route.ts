import * as maintenanceService from '../services';
import { createId } from '@shared/lib/id';

/**
 * Lists maintenance requests for a tenant with optional filtering.
 * Includes team and provider assignment details for admin view.
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

  return maintenanceService.toMaintenanceRequestViewList(
    results,
    params.canViewAll ? 'all' : 'mine',
    params.search
  );
}

/**
 * Creates a new maintenance request with ticket number generation.
 */
export async function createMaintenanceRequest(data: {
  tenantId: string;
  userId: string;
  propertyId: string | null;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  description: string;
  images?: string[];
  preferredDate?: string | null;
  preferredTime?: string | null;
}) {
  const [request] = await maintenanceService.createMaintenanceRequest({
    id: createId(),
    tenantId: data.tenantId,
    userId: data.userId,
    propertyId: data.propertyId,
    category: data.category,
    priority: data.priority,
    description: data.description,
    images: data.images || [],
    preferredDate: data.preferredDate || null,
    preferredTime: data.preferredTime || null,
  });

  return request;
}
