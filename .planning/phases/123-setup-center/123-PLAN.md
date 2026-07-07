# Phase 123 Plan: Setup Center

**Goal:** Replace the mandatory 7-step onboarding wizard with a persistent Setup Center — a permanent administrative workspace that guides tenant owners from first login through long-term platform adoption, aligned with ADVISORY-028.

**Status:** Planned
**Milestone:** M5+ (Post-Launch Enhancement)
**BD issue:** soralia-village-0jh1
**Requirements:** SETUP-01 through SETUP-09 (defined below)

### Merge Gate

This phase touches the HomeLayer and the onboarding flow — two high-risk surfaces.
**Merge into `dev` is gated on review by DavDev.** No `wt merge` until sign-off is received.
The reviewer must verify:

1. HomeLayer integration does not regress existing dashboard UX
2. Data migration does not lose onboarding state from existing tenants
3. New `/setup` page does not conflict with existing admin routes
4. Old wizard removal does not break signup flow for new tenants

## Requirements

| ID       | Description                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| SETUP-01 | `TenantSetup` model with structured progress tracking replaces ad-hoc `onboarding_step_N` Setting keys     |
| SETUP-02 | Setup Center page at `/setup` serves as the persistent admin workspace (replaces `/onboarding/[tenantId]`) |
| SETUP-03 | Launch section captures all required identity config (name, branding, domain, timezone, address)           |
| SETUP-04 | Populate section handles invitations, role assignment, and member import                                   |
| SETUP-05 | Configure section presents optional module toggles with progressive disclosure                             |
| SETUP-06 | Grow section provides dynamic recommendations based on current setup state                                 |
| SETUP-07 | HomeLayer displays setup progress card when onboarding is incomplete                                       |
| SETUP-08 | Existing onboarding data migrates to new `TenantSetup` model without data loss                             |
| SETUP-09 | Old wizard code is removed and `/onboarding/[...]` redirects to `/setup`                                   |

## Waves

| Wave | Plans  | Objective                                                                              |
| ---- | ------ | -------------------------------------------------------------------------------------- |
| 1    | 123-01 | Schema & Entity Foundation — `TenantSetup` + `SetupMission` models, migration, Drizzle |
| 2    | 123-02 | API Layer — Setup Center routes (progress, missions, completion)                       |
| 3    | 123-03 | Setup Center Page Shell — navigation, layout, progress bar, section framework          |
| 4    | 123-04 | Launch & Populate Sections — identity config + people management                       |
| 5    | 123-05 | Configure & Grow Sections — module toggles + recommendation engine                     |
| 6    | 123-06 | Dashboard Integration — HomeLayer setup card + continuous health dashboard             |
| 7    | 123-07 | Migration & Cleanup — data migration, wizard removal, redirects                        |

---

## Wave 1: Schema & Entity Foundation (Plan 123-01)

### Task 1.1 — Prisma schema

Add two new models to `prisma/schema/schema.prisma`:

```prisma
model TenantSetup {
  id                  String   @id @default(cuid())
  tenantId            String
  tenant              Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  completionPercent   Int      @default(0)
  completedSections   String[] @default([])   // e.g. ["launch", "populate"]
  launchedAt          DateTime?
  lastViewedAt        DateTime @default(now())
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  deletedAt           DateTime?

  missions            SetupMission[]
  settings            SetupSetting[]

  @@unique([tenantId])
}

model SetupMission {
  id          String      @id @default(cuid())
  tenantSetupId String
  tenantSetup   TenantSetup @relation(fields: [tenantSetupId], references: [id], onDelete: Cascade)
  section     String      // "launch" | "populate" | "configure" | "grow"
  missionKey  String      // e.g. "branding", "invite_board", "enable_bookings"
  title       String
  description String?
  isRequired  Boolean     @default(false)
  isCompleted Boolean     @default(false)
  completedAt DateTime?
  sortOrder   Int         @default(0)
  metadata    Json?       // estimatedTime, benefits, dependencies
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@unique([tenantSetupId, missionKey])
  @@index([tenantSetupId, section])
}

model SetupSetting {
  id            String   @id @default(cuid())
  tenantSetupId String
  tenantSetup   TenantSetup @relation(fields: [tenantSetupId], references: [id], onDelete: Cascade)
  key           String
  value         Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([tenantSetupId, key])
}
```

### Task 1.2 — Database migration

```bash
npx prisma migrate dev --name add_tenant_setup_models
```

### Task 1.3 — Drizzle schema generation

```bash
npx prisma generate
```

### Task 1.4 — Entity FSD structure

Create `src/entities/setup/` with:

- `schema.ts` — Zod validators for SetupCenter, SetupMission, SetupSetting
- `types.ts` — TypeScript interfaces (SetupCenter, SetupMission, SetupSetting, Section, MissionRef)
- `constants.ts` — section definitions, default mission catalog, required mission keys
- `index.ts` — barrel re-exports

### Acceptance

- `npx prisma migrate status` shows migration applied
- `npx tsc --noEmit` passes on new entity files
- Drizzle schema files generated in `src/db/schema/`

---

## Wave 2: API Layer (Plan 123-02)

### Task 2.1 — Setup Center progress API

`GET /api/platform/setup?tenantId=<id>` — Returns full `TenantSetup` with missions grouped by section, plus `completionPercent`.

### Task 2.2 — Mission completion API

`PATCH /api/platform/setup/missions` — Updates mission completion state, recalculates `completionPercent`, returns updated state. Auth-guarded with `requirePlatformAdmin()` or tenant ownership verification.

### Task 2.3 — Setup initialization on tenant creation

Modify `POST /api/platform/tenants` to also create a `TenantSetup` record with default missions seeded for the tenant's tier.

### Task 2.4 — SetupSetting CRUD

`GET/PATCH /api/platform/setup/settings` — Read/write individual setup settings (branding, facilities, etc.) with the new structured model. Mirrors existing onboarding API functionality but uses `SetupSetting` model.

### Acceptance

- All routes return `apiSuccess`/`apiError` envelopes
- `completionPercent` recalculates correctly when missions complete/uncomplete
- Existing tenant creation also creates a `TenantSetup` record
- `pnpm typecheck` passes on new API routes

---

## Wave 3: Setup Center Page Shell (Plan 123-03)

### Task 3.1 — Setup Center page route

Create `src/app/(tenant)/setup/page.tsx` — server component that loads `TenantSetup` data, redirects to login if unauthenticated.

### Task 3.2 — SetupCenter shell component

Create `src/features/setup/ui/SetupCenter.tsx` — client component with:

- Progress bar (percentage + visual fill)
- Four-section tab/accordion navigation (Launch, Populate, Configure, Grow)
- Section completion badges

### Task 3.3 — SetupSection container

Create `src/features/setup/ui/SetupSection.tsx` — reusable section wrapper:

- Section title with completion status
- Mission list with checkmarks
- Collapsible/expandable behavior

### Task 3.4 — Navigation integration

Add Setup Center to:

- `src/entities/navigation/` — ADMIN_ITEMS or admin domain grid
- AdminLayer sub-launcher (if setup incomplete, show as urgent CTA)
- SpaceChrome/MobileSpaceBar (admin-accessible space)

### Acceptance

- `/setup` page renders for authenticated admin users
- Progress bar reflects `completionPercent` from API
- Four sections visible with correct completion states
- Navigation entry accessible from admin surfaces

---

## Wave 4: Launch & Populate Sections (Plan 123-04)

### Task 4.1 — Launch section missions

Create `src/features/setup/ui/sections/LaunchSection.tsx`:

- Community Name (inline edit, required)
- Branding (logo upload + color/font pickers — reuse from `BrandingStep`)
- Contact Details (email, phone)
- Domain (subdomain edit)
- Timezone selector
- Address (auto-complete or manual)

### Task 4.2 — Launch section API integration

Wire Launch section to `SetupSetting` API. Each mission corresponds to a `SetupSetting` key. Auto-save on blur.

### Task 4.3 — Populate section missions

Create `src/features/setup/ui/sections/PopulateSection.tsx`:

- Invite Board Members (email + role form — reuse from `InviteStep`)
- Invite Residents (batch email input)
- Import Members (CSV upload with preview)
- Assign Roles (role management grid)
- Create Service Accounts (for providers)

### Task 4.4 — Populate section API integration

Wire Populate to invitation API and role management. Track completion based on whether at least one invitation has been sent or members exist.

### Acceptance

- Launch section saves all fields, shows completion per mission
- Populate section sends real invitations, tracks send state
- Both sections auto-save without explicit "Save" button
- Required missions marked clearly with visual indicators

---

## Wave 5: Configure & Grow Sections (Plan 123-05)

### Task 5.1 — Configure section missions

Create `src/features/setup/ui/sections/ConfigureSection.tsx`:

- Module toggles (enable/disable each module — reuse from `ModulesStep`)
- Facility configuration (presets + custom — reuse from `FacilitiesStep`)
- Maintenance categories (presets + custom — reuse from `MaintenanceStep`)
- Bookings setup
- dWallet enable (if tier allows)
- Surveys, Competitions, Achievements toggles

Nothing in Configure is mandatory — all missions default to optional.

### Task 5.2 — Progressive disclosure

When a module is enabled but not yet visited, show a contextual prompt:

```
Bookings is now enabled. Configure facilities to get started.
```

Create `src/features/setup/ui/ContextualPrompts.tsx` for this pattern.

### Task 5.3 — Grow section missions

Create `src/features/setup/ui/sections/GrowSection.tsx`:

- Recommendation cards based on current setup state
- Each card shows: mission title, estimated time, benefits summary
- "Complete" / "Skip" / "Learn More" actions

Default recommendations:

```
Enable Community Wallet — 2 min — Residents earn revenue share
Create your first survey — 3 min — Gather community feedback
Configure provider directory — 5 min — Connect with local services
Enable achievements — 2 min — Gamify community participation
```

### Task 5.4 — Recommendation engine

Create `src/features/setup/model/recommendations.ts`:

- Pure function `getRecommendations(setup: TenantSetup): SetupMission[]`
- Rules engine: if module X enabled but not configured → recommend configuration
- If population < 5 → recommend inviting more residents
- Tier-aware: don't recommend premium features to foundation tenants

### Acceptance

- Configure section shows all optional modules with lazy configuration
- Grow section shows dynamic recommendations based on actual state
- Recommendation engine produces correct suggestions for different tiers
- Progressive disclosure prompts appear contextually

---

## Wave 6: Dashboard Integration (Plan 123-06)

### Task 6.1 — Setup progress card on HomeLayer

Create `src/features/setup/ui/SetupProgressCard.tsx`:

- Compact card showing completion percentage + bar
- "Continue Setup" CTA linking to `/setup`
- Only visible when `completionPercent < 100`
- Style matches existing HomeLayer card patterns

Integrate into `HomeLayer.tsx` urgency zone (replaces or supplements urgent items).

### Task 6.2 — Setup completion redirect change

Modify post-signup redirect: instead of routing to `/onboarding/[tenantId]`, route to `/setup`.

### Task 6.3 — Continuous health dashboard

Extend Setup Center to show a "Community Health" view after launch:

```
Community Health
├── Branding: Complete
├── Residents: 45%
├── Maintenance: Configured
├── Payments: Not Enabled
├── AI Assistant: Available
└── Overall Readiness: 83%
```

This view replaces the setup progress from §1 of ADVISORY-028.

### Acceptance

- HomeLayer shows setup progress card for incomplete setups
- Card disappears when `completionPercent === 100`
- Post-signup redirects to `/setup` instead of `/onboarding/[tenantId]`
- Community Health view shows accurate readiness metrics

---

## Wave 7: Migration & Cleanup (Plan 123-07)

### Task 7.1 — Data migration script

Create `scripts/migrate-onboarding-to-setup-center.ts`:

- Reads all `onboarding_step_*` Setting keys per tenant
- Creates corresponding `TenantSetup` + `SetupMission` + `SetupSetting` records
- Calculates initial `completionPercent` from existing step data
- Idempotent (skips tenants that already have `TenantSetup` records)
- Dry-run mode for verification

Run migration against dev database and verify no data loss.

### Task 7.2 — Remove old onboarding wizard

Remove or archive:

- `src/features/onboarding/` — entire directory
- `src/app/(platform)/onboarding/` — layout + page
- `src/app/api/platform/onboarding/route.ts` — old API route
- `src/app/api/v1/platform/onboarding/route.ts` — v1 re-export
- Any remaining `onboarding_step_*` references

### Task 7.3 — Redirect old URLs

Add redirect in Next.js config or middleware:

```
/onboarding/* → /setup (301 permanent redirect)
```

### Task 7.4 — Quality gates

```bash
pnpm typecheck
pnpm lint
pnpm build
```

### Acceptance

- Migration script runs successfully against dev database
- Old wizard files are removed (no imports reference them)
- `/onboarding/any-tenant-id` redirects to `/setup`
- All quality gates pass
- No data loss — all previous onboarding settings accessible via Setup Center

---

## Execution Order

Waves must execute sequentially (each depends on previous):

```
1 → 2 → 3 → 4 → 5 → 6 → 7
```

Within each wave, tasks can run in parallel where they touch different files.

## Risk Mitigation

| Risk                            | Mitigation                                                           |
| ------------------------------- | -------------------------------------------------------------------- |
| Migration data loss             | Dry-run mode, idempotent script, backup before production run        |
| Breaking existing tenant signup | Keep old wizard until Setup Center is verified; feature-flag rollout |
| Setup Center abandonment        | Optional sections, skip-all capability, dashboard integration nudges |
| HomeLayer clutter               | Setup card only shows when incomplete; minimal visual footprint      |

## Out of Scope (Future Phases)

- AI-assisted onboarding recommendations
- Platform maturity levels / scoring
- White-label deployment readiness checks
- Usage analytics for setup funnel optimization
- Automated setup verification (smoke tests)
- Guided migration wizards for existing tenants
