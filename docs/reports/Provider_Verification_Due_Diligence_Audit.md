# Provider Verification & Due Diligence System — Audit Report

**Date:** 2026-06-23  
**Status:** Resolved (GAP-1, GAP-2 fixed; GAP-3 by design)  
**Source:** ADVISORY-015 Phase 3B/C implementation audit

---

## 1. Schema

### ProviderVerification (`prisma/schema.prisma`)

```
id                    String                      @id @default(cuid())
providerId            String                      @unique
tenantId              String
status                ProviderVerificationStatus  @default(PENDING)
notes                 String?
dueDiligenceItems     Json?
startDate             DateTime                    @default(now())
endDate               DateTime?
verificationThreshold Int                         @default(300)
probationThreshold    Int                         @default(0)
createdAt             DateTime                    @default(now())
updatedAt             DateTime                    @updatedAt
```

- 1:1 with `ServiceProvider` via `providerId`
- `dueDiligenceItems` maps to `jsonb` in PostgreSQL (`src/db/schema/provider-verifications.ts`)

### ServiceProvider.isActive

```
isActive  Boolean  @default(true)
```

Schema default is `true`, but all creation code paths explicitly set it to `false`.

### ServiceProvider.userId

```
userId    String?
user      user?     @relation(fields: [userId], references: [id])
```

Added by ADVISORY-015 Phase 3B migration (`20260624010000`). Links the provider record to the user account.

### ProviderVerificationStatus enum

```
PENDING | PROBATION | VERIFIED | SUSPENDED
```

---

## 2. Status Lifecycle

| Source                                        | From  | To                                      | Sets `isActive` | Changes `user.role`     |
| --------------------------------------------- | ----- | --------------------------------------- | --------------- | ----------------------- |
| `createProviderStub` (`provider-platform.ts`) | _new_ | **PROBATION**                           | `false`         | No                      |
| `register/route.ts`                           | _new_ | **PROBATION**                           | `false`         | No                      |
| `due-diligence/route.ts`                      | any   | **VERIFIED** or **PROBATION**           | —               | No                      |
| `approve/route.ts`                            | any   | **VERIFIED**                            | `true`          | USER→PROVIDER (guarded) |
| `verify/route.ts`                             | any   | **VERIFIED**                            | `true`          | USER→PROVIDER (guarded) |
| `reject/route.ts`                             | any   | **SUSPENDED**                           | `false`         | No                      |
| `suspend/route.ts` — SUSPEND                  | any   | **SUSPENDED**                           | `false`         | No                      |
| `suspend/route.ts` — REINSTATE                | any   | **PROBATION** (default) or **VERIFIED** | `true`          | No                      |
| `reputation/route.ts`                         | any   | any except PENDING                      | —               | No                      |

**Notes:**

- Role promotion uses a guard: only promotes if `user.role === 'USER'` — never downgrades an already-admitted user.
- `approve` (gated to ADMIN/BOARD) and `verify` (gated to `providers` permission) are now consistent: both set `isActive`, `status=VERIFIED`, and promote `role`.
- `due-diligence` intentionally does NOT set `isActive` or promote role — it is a review step. Final activation requires explicit approve/verify per ADVISORY-015.

---

## 3. Registration Flow

**File:** `src/app/api/providers/register/route.ts`

- **Gate:** Session + `directory` or `providers` permission + registration mode must be `OPEN`.
- **Collected:** `companyName`, `contactName`, `email`, `phone`, `trade`, `website`, `legalAgreements` (tos/privacy/codeOfConduct).
- **Email match:** Registration email must match session email.
- **Creates:** `ServiceProvider` (`isActive: false`, `userId` set), `ProviderVerification` (`status: PROBATION`), legal agreement records.
- **`dueDiligenceItems`:** Not written during registration. Populated later by admin via the due diligence PATCH endpoint.

---

## 4. Approval Flow

### `approve` route

**File:** `src/app/api/admin/providers/[id]/approve/route.ts`  
**Gate:** ADMIN or BOARD only.

In a transaction:

1. Sets `serviceProviders.isActive = true`
2. Sets `providerVerifications.status = 'VERIFIED'`, clears `endDate`
3. Conditionally promotes `user.role`: if current role is `USER`, sets it to `PROVIDER`

### `verify` route

**File:** `src/app/api/admin/providers/[id]/verify/route.ts`  
**Gate:** `providers` permission (broader than ADMIN/BOARD).

Now identical to `approve` — uses the same transaction pattern:

1. Sets `serviceProviders.isActive = true`
2. Sets `providerVerifications.status = 'VERIFIED'`, clears `endDate`
3. Conditionally promotes `user.role`: if current role is `USER`, sets it to `PROVIDER`

Both write `PROVIDER_APPROVED` audit logs (different `details.method` values).

---

## 5. Suspension Flow

**File:** `src/app/api/admin/providers/[id]/suspend/route.ts`

Unified endpoint handling both SUSPEND and REINSTATE via `action` field.

| Action    | `isActive` | `status`                             | `endDate` | `user.role` |
| --------- | ---------- | ------------------------------------ | --------- | ----------- |
| SUSPEND   | `false`    | `SUSPENDED`                          | `now()`   | unchanged   |
| REINSTATE | `true`     | `restoreStatus` (PROBATION/VERIFIED) | `null`    | unchanged   |

Suspension does NOT change `user.role`. Instead, access is blocked via two gates:

- **Dashboard route:** checks `verification.isSuspended` and returns 403.
- **`requireProviderAccess()`:** checks `verification.isSuspended` and returns 403 for all provider-facing routes (dashboard, verification).

Admin routes access via `requireAnyPermission`, not `requireProviderAccess`, so admins can still manage suspended providers.

---

## 6. Dashboard Access Control

**File:** `src/shared/api/provider-platform.ts` → `requireProviderAccess()`

Three-entry-point access model:

1. `hasPermission(auth.role, 'providers')` — role-based access (covers PROVIDER, BOARD, ADMIN)
2. `providerRecord` — DB-linked provider profile matched by session email
3. `hasProviderListings` — user has active service listings

Post-resolution, a fourth check was added: 4. `verification.isSuspended` → 403 if the provider is suspended

**File:** `src/app/api/providers/dashboard/route.ts` — additional suspension gate for dashboard specifically.

---

## 7. Due Diligence System

| Component       | File                                                      | Role                                                           |
| --------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| Types/checklist | `src/shared/lib/providers/registration.ts`                | Due diligence item definitions (IDENTITY/SERVICE/BACKGROUND)   |
| Write endpoint  | `src/app/api/admin/providers/[id]/due-diligence/route.ts` | PATCH: saves items to JSONB, updates status                    |
| Read endpoint   | `src/shared/api/provider-onboarding.ts`                   | Reads JSONB from DB, merges with template, builds display data |

**Write flow:** Accepts array of `{ key, status, notes? }`. If ALL items APPROVED → sets `status=VERIFIED`. Otherwise → sets `status=PROBATION`. Saves items to `dueDiligenceItems` JSONB.

**Read flow:** Merges persisted items with checklist template. Maps verification status to workflow status: `VERIFIED → APPROVED`, `SUSPENDED → REJECTED`, else `PENDING`.

**Important:** Due diligence does NOT set `isActive` or `user.role`. It is a documentation review step. Final activation requires explicit approval (`approve`/`verify`) per ADVISORY-015. This is by design — due diligence reviews paperwork; approval grants access.

---

## 8. Full Provider Lifecycle

```
Sign-up → USER (role)
   │
   ├─ Self-registration (OPEN tenant):
   │    registration form → ServiceProvider{isActive:false, userId set}
   │                      → ProviderVerification{status:PROBATION}
   │
   ├─ Invitation accepted (role:PROVIDER):
   │    createProviderStub → ServiceProvider{isActive:false}
   │                       → ProviderVerification{status:PROBATION}
   │
   └─ Admin due diligence review:
        PATCH /admin/providers/[id]/due-diligence
        → DD items saved to JSONB
        → If all approved: status → VERIFIED (review complete)
        → isActive still false, role still USER

Admin approval (approve or verify):
   Transaction:
   → isActive = true
   → status = VERIFIED
   → user.role = PROVIDER (if currently USER)

Provider active → serves community

Admin suspension:
   → isActive = false
   → status = SUSPENDED
   → Auth gates block dashboard + provider endpoints
   → Admin can reinstate (restore to PROBATION or VERIFIED)
```

---

## 9. Resolution Log

### GAP-1: ✅ FIXED — verify route now promotes user.role

`verify/route.ts` now uses the same transaction pattern as `approve`: atomically sets `isActive`, `status`, and promotes `user.role` from `USER` → `PROVIDER`.

### GAP-2: ✅ FIXED — Suspension access control via `requireProviderAccess`

Added `verification.isSuspended` check to `requireProviderAccess()`. All provider-facing routes (dashboard, verification) reject suspended accounts. Admin routes use `requireAnyPermission` and remain unaffected.

### GAP-3: ✅ BY DESIGN — Due diligence is separate from approval

Per ADVISORY-015, due diligence is a documentation review step. The `approve`/`verify` routes are the only activation points. This prevents accidental activation during DD review and keeps a clear audit boundary.

### GAP-4: Known — PENDING status unused

No code path creates a `PENDING` status row. The Prisma default is defensive. If it's never reached, it can be removed in a future cleanup.

### GAP-5: Known — approve/verify partial duplication

Both routes now share the same transaction pattern. Future refactor could extract a shared `activateProvider()` service.

### GAP-6: Known — Reputation route bypass

`reputation/route.ts` can change verification status as a side-effect. Should be restricted to reputation-only operations in a future cleanup.

### GAP-7-GAP-11: Tracked

Remaining gaps (no UN-verify, no DELETE, empty dueDiligenceItems at registration, etc.) are tracked in BD for future phases.

---

## 10. Related

- **ADVISORY-015** — Full execution plan (user role lifecycle, provider admission, address hardening)
- **ADR-022** — USER as pre-admission staging role
- **BD `5z3g`** — Define USER role + role lifecycle
- `prisma/migrations/20260624000000_add_user_role_and_seat_lifecycle/` — Role enum + seat lifecycle migration
- `prisma/migrations/20260624010000_add_user_id_to_service_provider/` — userId FK on ServiceProvider
- `src/shared/api/provider-platform.ts` — `requireProviderAccess`, `createProviderStub`, `getProviderVerificationSnapshot`
- `src/app/api/admin/providers/[id]/approve/route.ts` — Approval with transaction + role promotion
- `src/app/api/admin/providers/[id]/verify/route.ts` — Verify with transaction + role promotion
