// Server-only public API barrel for @entities/amenity/server.
// Import from here in API routes and server-side utilities.
// Client components must use the default barrel (@entities/amenity).

export {
  getActiveAmenitiesCatalog,
  getBookableAmenities,
  getAmenityBookingsForDate,
  getUserAmenityBookings,
  getCalendarMonth,
  getCalendarDayAgenda,
  AMENITY_CATALOG_REVALIDATE_SECONDS,
  AMENITY_AVAILABILITY_REVALIDATE_SECONDS,
} from './server/cache';

export type {
  AmenityBookingSlot,
  UserAmenityBookingRow,
  CalendarMonthPayload,
  CalendarAgendaSlot,
  CalendarAgendaState,
} from './server/cache';
