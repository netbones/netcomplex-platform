# SUPPLEMENTAL-015 — Execution Completion Record

**Advisory:** ADVISORY-015 — USER Role Lifecycle, Provider Admission, and Address System Hardening
**Status:** Complete
**Date:** 2026-06-23
**Source audit:** `docs/reports/Provider_Verification_Due_Diligence_Audit.md`
**Migrations landed:**

- `prisma/migrations/20260624000000_add_user_role_and_seat_lifecycle/`
- `prisma/migrations/20260624010000_add_user_id_to_service_provider/`

---

## 1. Execution Summary

All phases of ADVISORY-015 executed successfully. The audit report confirms correct implementation across schema, registration, approval, suspension, and access control.

| Phase | Description                                                                            | Outcome     |
| ----- | -------------------------------------------------------------------------------------- | ----------- |
| 1     | Schema migration — `USER` role, seat lifecycle, `Property.platformAddress @unique`     | ✅ Complete |
| 2     | `auth.ts` override removal                                                             | ✅ Complete |
| 3A    | Invitation acceptance hook (non-PROVIDER roles)                                        | ✅ Complete |
| 3B    | `createProviderStub` — `ServiceProvider{PENDING}` + `ProviderVerification{PROBATION}`  | ✅ Complete |
| 3C    | Provider approval transaction — `isActive`, `VERIFIED`, `user.role=PROVIDER` (guarded) | ✅ Complete |
| 4     | Cross-table address uniqueness guard                                                   | ✅ Complete |
| 5     | Provider dashboard gate — suspension check via `requireProviderAccess()`               | ✅ Complete |

**R8 resolved:** `ServiceProvider.userId` FK added in migration `20260624010000`. `createProviderStub` sets `userId` from session at both invitation acceptance and self-registration.

---

## 2. Canonical Provider Lifecycle (As-Built)

```
Sign-up → USER (role)
   │
   ├─ Self-registration (OPEN tenant):
   │    POST /api/providers/register
   │    → ServiceProvider { isActive: false, userId: set }
   │    → ProviderVerification { status: PROBATION }
   │    → ProviderLegalAgreement records created
   │    → user.role: USER (unchanged)
   │
   ├─ Invitation accepted (invitation.role: PROVIDER):
   │    POST /api/invitations/accept
   │    → createProviderStub()
   │    → ServiceProvider { isActive: false }
   │    → ProviderVerification { status: PROBATION }
   │    → user.role: USER (unchanged — PROVIDER carve-out in hook)
   │
   └─ Admin due diligence review:
        PATCH /api/admin/providers/[id]/due-diligence
        → DD items saved to dueDiligenceItems JSONB
        → If all items APPROVED: status → VERIFIED (review complete)
        → isActive: still false, user.role: still USER
        → (due diligence is documentation review only — not an activation gate)

Admin activation (approve OR verify):
   Transaction:
   → ServiceProvider.isActive = true
   → ProviderVerification.status = VERIFIED
   → user.role = PROVIDER (only if currently USER — never downgrades)
   → Audit log: PROVIDER_APPROVED

Provider active — serves community

Admin suspension:
   POST /api/admin/providers/[id]/suspend { action: SUSPEND }
   → isActive = false
   → status = SUSPENDED
   → endDate = now()
   → user.role: unchanged
   → requireProviderAccess() blocks dashboard + provider endpoints
   → Admin routes unaffected (use requireAnyPermission)

Admin reinstatement:
   POST /api/admin/providers/[id]/suspend { action: REINSTATE }
   → isActive = true
   → status = restoreStatus (PROBATION | VERIFIED)
   → endDate = null
   → user.role: unchanged
```

---

## 3. Architectural Notes for ADR-022

The following clarifications should be added to the ADR-022 entry in `docs/STEERING/ADR.md` when it is written:

**3.1 — `PROBATION` is the canonical initial `ProviderVerificationStatus`**

No code path creates a `PENDING` verification row. The `PENDING` enum value is vestigial — it exists as a schema default on the model definition but `createProviderStub` explicitly sets `PROBATION`. Future engineers must not create code paths targeting `PENDING` as an initial state. The enum value should be removed in a future cleanup once confirmed no production rows carry it.

**3.2 — Due diligence and activation are intentionally separate gates**

The `due-diligence` PATCH endpoint reviews documentation and may set `status=VERIFIED` when all items are approved, but it does **not** set `isActive` or promote `user.role`. Activation requires an explicit admin decision via `approve` or `verify`. This separation provides a clear audit boundary: paperwork review is distinct from access grant.

**3.3 — Two activation routes exist by design**

`approve` (gated to ADMIN/BOARD) and `verify` (gated to `providers` permission) implement the same transaction pattern. Both are valid activation points — `verify` is the broader-permission path for cases where a non-board staff member completes verification. The `details.method` field in the audit log distinguishes them. A future `activateProvider()` shared service should be extracted to eliminate the duplication risk (GAP-5).

**3.4 — Suspension does not change `user.role`**

A suspended provider retains `role: PROVIDER` in the `user` table. Access is blocked entirely through `requireProviderAccess()` checking `verification.isSuspended`. This is intentional — role is an identity classification, not a live access token. Reinstatement restores access without requiring a role re-grant.

---

## 4. Known Gaps — Forward Tracking

These gaps were identified during the audit and are deferred. Each should be picked up as a BD issue or incorporated into the next provider-adjacent advisory.

| Gap    | Description                                                                                          | Severity | Recommended action                                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| GAP-4  | `PENDING` is a dead `ProviderVerificationStatus` value — no code path creates it                     | Low      | BD issue: confirm zero `PENDING` rows in production, then remove from enum in a cleanup migration                                               |
| GAP-5  | `approve` and `verify` routes duplicate the same transaction pattern                                 | Low      | BD issue: extract `activateProvider(providerId, tenantId, method)` shared service in `provider-platform.ts`                                     |
| GAP-6  | `reputation/route.ts` can mutate `ProviderVerification.status` as a side effect                      | Medium   | BD issue: restrict reputation route to reputation-score-only writes; verification status changes must go through approved activation gates only |
| GAP-7  | No UN-verify flow — once verified, admin cannot step a provider back to PROBATION without suspending | Low      | Deferred — no current operational need. Suspension + reinstate to PROBATION covers the use case                                                 |
| GAP-8  | No DELETE/deregister flow for providers                                                              | Low      | Deferred — soft-delete pattern via `deletedAt` can be added when needed                                                                         |
| GAP-9  | `dueDiligenceItems` is empty at registration — admin must populate via PATCH before reviewing        | Low      | Acceptable by design. Could pre-populate with a checklist template on stub creation for UX improvement                                          |
| GAP-10 | `ServiceProvider.isActive` default in schema is `true` but all creation paths set `false` explicitly | Low      | Minor schema hygiene — change default to `false` in a future migration                                                                          |
| GAP-11 | No email notification to provider on approval, suspension, or reinstatement                          | Low      | Deferred to notification system advisory                                                                                                        |

---

## 5. Closed Items

- **BD `5z3g`** — Define USER role + role lifecycle: **CLOSED**
- **COMMUNIQUE-02 §4.1** (provider identity model): **RESOLVED** — Option B (User-as-PROVIDER) implemented via USER staging
- **COMMUNIQUE-02 §4.2** (provider onboarding paths): **RESOLVED** — invitation and open-registration paths both land in PROBATION
- **COMMUNIQUE-02 §3.2** (address system gaps): **RESOLVED** — `Property.platformAddress @unique` and seat lifecycle fields in place
- **ADVISORY-015 R8** (`ServiceProvider.userId` FK gap): **RESOLVED** — migration `20260624010000`

---

## 6. Still Open from COMMUNIQUE-02

These items were explicitly deferred in ADVISORY-015 and remain open:

| Item                                                     | Status   | Next trigger                                       |
| -------------------------------------------------------- | -------- | -------------------------------------------------- |
| Central `PlatformAddress` registry table (§4.3 Option A) | Deferred | Chat `@mention` routing becomes a hard requirement |
| Messaging `@mention` address routing (§4.4)              | Deferred | Depends on registry table                          |
| `RESIDENT_PROVIDER` composite role                       | Deferred | First dual-role user surfaces in production        |

---

## 7. Related

- `ADVISORY-015.md` — Full execution plan
- `docs/reports/Provider_Verification_Due_Diligence_Audit.md` — Audit source for this supplemental
- `docs/STEERING/ADR.md` — ADR-022 entry to be added
- `src/shared/api/provider-platform.ts` — `requireProviderAccess`, `createProviderStub`
- `src/app/api/admin/providers/[id]/approve/route.ts`
- `src/app/api/admin/providers/[id]/verify/route.ts`
- `src/app/api/admin/providers/[id]/suspend/route.ts`
- `src/app/api/admin/providers/[id]/due-diligence/route.ts`
