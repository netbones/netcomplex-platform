---
phase: 47-dwallet-planning-build
type: plan-then-execute
status: planning
created: 2026-06-04
revised: 2026-06-25
revised-reason: Value Ledger architecture — added TransactionSource enum + sourceType on WalletTransaction for forward-compatibility with future value sources (Phase 45 Merits, Phase 104 AI). Five enums total (was four).
milestone: M5b (anchor tenant launch — flagship feature)
priority: P1 (launch-blocking, on the critical path with Community Merits, MyHomeSpace, OTP)
spec: docs/architecture/DWALLET_SPEC.md
---

# Phase 47: dWallet Planning & Build

**Goal:** Implement the dWallet module — a per-resident data rights, consent, and rewards wallet — as defined in `docs/architecture/DWALLET_SPEC.md` (Schedule G of the SaaS License Agreement, Soralia Village v10). This phase supersedes the original "external NetBones Privacy-as-a-Service dependency" framing: **dWallet is the privacy-as-a-service module**. The DataConsent + WalletTransaction append-only models are themselves the consent ledger and rights-of-data-subject surface (POPIA / LGPD principles).

**Why M5b, not M6+:** dWallet is **the** headline differentiator that closes Soralia Village as the anchor tenant. The pitch to Soralia's 180 homes is: "you own your data, you grant granular consent per use, you earn revenue share." Without dWallet, the anchor tenant pitch is reduced to "another community portal." This phase must land in the M5b launch bundle alongside Community Merits, i18n, OTP, and MyHomeSpace — it is launch-blocking, not a post-launch nicety.

**Launch-readiness blocker (active, not deferred):** Schedule F Table 2 revenue share percentages. The spec provides placeholder values (30% / 40% / 20% / 35%) that must be confirmed against the executed SaaS agreement **before** the M5b launch checklist can flip to green. The schema supports any value, so development (Sub-phases A–F) proceeds in parallel; production seeding is gated on client confirmation. Tracked as a separate BD issue and listed in the M5 launch checklist.

**BD sources (2):**

- `7cp` — Complete formal POPIA compliance audit for South Africa tenant (still in scope; dWallet elevates the audit priority from "should do" to "must do before production seeding")
- `jc1` — Implement cookie management for privacy compliance (re-scoped: no longer a NetBones integration blocker. Cookie management may still be useful for general privacy hygiene but is **not** a dWallet prerequisite — the DataConsent model is consent of record.)

**Why this phase exists:** dWallet is a flagship post-anchor-tenant feature and a legal requirement of Schedule G. Without the append-only consent ledger, the Resident Data Share programme has no consent-of-record surface and the platform cannot lawfully monetise tenant data. The spec was written 2026-06-06; this CONTEXT.md is being brought into alignment.

**Blocker for production seeding (not for development):** Schedule F Table 2 revenue share percentages. The spec provides placeholder percentages (30% / 40% / 20% / 35%) but the exact values must be confirmed against the executed SaaS agreement before `DataRevenueStream` seed runs in production. Schema supports any value.

## Spec Source of Truth

`docs/architecture/DWALLET_SPEC.md` is authoritative for:

- Functional behaviour, domain model, consent semantics, reward distribution flow
- API route surface (resident + admin)
- Hard constraints (immutable transactions, append-only consents, balance consistency, atomic batch ops, no admin PII access, Pino audit on consent change, tenantId on every model)
- Patterns to follow (auth utils, Drizzle singleton, apiSuccess/apiError envelope, Zod validation, revalidation, logger, error boundaries, loading states)
- Ubiquitous language additions

This CONTEXT.md captures the planning shape (sub-phases, acceptance, dependencies). Do not duplicate the spec.

## Sub-Phase Decomposition

The spec defines 6 implementation sub-phases (A–F). Each becomes a GSD plan with its own PLAN.md / SUMMARY.md. Sub-phases A and B have no inter-dependency; the rest chain sequentially.

| Sub   | Objective                                                                                                                                                     | Notes                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **A** | Schema & migration — 6 new Prisma models + 4 enums + `PlatformModule` seed + `DataRevenueStream` seed                                                         | Quality gate: `prisma validate` + `npm run typecheck` after Drizzle regen                               |
| **B** | API layer — resident + admin REST routes, Zod validation, Drizzle transactions for batch ops, Vitest coverage (consent, payout threshold, batch math)         | Most critical route: `POST /consents/:streamKey`. Atomic batch via Drizzle `.transaction()`             |
| **C** | Entity FSD structure — `src/entities/dwallet/` with schema, types, useWallet hook, getOrCreateWallet helper                                                   | Encapsulates the domain; widget/page consumers import from here                                         |
| **D** | Widgets — `dwallet-summary` (resident, home space) + `admin-dwallet` (admin, system space), registered in `widgets.ts`                                        | Both behind `featureFlag: 'dWallet'`; admin widget MUST NOT show individual balances or consent choices |
| **E** | Feature gate integration — `dWallet` PlatformModule (minTier: PREMIUM), 6 FeatureRegistry keys, page flags, `canAccess('page.dWallet')` checks on every route | Wires the spec's Section 11 into the Phase 41 gate system                                               |
| **F** | Full page + navigation — `src/app/dashboard/wallet/page.tsx`, header dropdown entry, mobile burger entry, admin sidebar entry                                 | Page is the deep-dive; widget is the at-a-glance                                                        |

**Suggested wave structure:** Wave 1 = A + C in parallel (schema and entity scaffolding are independent). Wave 2 = B (API) + E (gates). Wave 3 = D (widgets). Wave 4 = F (page). Plan-checker may re-balance.

## Schema Additions (Sub-Phase A)

Six new models, all additive (no existing tables altered), plus reverse relation `dWallet DWallet?` on `user`:

- `DWallet` — one per (tenantId, userId), `@@unique`, status enum
- `WalletTransaction` — immutable append-only ledger; every credit/debit/rollover/adjustment is a row. MUST include `sourceType` field with values: `resident_data_share`, `community_merits`, `referral_reward`, `volunteer_credit`, `ai_credit`, `marketplace_credit`. Only `resident_data_share` is active in Phase 47; other enum values are forward-compatible slots (Constraint 8 — Value Ledger principle).
- `DataConsent` — append-only per (walletId, streamKey); current state = latest row
- `PayoutRequest` — resident-initiated; min R50 threshold enforced
- `DataRevenueStream` — tenant-level config; per-stream resident share %
- `DataShareBatch` — monthly distribution run; uses Drizzle `.transaction()` for atomicity

Five enums: `WalletStatus`, `TransactionType`, `TransactionSource`, `PayoutStatus`, `BatchStatus`.

Seed entries: `PlatformModule` row (`key: 'dWallet'`, `minTier: PREMIUM`, `defaultEnabled: false`) + 4 `DataRevenueStream` rows scoped to the Soralia tenant with placeholder percentages (TODO comment to confirm against Schedule F Table 2).

## Hard Constraints (Sub-Phases B, C, D, E)

These are non-negotiable per the spec. Any plan that violates them is a reject.

1. `WalletTransaction` rows are immutable. Corrections are `ADJUSTMENT` rows.
2. `DataConsent` rows are append-only. Current state = most recent row per `(walletId, streamKey)`.
3. `balanceAfter = balanceBefore + amount` after every credit/debit. Both recorded. `DWallet.balance` always equals `SUM(transactions.amount)`.
   - **Double-entry ledger (BILLING.md Domain 3):** WalletTransaction IS the ledger — balance is derived, never mutated directly. Corrections are ADJUSTMENT rows. See `docs/architecture/DWALLET_SPEC.md` WalletTransaction section for full design note.
4. Distribution batches use Drizzle `.transaction()` — succeed atomically or fail atomically.
5. Admin routes never return individual wallet balances, consent choices, or transaction details. Aggregate counts and totals only. `PayoutRequest` may show resident name to ADMIN / BOARD roles for payment processing.
6. Pino audit log on every consent change with `{ event: 'consent_change', userId, streamKey, granted, tenantId, ip }`.
7. `tenantId` on every dWallet model. All queries filter by `tenantId`. Do not rely on wallet ownership alone for tenant isolation.
8. **Value Ledger principle:** dWallet is a Value Ledger, not a single-purpose rewards tracker. `WalletTransaction.sourceType` must support multiple value sources from day one — `resident_data_share`, `community_merits`, `referral_reward`, `volunteer_credit`, `ai_credit`, `marketplace_credit` — even though only `resident_data_share` is active in Phase 47. Future phases (45 Merits, 104 AI Billing) add sources without changing the wallet abstraction. This prevents three separate reward systems from evolving in parallel.

## Patterns to Follow (Sub-Phases B, C, D)

- Auth: `getSessionAndRole()` from `src/shared/api/auth-utils.ts`
- DB: Drizzle via `src/shared/api/db.ts` singleton — never instantiate Prisma directly
- API envelope: `apiSuccess()` / `apiError()` from `src/shared/api/api-response.ts`
- Validation: Zod schemas in `src/entities/dwallet/schema.ts`, validated at route entry
- Cache invalidation: `revalidatePath('/dashboard')` after balance changes
- Logging: `src/shared/lib/logger.ts`
- Error boundaries: wrap `DWalletSummaryWidget` in `ErrorBoundary`
- Loading states: `LoadingSkeleton` while wallet data fetches

## Acceptance

- [ ] Sub-phase A: All 6 models + 5 enums migrated via Prisma; Drizzle schema regenerated; `prisma validate` passes; `npm run typecheck` passes
- [ ] Sub-phase A: `TransactionSource` enum includes `resident_data_share`, `community_merits`, `referral_reward`, `volunteer_credit`, `ai_credit`, `marketplace_credit` — Value Ledger forward-compatibility (Constraint 8)
- [ ] Sub-phase A: `PlatformModule` seed entry `dWallet` exists with `minTier: PREMIUM`
- [ ] Sub-phase A: 4 `DataRevenueStream` seed entries exist for the Soralia tenant (with `TODO: confirm against Schedule F Table 2` comment)
- [ ] Sub-phase B: All 10 resident routes + 7 admin routes implemented, auth-guarded, returning correct envelopes, with `maxDuration = 8`
- [ ] Sub-phase B: Vitest coverage for consent creation, payout minimum threshold rejection, and batch distribution math (≥3 tests)
- [ ] Sub-phase C: `src/entities/dwallet/` exists with `index.ts`, `schema.ts`, `model/`, `api/`, `ui/`; `getOrCreateWallet()` helper implemented
- [ ] Sub-phase D: Both widgets registered in `widgets.ts` and visually verified; admin widget never exposes individual resident data
- [ ] Sub-phase E: All 6 FeatureRegistry keys exist; `PlatformPageFlags.dWallet` added; every API route calls `canAccess('page.dWallet', gateContext)`
- [ ] Sub-phase F: Full `/dashboard/wallet` page exists; nav entries (header dropdown + mobile burger + admin sidebar) added behind `dWallet` flag
- [ ] Integration verification: `grep -r "prisma\." src/app/api/v1/tenant/dwallet/ src/app/api/admin/dwallet/` returns empty (Drizzle only)
- [ ] Integration verification: `grep "tenantId" src/entities/dwallet/api/` shows it in every query function
- [ ] Integration verification: `grep -r "apiSuccess\|apiError" src/app/api/v1/tenant/dwallet/ src/app/api/admin/dwallet/` shows envelope usage in every route
- [ ] UBIQUITOUS_LANGUAGE.md updated with the 7 new terms from the spec
- [ ] 7 new BD issues created (Phase A–F + Schedule F Table 2 confirmation)
- [ ] 7cp (POPIA audit) and jc1 (cookie management) BD notes updated to reflect dWallet-is-the-privacy-module framing

**Out of scope for this phase:**

- Schedule F Table 2 confirmation (separate BD issue; blocks production seeding, not development)
- Actual EFT / PayFast disbursement integration (Phase 2)
- Community Benefit Fund as a separate ledger model (counter in `Tenant.featureFlags` for now)
- Push notifications on reward receipt (Phase 2)
- Multi-currency support (ZAR only in Phase 1)
- NetBones Privacy-as-a-Service integration (was a misframing; dWallet is the privacy module)

**Plans:** TBD. Run `/gsd-plan-phase 47-dwallet-planning-build` when ready. Suggested wave ordering: Wave 1 = A + C, Wave 2 = B + E, Wave 3 = D, Wave 4 = F. Plan-checker may revise.

**Special notes:**

- 7cp and jc1 BD notes need amendment to reflect the dWallet-is-the-privacy-module framing (no longer a NetBones dependency).
- Sub-phase A should land in a dedicated worktree per the project's GSD worktree protocol (AGENTS.md §"Git Worktree Isolation").
- Per the spec's own instructions, the agent that lands Sub-phase A should create the 7 BD issues listed in the spec's "BD Issues to Create" section during the planning step, not during execution.
- The spec's "Known Integration Points to Verify" grep commands should be run as the closing check on Sub-phase B and again on Sub-phase E.
- **Execution priority:** dWallet is co-launch-blocking with Community Merits (phase 45). Recommend executing phase 45 and phase 47 in parallel worktrees if capacity allows, or sequencing 45 → 47 if solo. Do not slip phase 47 to M6+ — the anchor-tenant deal assumes dWallet at launch.
