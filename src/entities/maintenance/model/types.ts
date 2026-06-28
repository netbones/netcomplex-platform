export interface MaintenanceRequest {
  id: string;
  category: string;
  priority: MaintenancePriority;
  // Description is optional because the community-scoped /maintenance page
  // returns redacted data without it. Admin views and resident own-views
  // always include it.
  description?: string;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt?: string;
  images?: string[];
  ticketNumber?: string;
  preferredDate?: string | null;
  preferredTime?: string | null;
  assignedTeam?: { id: string; name: string; trade: string } | null;
  assignedProvider?: { id: string; companyName: string; trade: string } | null;
  // Submitter info — only present in admin/own views, redacted on /maintenance
  user?: { name: string; email: string; address?: { street: string; unit: string } | null } | null;
}

export interface MaintenanceRequestForm {
  category: string;
  priority: MaintenancePriority;
  description: string;
  images: string[];
  preferredDate?: string;
  preferredTime?: string;
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

export interface MaintenanceTeam {
  id: string;
  name: string;
  trade: string;
  contactName: string | null;
  isActive: boolean;
}

export interface ServiceProvider {
  id: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  trade: string;
  isActive: boolean;
}

export interface MaintenanceCategory {
  id: string;
  value: string;
  label: string;
  description?: string | null;
  isActive: boolean;
}

export interface TicketAssignment {
  team?: { id: string; name: string; trade: string } | null;
  provider?: { id: string; companyName: string; trade: string } | null;
}

export type MaintenanceRoutingType = 'HOA' | 'LANDLORD';

export interface MaintenanceRoutingContext {
  routingType: MaintenanceRoutingType;
  landlordId: string | null;
  reason: string;
}
