1. DATABASE SCHEMA: TWO DISTINCT BOOKING MODELS
   Facility Booking (Booking model)
   Prisma: prisma/schema/schema.prisma line 943  
   Drizzle: src/db/schema/bookings.ts
   Field Type Notes
   id String (PK) UUID
   tenantId String (FK → Tenant) Multi-tenant isolation
   propertyId String? (FK → Property) Optional property link
   userId String (FK → user) Creator
   facility String Free-form facility name (tenant-configurable, not an enum)
   date DateTime Booking date
   startTime String HH:MM format
   endTime String HH:MM format
   purpose String? Optional description
   status BookingStatus enum CONFIRMED / CANCELLED / COMPLETED
   createdAt/updatedAt/deletedAt timestamps Standard audit fields
   Drizzle relations (src/db/schema/bookings-relations.ts): bookings → property, bookings → Tenant, bookings → user.
   Drizzle enum (src/db/schema/booking-status-enum.ts): BookingStatus = CONFIRMED | CANCELLED | COMPLETED
   Service Booking (ServiceBooking model)
   Prisma: prisma/schema/schema.prisma line 287  
   Drizzle: src/db/schema/service-bookings.ts
   Field Type Notes
   id String (PK) UUID
   tenantId String (FK → Tenant) Multi-tenant isolation
   listingId String (FK → CommunityServiceListing) The service being booked
   providerId String (FK → ServiceProvider) Service provider
   userId String (FK → user) Resident making the booking
   date DateTime (@db.Date) Booking date
   startTime String HH:MM
   endTime String HH:MM
   price Decimal? From listing
   platformFee Decimal? Calculated platform fee
   paymentStatus BookingPaymentStatus enum PENDING / COMPLETED / REFUNDED
   status ServiceBookingStatus enum PENDING_CONFIRMATION / CONFIRMED / COMPLETED / CANCELLED
   createdAt/updatedAt/deletedAt timestamps Standard
   Drizzle relations (src/db/schema/service-bookings-relations.ts): serviceBookings → listing, → provider, → Tenant, → user.
   Key enums:

- ServiceBookingStatus: PENDING_CONFIRMATION | CONFIRMED | COMPLETED | CANCELLED
- BookingPaymentStatus: PENDING | COMPLETED | REFUNDED

2. EXISTING API ROUTES
   Facility Bookings — REST API

- /api/bookings (src/app/api/bookings/route.ts, 184 lines)
- GET — List bookings (residents see own, admins see all), supports ?facility=&date= filters, feature-gated via assertModuleEnabled('bookings')
- POST — Create a facility booking, validates via Zod bookingSchema, validates facility against tenant config, creates with status CONFIRMED
- /api/admin/bookings (src/app/api/admin/bookings/route.ts, 70 lines)
- GET — Admin: get tenant facilities
- PUT — Admin: update tenant facilities (persisted in settings table as booking_facilities key)
  Facility Bookings — tRPC Router
- src/server/routers/bookings.ts (276 lines) — bookingsRouter with 6 procedures:
- listFacilities — GET tenant facilities
- getFacility — GET single facility detail
- listBookings — GET bookings with filtering (facility, date, "today")
- getBooking — GET single booking by ID
- createBooking — POST create booking (rate-limited, facility validation, revalidates dashboard, emits event)
- cancelBooking — POST cancel a booking (status transition to CANCELLED)
  Service Bookings — tRPC Router
- src/server/routers/marketplace/service-bookings.ts (290 lines) — serviceBookingProcedures with 4 procedures:
- listServiceBookings — GET with role filter (resident/provider), LEFT JOIN with listings + users
- createServiceBooking — POST with listing validation, conflict check, platform fee calculation
- getServiceBooking — GET single booking
- cancelServiceBooking — POST cancel with status transition validation

3. ENTITY LAYER (@entities/booking/)
   Files:
   File Purpose
   model/types.ts TypeScript interfaces: Booking, BookingFormData, BookingListItem, BookingCreateInput, TenantFacility, BookingStatus
   model/constants.ts 15 preset facilities, 5 default facilities, status colors, legacy facility maps
   schema.ts Zod validation schema: bookingSchema with date/time validation, start < end, no past dates
   services/index.ts Server-side services: getTenantFacilities(), validateFacility(), buildBookingConditions(), listBookings(), createBooking()
   api/route.ts Thin wrapper that re-exports service functions with DTO transformation
   dto/index.ts Re-exports DTO from @api/server
   permissions/index.ts canViewAllBookings(role) permission helper
   index.ts Public client barrel (types, constants, schema, UI components)
   index.server.ts Server-only barrel (services — per ADR-020)
   UI Components:
   Component File Purpose
   FacilityBadge ui/FacilityBadge.tsx Inline pill showing facility label
   StatusBadge ui/StatusBadge.tsx Color-coded status pill (CONFIRMED=green, CANCELLED=red, COMPLETED=gray)
   BookingCard ui/BookingCard.tsx Card showing facility, status, date, time, purpose
4. FEATURE LAYER (@features/booking/)
   File Purpose
   ui/BookingForm.tsx Full booking form — facility dropdown (fetched from tenant settings), date picker (native HTML <input type="date">), start/end time inputs, purpose textarea. Submits to /api/bookings.
   model/useBookings.ts Custom hook wrapping createBooking logic with loading/error state
   index.ts Exports useBookings + BookingForm
5. PAGE MODULE (@page-modules/booking/)
   File Purpose
   ui/BookingsPage.tsx Main bookings page — toggles between "View My Bookings" (table: facility, date, time, status) and "New Booking" (renders BookingForm). Fetch from /api/bookings.
   index.ts Exports BookingsPage
6. EXISTING CALENDAR/DATE-PICKER COMPONENTS
   Marketplace DatePicker (exists, done)

- src/entities/marketplace/ui/DatePicker.tsx (102 lines) — Custom date picker built with Tailwind CSS grid per D-10. Month navigation (← →), day-of-week headers, day cells. Greys out unavailable days, highlights available days with bg-soralia-primary/10, ring on selected date, disables past dates. Parses availability JSONB to determine which weekdays have slots.
  Marketplace TimeSlotGrid (exists, done)
- src/entities/marketplace/ui/TimeSlotGrid.tsx (125 lines) — Generates 30-minute slots from availability ranges for a selected date. Marks booked slots as disabled (grey + line-through). Back button. Responsive grid layout.
  Marketplace BookingBottomSheet (exists, done)
- src/entities/marketplace/ui/BookingBottomSheet.tsx (147 lines) — 3-step progressive bottom sheet: date → time → confirm. Step indicator dots. Backdrop overlay. iOS safe-area support. Uses DatePicker, TimeSlotGrid, and CheckoutSummary.
  CheckoutSummary (exists, done)
- src/entities/marketplace/ui/CheckoutSummary.tsx (101 lines) — Price breakdown (service price + platform fee), Paystack/PayPal payment buttons, booking details display.
  Facility Booking Calendar: DOES NOT EXIST
- Phase 07 (facility-booking) planned BookingCalendar.tsx but this file was never created. The facility booking form uses a plain <input type="date"> with no calendar overview, no time-slot grid, and no visual availability display.

7. PLANNING DIRECTORY (/.planning/)
   Phase 07 — Facility Booking (COMPLETE, M0)

- phases/07-facility-booking/07-01-PLAN.md: Originally planned BookingCalendar.tsx with calendar view + availability. The objective was: "Feature flag gated, tenant-configurable, with calendar view and external API hooks."
- Status: The CRUD API was built and works, but the calendar view was never implemented. The BookingCalendar.tsx artifact was not created.
  Phase 50 — Service Marketplace (IN PROGRESS, M5b)
- phases/50-service-marketplace/50-CONTEXT.md: Defines the overall phase — notification system, payment checkout, booking calendar, mobile UX. BD tickets: gtm, cp8, qx7, 4vk.
- Decision D-09: Provider-defined availability via CommunityServiceListing.availability JSONB. Schema contract: { monday: [{ start: "09:00", end: "17:00" }], ... }.
- Decision D-10: Custom date picker + time-slot grid — NO external calendar library.
- Decision D-11: Book-first-then-pay flow.
- Decision D-12: Separate ServiceBooking model (not conflated with facility Booking).
- BD ticket qx7 (.planning/BD.md line 145): "Phase 5: Booking calendar integration" — status OPEN.
  Plan 50-03 — Booking Calendar System (COMPLETE)
- phases/50-service-marketplace/50-03-PLAN.md (389 lines): Detailed implementation plan for:
- ServiceBooking CRUD API + availability endpoint
- Custom DatePicker + TimeSlotGrid components
- BookingBottomSheet 3-step flow + MarketplaceDetailPage scaffold
- phases/50-service-marketplace/50-03-SUMMARY.md: Confirms completion. "28 tests passing across 4 test files." All artifacts were created. "Service booking calendar system complete and tested."
  Other Related Phases
- Phase 35: API alignment — created booking DTO, moved bookingSchema to entity ownership
- Phase 44: FSD hardening — identified 9 cross-imports from entities/tenant (including booking)
- Phase 38: Services space layer — bookings counted in urgency API, shown as domain card

8. THE GAP ANALYSIS
   What exists for FACILITY bookings (community amenities):
   Capability Status
   Database model Complete — Booking table
   CRUD API (REST + tRPC) Complete — create, list, get, cancel
   Booking form Complete — HTML date input, time inputs, facility dropdown
   Facility configuration Complete — tenant-configurable via onboarding/settings
   Feature gating Complete — assertModuleEnabled('bookings')
   Calendar view MISSING — planned in Phase 07, never built
   Time-slot grid MISSING — only plain time inputs exist
   Conflict detection MISSING — no double-booking prevention
   Availability overview MISSING — no way to see what's booked on a given day
   What exists for SERVICE bookings (marketplace):
   Capability Status
   Database model Complete — ServiceBooking table
   CRUD API (tRPC) Complete — list, create, get, cancel
   Custom DatePicker Complete — Tailwind grid, availability-aware
   TimeSlotGrid Complete — 30-min slots, booked-slot detection
   BookingBottomSheet Complete — 3-step flow (date→time→confirm)
   CheckoutSummary Complete — price breakdown, payment buttons
   Conflict detection Complete — returns 409 CONFLICT
   Availability endpoint Complete — GET /api/services/[id]/availability
   MarketplaceDetailPage Complete — scaffold with "Book Now" CTA
   The gap: "Booking calendar integration" (BD-qx7)
   The Phase 50-03 SUCCESSFULLY implemented a full booking calendar system — but only for Service (marketplace) bookings. The facility booking system (community amenities: pools, gyms, BBQ areas, etc.) still has no calendar view, no time-slot grid, no conflict detection, and no availability visualization.
   Based on the planning documents, "booking calendar integration" most likely refers to:
1. Bringing calendar UX parity to facility bookings — Replicating the DatePicker + TimeSlotGrid pattern built for marketplace bookings into the facility booking flow. The facility BookingForm currently uses raw <input type="date"> and <input type="time"> with no visual calendar.
1. Adding conflict/double-booking prevention for facility bookings — The ServiceBooking API has 409 CONFLICT detection; the facility Booking API has none.
1. A unified calendar view — A single view showing all facility bookings for a date/week (potentially across all facilities), similar to what was described in Phase 07's original plan: "Users see calendar with availability."
1. Potential: a dashboard widget — The dashboard has upcomingBookings in the Services urgency API. A full calendar widget showing facility booking availability would be a natural expansion.
   Key files that would need modification:

- /src/entities/booking/ui/ — New BookingCalendar.tsx component
- /src/features/booking/ui/BookingForm.tsx — Replace native date input with custom DatePicker
- /src/app/api/bookings/route.ts — Add conflict detection
- /src/entities/booking/services/index.ts — Add availability queries
- /src/page-modules/booking/ui/BookingsPage.tsx — Integrate calendar view toggle
- Potentially new src/app/api/bookings/availability/route.ts — Availability endpoint for facilities
