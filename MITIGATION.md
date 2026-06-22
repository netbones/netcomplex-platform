# Structural Problem

## PROBLEM STATEMENT

Our admin route is /admin with /dashboard/admin a redirect to /admin. Our current /admin dashboard has management domain cards, one of which should be provider management and billing. GPT built out /dashboard/admin [] with sub dashboards at /dashboard/admin/providers etc. I can't see exactly what is happening when I look at /src/app/(tenant)/dashboard or admin. We need to resolve this before closing further gaps. I also notice that my user with role ADMIN is shown Providers Space in Space Launcher, with request to 'Complete your provider registration'. Only PROVIDER role should see the provider icon for provider space in space launcher and other spaces should be restricted. ADMIN role will be able to set if they want to see the Provider icon in space launcher or not (it does clutter), and perhaps the link would be directly the Provider Admin not the Provider Space when role is ADMIN.

## ANALYSIS

This is a structural problem that needs to be resolved before closing further gaps.

- problem sources: the provider admin UI was added under legacy `/dashboard/admin/*`, and the provider space visibility is still purely flag-based. I’m checking the canonical `/admin` route group and the admin domain-card pattern now so I can align the provider work to the actual architecture.

- Confirmed the canonical admin surface is `/admin` and the Phase 46 work incorrectly added a parallel legacy `/dashboard/admin/*` tree. I’m reading the admin domain definitions and route group structure next so I can move provider management into the existing `/admin` domain-card architecture.

- Confirmed the real fix should be architectural, not cosmetic: the provider admin pages belong under canonical `/admin/*`, and the legacy `/dashboard/admin/*` paths should only redirect. I'm inspecting the provider/admin components now so I can re-home them cleanly and tighten provider-space visibility at the launcher level.

- Confirmed there is no `PROVIDER` role in the codebase today — provider access is derived from linked provider records/listings— so we need to implement the behavior in those terms.

- Check available admin icons/assets and route patterns so we can move provider management into `/admin` and stop showing the provider space to admins by default.

# IMPLEMENTATION

STEPS:

- [x] 1. Add `providers` domain to canonical `/admin` domain grid
  - Add `providers` entry to `ADMIN_DOMAIN_DEFINITIONS` in `AdminSubLauncher.tsx`
  - Add `providers` to `ADMIN_DOMAINS` constant array
  - Domain card will auto-render; link targets `/admin/providers`

- [x] 2. Migrate provider admin pages from `/dashboard/admin/*` to `/admin/providers/*`
  - Create `src/app/(tenant)/admin/providers/` route group with sub-pages
  - Reuse existing admin components (ProviderModerationDashboard, ProviderDetailView, etc.)
  - Add redirect from legacy `/dashboard/admin/providers/*` to `/admin/providers/*`

- [x] 3. Fix Space Launcher visibility — gate providers space to linked records, not feature flag only
  - Update `src/widgets/dashboard/model/spaces.ts` — providers space hidden for admin/board roles
  - ADMIN/BOARD users will NOT see the provider space icon in Space Launcher
  - Actual providers (residents with linked records) see the provider space as before

- [x] 4. Fix "Complete your provider registration" shown to admins
  - In `ProvidersLayer.tsx`: admin/board users are redirected to `/admin/providers`
  - Non-admin providers see the registration prompt as before

- [ ] 5. Verification pass — confirm admin `/admin/providers` works and space launcher shows correctly per user type

POST-MITIGATION (narrow gaps):

- [ ] Legacy PayPal transactions (pre-capture-ID): backward-compatible refund handling
- [ ] Gateway health: active probes instead of config+outcome inference
- [ ] Audit history: dedicated immutable history table (currently timeline/audit-based)

## Progress Log

| Step | Status | Notes |
| ---- | ------ | ----- |
| 1    | ⬜     |       |
| 2    | ⬜     |       |
| 3    | ⬜     |       |
| 4    | ⬜     |       |
| 5    | ⬜     |       |

Phase 46 is in much better shape now, but a couple of narrower items remain if you want full hardening:

- older PayPal transactions created **before** capture IDs were persisted may still require manual handling for refunds
- gateway health is still inferred from config + recent outcomes, not active probes
- deeper verification/moderation history is still timeline/audit based, not a dedicated immutable history table

If you want, I can continue with one of these next:

1. add backward-compatible handling for legacy PayPal transactions
2. do a final Phase 46 verification pass and decide whether it’s ready to mark complete
3. push the `phase-46-provider-platform` branch
