Migration Plan (Priority Order)
Phase 1 — Low-hanging fruit (wire existing tRPC to remaining UI)

1. Migrate provider-queries.ts from fetch() to trpc.providers.\*
2. Audit dashboard widgets for REST calls → convert to tRPC
3. Audit admin widgets for REST calls → convert to tRPC
   Phase 2 — Admin tRPC router (new)
4. Create src/server/routers/admin/ with procedures for:

- listBookings, updateBooking, deleteBooking
- CRUD for all entities (achievements, providers, media, etc.)
- Activity log, system health
- Billing/subscription management

5. Register in appRouter
   Phase 3 — Remaining gaps
6. Create dashboardRouter with getStats, getActivity
7. Create accessRouter with gate/context procedures
   Phase 4 — API deprecation
8. Add deprecated: true OpenAPI tags to REST routes that have tRPC equivalents
9. Only keep REST for: payments, uploads, webhooks, health/cron/system, v1 public API
   Phase 5 — Delete REST duplicates
10. Remove legacy REST route files that are 100% covered by tRPC and no UI uses them
    Want me to start executing Phase 1 (wiring provider-queries.ts to tRPC)?
