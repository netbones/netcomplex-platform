# Phase 123: Setup Center — Context

**Source:** ADVISORY-028 — Replace Immediate Onboarding Wizard with a Persistent Setup Center
**BD issue:** soralia-village-0jh1
**Milestone:** M5+ (Post-Launch Enhancement)
**Priority:** High

## Current State

The current onboarding flow (Phase 20 Self-Service Inception, expanded in Phase 27) is a mandatory 7-step linear wizard:

```
Signup → Branding → Modules → Facilities → Maintenance → Pages → Invite → Launch → Dashboard
```

Problems identified by ADVISORY-028:

- User is blocked from exploring the platform
- Long 7-step wizard increases abandonment risk
- Difficult to add new setup tasks (each new feature makes wizard longer)
- Setup is treated as a one-time event, not a lifecycle
- No way to resume or track progress across sessions
- Progress tracked as ad-hoc `onboarding_step_N` Setting keys (no structured model)

## Target Architecture

The Setup Center replaces the wizard with a **persistent operational workspace**:

```
Registration → Identity → Setup Center (permanent) → Continuous Adoption
```

Four permanent sections:

1. **Launch** — Core identity (name, branding, domain, timezone, address) — REQUIRED for public launch
2. **Populate** — People (invite board, residents, roles, service accounts, import)
3. **Configure** — Platform capabilities (modules, facilities, maintenance, bookings, wallet, etc.) — OPTIONAL
4. **Grow** — Recommendations that evolve over time (new features, adoption tips)

## Key Design Decisions

- **Not a wizard** — persistent dashboard, not a sequence
- **Auto-save** — every change persists immediately
- **Resume anywhere** — progress tracked in database, not session state
- **Progressive disclosure** — show features before asking to configure them
- **Mission-based** — reframe setup tasks as achievements, not obligations
- **Continuous onboarding** — the Setup Center never truly ends; becomes a health dashboard after launch

## Relevant Code Locations

| Area               | Files                                               |
| ------------------ | --------------------------------------------------- |
| Onboarding feature | `src/features/onboarding/` (7-step wizard)          |
| Onboarding page    | `src/app/(platform)/onboarding/[tenantId]/page.tsx` |
| Onboarding API     | `src/app/api/platform/onboarding/route.ts`          |
| Signup             | `src/app/(platform)/signup/page.tsx`                |
| Signup API         | `src/app/api/platform/tenants/route.ts`             |
| Dashboard          | `src/widgets/dashboard/ui/HomeLayer.tsx`            |
| Schema             | `prisma/schema/schema.prisma` (Setting model)       |
| Navigation         | `src/entities/navigation/`                          |

## Dependencies

- Phase 20 (existing onboarding wizard to replace)
- Phase 30 (HomeLayer — dashboard integration point)
- Phase 34 (AdminLayer — admin command panel pattern)
- Phase 41 (feature gates — module configuration)
- Phase 27 (facility/category tenant config)

## Out of Scope

- AI-assisted onboarding (future extension)
- Usage analytics integration (future extension)
- White-label deployment readiness (future extension)
- Changing the signup/registration flow (only the post-signup setup experience)
