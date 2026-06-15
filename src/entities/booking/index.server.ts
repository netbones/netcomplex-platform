// Server-only public API barrel for @entities/booking.
// Import from here in API routes, server components, and server-side utilities.
// Client components must use the default barrel (@entities/booking).
//
// See ADR-020 and docs/advisories/ADVISORY-008.md for rationale.

export {
  getTenantFacilities,
  validateFacility,
  buildBookingConditions,
  listBookings,
  createBooking,
} from './services';
