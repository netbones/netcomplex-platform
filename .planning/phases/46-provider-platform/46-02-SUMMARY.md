# 46-02 Summary — Provider Registration, Legal Acceptance & Due Diligence Plumbing

## Status

Plan 46-02 is **partially complete, with the core onboarding slice implemented**.

This worktree now supports:

- tenant-configurable provider registration mode (`OPEN` vs `INVITATION_ONLY`)
- authenticated provider self-registration guarded by tenant mode
- required legal agreement acceptance with signed records stored per provider
- duplicate company detection per tenant
- initial provider verification creation with `PROBATION` status
- minimal due-diligence workflow plumbing plus admin review APIs (`pending`, `approve`, `reject`)
- a tenant-facing registration page and client form for the new flow

## What changed

### Tenant registration mode

Added a settings-backed registration mode instead of widening the tenant schema in this slice:

- `src/entities/tenant/api/provider-registration-mode.ts`
- `src/entities/tenant/api/provider-registration-mode.test.ts`
- `src/entities/tenant/api/settings.ts`
- `src/entities/tenant/index.server.ts`
- `src/shared/lib/settings/validation.ts`
- `src/app/api/admin/tenant/provider-registration-mode/route.ts`

Behavior:

- default is `INVITATION_ONLY`
- `GET/PATCH /api/admin/tenant/provider-registration-mode` is restricted to `ADMIN`/`BOARD`
- provider registration APIs and page use the tenant mode before allowing submission

### Provider legal agreements

Added legal-document constants, validation, persistence helpers, and API access:

- `src/shared/lib/providers/registration.ts`
- `src/shared/lib/providers/registration.test.ts`
- `src/shared/api/provider-onboarding.ts`
- `src/app/api/providers/legal/route.ts`
- `src/shared/api/index.ts`
- `src/shared/api/db.ts`
- `src/shared/api/server/index.ts`
- `src/db/index.ts`

Behavior:

- current document set includes TOS, Privacy Policy, and Code of Conduct
- registration requires all three acceptances
- signed acceptance rows are written to `provider_legal_agreements` with timestamp, IP, and user-agent
- `GET /api/providers/legal` returns current versions plus acceptance status for the linked provider

### Registration flow

Added the provider onboarding UI and registration API surface:

- `src/app/(tenant)/providers/register/page.tsx`
- `src/features/provider-registration/index.ts`
- `src/features/provider-registration/ui/RegistrationForm.tsx`
- `src/features/provider-registration/ui/LegalAgreementModal.tsx`
- `src/app/api/providers/register/route.ts`
- `src/app/api/providers/register/validate/route.ts`
- `src/middleware.ts`

Behavior:

- `/providers/register` is now treated as a tenant route
- unauthenticated users see a sign-in prompt
- invitation-only tenants see a locked message instead of the form
- authenticated users submit company/contact details plus legal acceptance
- duplicate company names are rejected with `409`
- registration email must match the signed-in account email so provider/dashboard linkage remains coherent
- new `ServiceProvider` rows are created inactive, with verification set to `PROBATION`

### Due-diligence review plumbing

Added minimal admin API support for later moderation UI work:

- `src/app/api/admin/providers/pending/route.ts`
- `src/app/api/admin/providers/[id]/approve/route.ts`
- `src/app/api/admin/providers/[id]/reject/route.ts`

Behavior:

- `GET /api/admin/providers/pending` lists providers still awaiting review
- `PATCH /api/admin/providers/[id]/approve` activates the provider and moves verification to `VERIFIED`
- `PATCH /api/admin/providers/[id]/reject` keeps the provider inactive and moves verification to `SUSPENDED`
- due-diligence checklist/status is currently derived from verification state rather than stored in a separate workflow table

## Deliberate deviations / deferrals

1. **No dedicated admin dashboard UI yet**
   - Plan 04 explicitly expands admin moderation/revenue UI.
   - In this slice, the registration-mode and review capabilities are API-first.

2. **No separate due-diligence workflow table yet**
   - The workflow is represented through provider verification state plus derived checklist/status.
   - This keeps Plan 02 minimal while still unblocking moderation flows for later plans.

3. **Provider website is not persisted to a dedicated column**
   - The current `ServiceProvider` schema in this branch has no website field.
   - The submitted website is still accepted, validated, returned in the registration response, and mentioned in initial due-diligence notes, but not stored in a first-class column in this slice.

4. **Email notifications were not implemented in this slice**
   - The plan mentions notifications at each stage.
   - I deferred this to later provider lifecycle work so Plan 02 stays focused on registration correctness and API plumbing.

## Validation run

### Passed

- Focused editor diagnostics on touched registration, admin API, helper, and UI files
- Focused ESLint run against touched files only:
  - `node_modules/.bin/eslint` with worktree-prefixed file paths from the repo root

### Attempted but blocked by local tool/worktree setup

- Focused Vitest run for:
  - `src/shared/lib/providers/registration.test.ts`
  - `src/entities/tenant/api/provider-registration-mode.test.ts`
- Focused TypeScript CLI check for touched files

Both were blocked by the local worktree package-resolution setup:

- the phase worktree resolves to `/home/ubuntupunk/Projects/soralia-village.phase-46-provider-platform`
- that worktree does not currently have usable local bin shims / package resolution for `vitest` and worktree-local TS/Vite config loading
- `tsc` also cannot combine `--project` with explicit file arguments (`TS5042`), which prevented a strict CLI-only focused file check

## Follow-up notes for 46-03 / 46-04

1. **Admin UI still needed**
   - Plan 04 should surface registration-mode controls and pending review actions in the admin experience.

2. **First-class due-diligence state may still be worthwhile**
   - If the review process needs `UNDER_REVIEW`, document uploads, or audit trails, add a dedicated workflow table or richer verification model.

3. **Provider identity bridge remains email-based for `ServiceProvider` linkage**
   - Registration now enforces account email matching to reduce drift, but the broader provider identity split called out in 46-01 still exists.

4. **Website persistence is still open**
   - If later plans need provider websites in listings/admin UI/search, add a formal schema field + migration.
