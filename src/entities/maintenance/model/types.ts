export interface MaintenanceRequest {
  id: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  createdAt: string;
}

export type MaintenanceStatus = 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
