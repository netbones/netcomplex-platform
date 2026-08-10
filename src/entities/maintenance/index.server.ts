// Server-only public API barrel for @entities/maintenance.
// Import from here in API routes, server components, and server-side utilities.
// Client components must use the default barrel (@entities/maintenance).
//
// See ADR-020 and docs/advisories/ADVISORY-008.md for rationale.

export {
  formatTicketNumber,
  generateTicketNumber,
  buildMaintenanceConditions,
  listMaintenanceRequests,
  createMaintenanceRequest,
  toMaintenanceRequestViewList,
  notifyResidentStatusChange,
  notifyAdminsNewRequest,
  MAINTENANCE_STATUS_MESSAGES,
  MAINTENANCE_STATUS_SUBJECTS,
  maintenanceStatusMessage,
  maintenanceStatusSubject,
} from './services';

export { resolveRoutingType } from './model/routing';
