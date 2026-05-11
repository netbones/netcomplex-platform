export interface MaintenanceRequest {
  id: string;
  category: string;
  priority: MaintenancePriority;
  description: string;
  status: MaintenanceStatus;
  createdAt: string;
  images?: string[];
}

export interface MaintenanceRequestForm {
  category: string;
  priority: MaintenancePriority;
  description: string;
  images: string[];
}

export type MaintenanceStatus =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_PARTS'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
