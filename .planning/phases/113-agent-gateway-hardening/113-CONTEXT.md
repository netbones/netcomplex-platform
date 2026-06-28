# Phase 113: Agent Gateway Hardening — Context

**Gathered:** 2026-06-28
**Status:** Ready for planning
**Source:** Phase 111 VERIFICATION.md + ADDENDUM.md residual items

<domain>
## Phase Boundary

Close out the deferred and incomplete items from Phase 111 (agent-gateway) that were flagged during verification. This is a hardening phase — no new features, no API changes, no schema additions.

Three work items remain:

1. **Register DelegationWidget in widget registry** — Phase 111 built the `DelegationWidget` and `DelegationAuditLog` components in `src/widgets/delegation/` but never added them to the widget registry (`src/widgets/dashboard/model/widgets.ts`). Without registration, the widget is unreachable from any dashboard Space.

2. **Apply formal Prisma migration** — Phase 111 Plan 05 added a `MaintenanceRouting` enum and `routingType`/`landlordId` fields to `MaintenanceRequest` but only used `prisma db push`. A formal `prisma migrate dev` run is needed for proper migration tracking. This also surfaces a pre-existing shadow database issue with migration `20260624000000_add_user_role_and_seat_lifecycle`.

3. ~~**Fix 5 TypeScript type errors**~~ — RESOLVED. The cleanup subagent (commit `4f81f05f`) applied fixes for all 5 implementation-file TS errors. Confirmed: 14 remaining errors are all pre-existing tRPC router issues outside Phase 111 scope.
   </domain>

<decisions>
## Implementation Decisions

### Widget Registration

- **D-01:** Widget should be registered as `delegations` with name "My Delegations"
- **D-02:** Assigned to `home` Space (the resident dashboard where property owners manage their delegations)
- **D-03:** Use `UserCheck` icon from lucide-react (consistent with delegation/user-verification theme)
- **D-04:** Category: `core`. No feature flag — this is a core platform feature
- **D-05:** Default size: 3x3 (medium widget). Min size: 1x2
- **D-06:** No special permissions required — visibility is scoped to authenticated users; the widget itself handles authorization (shows only delegations relevant to the current user)

### Prisma Migration

- **D-07:** Run `npx prisma migrate dev --name add_maintenance_routing_fields` to create a formal migration for the `MaintenanceRouting` enum + `routingType`/`landlordId` fields
- **D-08:** If shadow DB issue blocks `prisma migrate dev`, work around it by applying the migration SQL directly and using `prisma migrate resolve --applied`
- **D-09:** Do NOT fix the pre-existing shadow DB issue (`20260624000000_add_user_role_and_seat_lifecycle`) — that's inherited technical debt from a prior phase, out of scope for this hardening pass
- **D-10:** After migration, run `npx prisma generate` to refresh the Drizzle schema sync

### Quality Gates

- **D-11:** `pnpm tsc --noEmit` must show same or fewer errors than before (currently 14, all pre-existing tRPC)
- **D-12:** `pnpm lint` must show 0 new ESLint errors (currently 0 errors, 51 warnings)
- **D-13:** `npx prisma validate` must pass
  </decisions>

<canonical_refs>

## Canonical References

- `.planning/phases/111-agent-gateway/111-VERIFICATION.md` — source of truth for remaining gaps
- `.planning/phases/111-agent-gateway/ADDENDUM.md` — widget registry gap documented
- `.planning/phases/111-agent-gateway/111-04-SUMMARY.md` — DelegationWidget implementation details
- `.planning/phases/111-agent-gateway/111-05-SUMMARY.md` — MaintenanceRouting schema changes
- `src/widgets/dashboard/model/widgets.ts` — widget registry (target file for D-01–D-06)
- `src/widgets/delegation/DelegationWidget.tsx` — widget component to register
- `src/widgets/delegation/DelegationAuditLog.tsx` — audit log component
- `prisma/schema.prisma` — MaintenanceRouting enum, MaintenanceRequest model
- `prisma/migrations/` — migration history
  </canonical_refs>

<artifacts_to_modify>

- `src/widgets/dashboard/model/widgets.ts` — add DelegationWidget registration
- `prisma/migrations/` — new migration directory
  </artifacts_to_modify>

<success_criteria>

- DelegationWidget registered in widget registry with id `delegations`, assigned to `home` Space
- Formal Prisma migration applied for MaintenanceRouting enum + routingType/landlordId fields
- `npx prisma validate` passes
- `pnpm tsc --noEmit` shows ≤ 14 errors (no new type errors)
- `pnpm lint` shows 0 new ESLint errors
  </success_criteria>
