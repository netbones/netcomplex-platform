# Merits System Review

**System:** Community Merits & Standing (Phase 45)  
**Scope:** Community Merits, Provider Reputation, Standing Tiers, Dispute Workflow, Admin UI  
**Documented:** 2026-06-23 by GSD Review  
**BD Tracking:** `soralia-village-siok`  
**Last Updated:** 2026-06-23 — Provider Reputation rename applied; section 1.2 corrected

---

## Executive Summary

The system implements a two-tier merit/standing framework: **Community Merits** (resident behavior tracking) and **Provider Merits** (service provider reputation). Community Merits is a full-featured behavior ledger with tiers, points, expiry, disputes, and admin workflows. Provider Merits is a leaner ledger that logs events against service providers.

---

## 1. Schema & Data Model

### 1.1 Community Merits (`community_merits`)

- **Fields:** `id`, `userId`, `createdById`, `resolvedById`, `behaviorType`, `category`, `reason`, `description`, `recognitionPoints`, `disciplinaryPoints`, `standingBefore`, `standingAfter`, `status`, `expiredAt`, `createdAt`, `updatedAt`
- **Status:** `ACTIVE`, `DISPUTED`, `UPHELD`, `OVERTURNED`
- **Types:** `MERIT` (+5 pts), `WARNING` (2 pts), `INFRACTION` (10 pts)
- **Categories:** `COMMUNITY_SERVICE`, `COMMUNITY_ENGAGEMENT`, `CONDUCT_VIOLATION`, `REPEATED_LATE_PAYMENT`, `NOISE_COMPLAINT`, `PARKING_VIOLATION`, `PROPERTY_DAMAGE`, `RULES_VIOLATION`, `OTHER`
- **Expiry:** WARNING=180d, INFRACTION=730d, MERIT=never

### 1.2 Provider Reputation (`provider_reputation` / `provider_merits`)

- **`provider_reputation`:** 1:1 scorecard per provider — `totalScore`, per-category scores (`responseTimeScore`, `qualityScore`, `reviewScore`, `complianceScore`, `engagementScore`), `verificationThreshold` comparison for verification gating.
- **`provider_merits`:** Individual ledger events — `meritType` (RESPONSE_TIME, SERVICE_QUALITY, REVIEW_RATING, COMPLIANCE, ENGAGEMENT, REFERENCE), `points`, `description`, `referenceId`, `createdAt`.
- **Merit → Reputation flow:** Merits are the transactions; Reputation is the accumulated balance. Points from individual merit events roll up into `totalScore` on the `provider_reputation` record.
- **No expiry, no status, no dispute workflow** — Provider merits are a simple event log driving the reputation scorecard.

### 1.3 Standing Tiers

- **Tiers:** `GOLD` (≥50), `SILVER` (≥20), `BRONZE` (≥0), `WATCHLIST` (<0), `PROBATION` (≤-20)
- **Escalation:** 3 infractions → review flag, 5 infractions → suspension recommendation
- **Public tier labels obscure negatives:** WATCHLIST/PROBATION display as lower tier variants

---

## 2. API Surface

### 2.1 Community Merits Endpoints

- `GET /api/merits` — List (paginated, filterable by `userId`, `status`, `behaviorType`, `category`)
- `POST /api/merits` — Create (validates user existence, computes standing)
- `GET /api/merits/[id]` — Read single
- `PATCH /api/merits/[id]` — Update mutable fields (`reason`, `description`, `category`)
- `DELETE /api/merits/[id]` — Soft-delete (sets status to `REMOVED`)
- `POST /api/merits/[id]/dispute` — Resident disputes own record
- `POST /api/merits/[id]/resolve` — Admin resolves (`UPHOLD` or `OVERTURN`)

### 2.2 Provider Reputation Endpoints

- `GET /api/providers/reputation` — Aggregate score, progress toward verification, recent merit events
- `GET /api/providers/reputation/history` — Historical merit events, filterable by date range
- `PATCH /api/admin/providers/[id]/reputation` — Admin score adjustment (audited, generates merit record)

---

## 3. Frontend

### 3.1 Admin (page-modules/admin/merits)

- `MeritsListPage` — Data table with filtering badges
- `MeritEntryForm` — Create/edit form
- `UserStandingCard` — User profile with standing, score cards, infraction count
- `DisputeResolveDialog` — Modal for admin resolution
- `MeritEscalationWidget` — Flag count UI
- `PendingDisputesWidget` — Pending count badge

### 3.2 Resident-facing

- `StandingBadge` (entities/merit) — Context-aware tier badge (public vs private view)
- Embedded in: `ResidentProfilePage`, `UnifiedResidentCard`

---

## 4. Core Logic & Services

### 4.1 Point Calculation

- `getEffectivePoints()` — Calculates net recognition, disciplinary, and overall scores
- Standing recalculated on every mutation/creation

### 4.2 Escalation

- `checkAndEscal allocating()` — Counts total infractions, checks thresholds
- No automatic action beyond flag/recommendation

### 4.3 Audit Events

- `MERIT_RECORD_CREATED`
- `MERIT_RECORD_UPDATED`
- `MERIT_RECORD_DELETED`
- `MERIT_DISPUTE_FILED`
- `MERIT_DISPUTE_RESOLVED`

---

## 5. Security & Permissions

- `canManageMerits()` — ADMIN, BOARD, MANAGER
- `canResolveDisputes()` — ADMIN, BOARD
- All endpoints gate behind `@better-auth` session
- **Missing:** Row-level filtering on list endpoints (should limit to manageable users)

---

## 6. Testing

- `src/test/api/merits.test.ts` — CRUD tests
- `src/test/api/merits-dispute.test.ts` — Dispute workflow
- `src/test/api/merits-resolve.test.ts` — Resolution workflow
- **Gaps:**
  - No tests for expiry logic
  - No tests for standing tier transitions
  - No tests for public vs private badge display
  - No integration tests for escalation triggers

---

## 7. Findings & Recommendations

### 7.1 Data Model

1. **Hardcoded tiers are brittle.** Thresholds (50, 20, 0, -20) are in code, not config. Cannot be adjusted without deploy.
   - _Recommendation:_ Move to `tenant_config` or `community_settings`
2. **Point values are arbitrary.** +5 for merit, -10 for infraction gives outsized impact for infractions.
   - _Recommendation:_ Document rationale; make configurable per tenant or phase
3. **Expiry only on WARNING/INFRACTION.** MERIT records never expire, creating permanent positive inflation.
   - _Recommendation:_ Add optional `meritExpiry` to settings; decay old merits after N years
4. **Provider merits already carry `description` and `referenceId`.** The missing field is `evidenceUrl` for attachments (screenshots, receipts, PDFs).
   - _Recommendation:_ Add `evidenceUrl` column to `provider_merits`; update admin detail view to render links

### 7.2 API & Logic

5. **Soft-delete uses `REMOVED` status.** This conflates lifecycle (deleted) with review state (disputed).
   - _Recommendation:_ Separate `isDeleted` boolean or `deletedAt` column
6. **Dispute resolution overwrites `resolvedById`.** No audit trail of who changed what.
   - _Recommendation:_ Add `disputeHistory` JSONB or separate `merit_dispute_history` table
7. **No rate limiting on create.** Admin could accidentally (or maliciously) spam records.
   - _Recommendation:_ Add rate limit middleware on `/api/merits`
8. **PATCH allows changing `category` without recalculating standing.** Inconsistent behavior.
   - _Recommendation:_ On category change, recalculate `standingAfter` and emit audit event

### 7.3 Frontend

9. **Standing badge hides negatives publicly, but API does not.** Rankings can be inferred from ordering.
   - _Recommendation:_ Add API-level `public` filter; never return WATCHLIST/PROBATION in public list endpoints
10. **No loading/error states in widgets.** `PendingDisputesWidget` and `MeritEscalationWidget` fetch data without skeletons or error boundaries.
    - _Recommendation:_ Wrap in Suspense; add error handlers
11. **MeritEntryForm allows past-dated records without validation.** Backdated records can manipulate standings.
    - _Recommendation:_ Add `maxDate` validation or admin-only `allowBackdate` flag

### 7.4 Process & Governance

12. **No documented policy for escalation actions.** "Suspension recommendation" is a flag, not a workflow.
    - _Recommendation:_ Link to suspension module (if exists) or create a governance document
13. **No resident notification on standing changes.** Users find out when they see the badge.
    - _Recommendation:_ Integrate with notification system on standing drop/tier change
14. **No periodic recalculation job.** If expiry logic changes or a bug is fixed, old records won't recompute.
    - _Recommendation:_ Background job (Vercel Cron or similar) to recompute standings and notify outliers

---

## 8. Priority Action Items

| Priority | Item                                                | Effort | BD   | Status                 |
| -------- | --------------------------------------------------- | ------ | ---- | ---------------------- |
| ✅ Done  | Rename ProviderCredit → ProviderReputation          | —      | —    | ✅                     |
| ✅ Done  | P1: Move tier thresholds to tenant settings         | 2h     | siok | ✅ 2026-06-23          |
| ✅ Done  | P1: Fix PATCH to recalc standing on category change | 1h     | siok | ✅ 2026-06-23          |
| ✅ Done  | P2: Add `merits` API rate limiting                  | 1h     | siok | ✅ 2026-06-23          |
| ✅ Done  | P2: Separate soft-delete from dispute status        | 2h     | siok | ✅ Already implemented |
| ✅ Done  | P2: Add merit expiry / decay                        | 3h     | siok | ✅ 2026-06-23          |
| ✅ Done  | P3: Resident notifications on tier change           | 3h     | siok | ✅ 2026-06-23          |
| ✅ Done  | P3: Audit history for dispute resolution            | 4h     | siok | ✅ 2026-06-23          |
| ✅ Done  | P3: Background recalculation job                    | 4h     | siok | ✅ 2026-06-23          |
| ✅ Done  | P3: Add `evidenceUrl` to provider_merits            | 1h     | siok | ✅ 2026-06-23          |

### P3 Implementation Notes

**Notifications:** POST `/api/merits` and POST `/api/merits/[id]/resolve` now compare standing tiers before/after and insert a notification when the tier changes. WATCHLIST/PROBATION tiers get `type: 'warning'`, others get `type: 'info'`.

**Dispute audit history:** Added `disputeHistory` JSONB column to `community_merits` (default `[]`). Dispute handler appends `{ type: 'FILED', actorId, reason, timestamp }`. Resolve handler appends `{ type: 'RESOLVED', actorId, verdict, timestamp }`.

**Recalculation job:** `POST /api/admin/merits/recalculate` — admin-only endpoint. Accepts `{ batchSize, offset }`. Iterates all users with active merit records in a tenant, calls `getEffectivePoints()` per user. Returns `{ total, recalculated }`. Can be called manually or wired to Vercel Cron.

**evidenceUrl:** Added nullable `evidence_url` text column to `provider_merits`. Included in seed types.

---

## 9. Cross-References

- `docs/STEERING/ADR.md` — ADR-019 (RLS policies) affects `community_merits` access
- `prisma/schema.prisma` — Source of truth for model
- `src/entities/merit/model/constants.ts` — Hardcoded values
- `.planning/phases/45-m5b-anchor-tenant/` — Phase 45 planning artifacts
