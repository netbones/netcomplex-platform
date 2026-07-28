---
title: Pending Work Items — Priority Assessment
status: current
reviewed: 2026-07-28
tags: [tracking, priorities, todos]
audience: all
---

# Pending Work Items — Priority Assessment

> Analyzed 2026-07-28. Items marked ⏳ verified against source code for currency.
> BD issue refs are included where noted in source documents.
>
> **P0** = Critical/blocked | **P1** = High (needed for anchor tenant launch) |
> **P2** = Medium (should do before production) | **P3** = Low (nice to have / deferred)

---

## P0 — Critical (blocking other work)

| Source       | Item                                                                         | Notes                                |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------ |
| MIGRATION.md | Steiger/lint already enforced but not reflected in doc status (doc is stale) | ⚠️ doc is stale — code ahead of docs |
| USER STORIES | Events P0 bug (`soralia-village-n2j6`)                                       | BD issue, not in PENDING.md          |

**No P0 items in PENDING.md are genuinely current.** The event bugs in BD are the only P0 work.

---

## P1 — High Priority

| Source                              | Item                                                                                                  | Why P1                                                        | BD / Tracked?          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| **AGENT_MODEL.md**                  | Agent verification workflow                                                                           | Schema has `isVerified`/`verificationDate` but no UI/workflow | —                      |
| **AGENT_MODEL.md**                  | Agent rating & review system                                                                          | Review system exists for services but not agents              | —                      |
| **cleaner_react_architecture.md**   | ~30 remaining raw `fetch()` call sites                                                                | Should migrate to tRPC for caching/stability                  | —                      |
| **DASHBOARD-PHASE-B-DISCUSSION.md** | Mobile overflow pattern (6 spaces > 5 slots)                                                          | Needs hardening before launch                                 | —                      |
| **DASHBOARD-PHASE-B-DISCUSSION.md** | Module gating enforcement in SpaceLauncher                                                            | Optional spaces must auto-hide when all flags disabled        | —                      |
| **MAINTENANCE_TICKETING_SPEC.md**   | Sort by date/priority/status                                                                          | No sort controls in admin UI or API                           | —                      |
| **MAINTENANCE_TICKETING_SPEC.md**   | Auto-notify resident on status change                                                                 | Email sent only on manual click, not automatically            | —                      |
| **MAINTENANCE_TICKETING_SPEC.md**   | ISR caching on list endpoint                                                                          | Missing Cache-Control headers                                 | —                      |
| **MAINTENANCE_TICKETING_SPEC.md**   | Notify admin on new request                                                                           | Event emitted but no notification delivered                   | —                      |
| **widget-registry**.md              | WidgetPermissionGate in WidgetRenderer                                                                | Permission not enforced during render                         | —                      |
| **MIGRATION.md**                    | Phase 1.3 lint guardrails (doc stale — code already has `no-restricted-imports` + Steiger at `error`) | Update docs to match reality                                  | `soralia-village-wpr`  |
| **MIGRATION.md**                    | Phase 3.5 enforce lint boundaries (doc stale — already `error` globally)                              | Update docs                                                   | —                      |
| **MIGRATION.md**                    | Phase 2.2 shared/api/\* infrastructure (doc stale — substantially complete)                           | Update docs                                                   | —                      |
| **migration-plan-identity.md**      | "My Households" section on dashboard                                                                  | Not implemented                                               | —                      |
| **migration-plan-identity.md**      | `/unit/[id]/manage` household management UI                                                           | Not implemented                                               | —                      |
| **migration-plan-identity.md**      | Agent dashboard section (when role=AGENT)                                                             | Widgets exist but no dedicated section                        | —                      |
| **WHITE_LABEL_MIGRATE.md**          | Organization switcher component                                                                       | No org/tenant switcher in Header                              | —                      |
| **WHITE_LABEL_MIGRATE.md**          | Better-Auth org plugin integration                                                                    | Organization model exists but org plugin status unclear       | —                      |
| **COMMUNIQUE.md**                   | Test `POST /api/auth/admin/stop-impersonating`                                                        | Not tested                                                    | —                      |
| **COMMUNIQUE-03.md**                | Domain card gating — audit all domain card components                                                 | Cards don't reference gate context store                      | —                      |
| **COMMUNIQUE-03.md**                | Add tooltip for gated cards                                                                           | Not implemented                                               | —                      |
| **COMMUNIQUE-03.md**                | `<FeatureGateWall>` wrapper component                                                                 | Not implemented                                               | —                      |
| **reports/PubSub.md**               | Dead achievement listener — `listener.ts` imported nowhere, achievement side effects never run        | Wire into app bootstrap or remove dead bus                    | `soralia-village-wxjg` |
| **reports/PubSub.md**               | Unsecured `payload` webhook — no HMAC signature, replay, or idempotency protection                    | Security issue, inconsistent with Paystack pattern            | `soralia-village-fucv` |

---

## P2 — Medium Priority

| Source                              | Item                                                                                            | Notes                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **PRD.md**                          | Tenant provisioning UI (NewTenantForm exists but no guided wizard)                              | —                                                                                         |
| **PRD.md**                          | Platform admin tenant management dashboard                                                      | No dedicated page for listing/managing tenants                                            |
| **PRD.md**                          | Module configuration UI (for tenant admins)                                                     | —                                                                                         |
| **PRD.md**                          | Migrate Soralia hardcoded slug (`DEFAULT_TENANT_SLUG = 'soralia'`)                              | —                                                                                         |
| **PRD.md**                          | Billing integration (real payment provider)                                                     | Models exist but no integration                                                           |
| **API.md**                          | OpenAPI CI validation (`npx redocly lint` in CI)                                                | —                                                                                         |
| **API.md**                          | Comprehensive API governance test suite                                                         | —                                                                                         |
| **API.md**                          | OpenAPI coverage for remaining ~211 procedures                                                  | ~24/235 exported                                                                          |
| **AGENT_MODEL.md**                  | Commission tracking system                                                                      | `commissionRate` exists but no tracking/payout                                            |
| **AGENT_MODEL.md**                  | Agent-investor messaging integration                                                            | General messaging exists, not agent-contextualized                                        |
| **AGENT_MODEL.md**                  | Agent onboarding flow                                                                           | No registration flow for agents                                                           |
| **AGENT_MODEL.md**                  | Premium Seat upgrade prompts in UI                                                              | —                                                                                         |
| **AGENT_MODEL.md**                  | Agent blacklist/blocking                                                                        | Not implemented                                                                           |
| **AGENT_MODEL.md**                  | Quality gates / pre-launch verification                                                         | —                                                                                         |
| **cleaner_react_architecture.md**   | Missing service layers for 7 entities (chat, directory, user, admin, identity, widget, service) | —                                                                                         |
| **cleaner_react_architecture.md**   | Missing DTO re-exports for several entities                                                     | —                                                                                         |
| **cleaner_react_architecture.md**   | `useApiToast.ts` (317 lines) paper layer over tRPC mutations                                    | —                                                                                         |
| **cleaner_react_architecture.md**   | Maintenance route duplication (REST + tRPC)                                                     | —                                                                                         |
| **DASHBOARD-PHASE-B-DISCUSSION.md** | Announcement absorption into Community/Messages space                                           | —                                                                                         |
| **DASHBOARD-PHASE-B-DISCUSSION.md** | B6 Mobile complete verification                                                                 | —                                                                                         |
| **MAINTENANCE_TICKETING_SPEC.md**   | CSV export for requests                                                                         | —                                                                                         |
| **widget-registry**.md              | Config versioning/migration (`resolveConfig`)                                                   | Not implemented                                                                           |
| **widget-registry**.md              | Collapsed state on widgets (widgets don't handle `collapsed` prop)                              | —                                                                                         |
| **widget-registry**.md              | `useSuspenseQuery` for widget data fetching                                                     | Widgets use `useEffect`+`fetch`                                                           |
| **widget-registry**.md              | Instance ID generation for placed widgets                                                       | —                                                                                         |
| **widget-registry**.md              | Persisted `collapsed`/`configVersion` on WidgetLayout                                           | —                                                                                         |
| **MIGRATION.md**                    | Fix `pnpm run build` (pg module)                                                                | May now pass — needs verification                                                         |
| **MIGRATION.md**                    | Make boundary violations fail CI (Steiger already `error` — doc stale)                          | Update docs                                                                               |
| **MIGRATION.md**                    | Verify no deep imports within new slices (Steiger enforces — doc stale)                         | Update docs                                                                               |
| **MIGRATION.md**                    | Tighten lint boundaries per domain (Steiger already `error`)                                    | Update docs                                                                               |
| **DATABASE_MIGRATION_v2.1.md**      | API responses include new fields (`landlord`, `residencyType`)                                  | Partial coverage                                                                          |
| **DATABASE_MIGRATION_v2.1.md**      | Frontend interfaces updated                                                                     | Partial coverage                                                                          |
| **DATABASE_MIGRATION_v2.1.md**      | No breaking changes verification                                                                | Need to verify                                                                            |
| **WHITE_LABEL_MIGRATE.md**          | Replace hard-coded "Soralia Village" text with dynamic tenant values                            | Partial                                                                                   |
| **WHITE_LABEL_MIGRATE.md**          | Update all existing rows with tenantId                                                          | —                                                                                         |
| **WHITE_LABEL_MIGRATE.md**          | Existing users become members of Soralia org                                                    | —                                                                                         |
| **WHITE_LABEL_MIGRATE.md**          | Add tenantId to all tables                                                                      | Most done, few may remain                                                                 |
| **MULTI_TENANT_SIGNUP.md**          | Email uniqueness per tenant (not global)                                                        | —                                                                                         |
| **MULTI_TENANT_SIGNUP.md**          | Test with local subdomain (e.g. soralia.localhost:3000)                                         | —                                                                                         |
| **GATE_PLAN.md**                    | All new routes use `canAccess()` or `canAccessClient()`                                         | —                                                                                         |
| **GATE_PLAN.md**                    | Migration progress tracked per-entity in contexts/\*.md                                         | —                                                                                         |
| **GATE_PLAN.md**                    | `canAccess()`/`canAccessClient()`/`GateGuard` as only public gate API                           | —                                                                                         |
| **ADVISORY-027.md**                 | Seat/Invoice/Payment model duplication                                                          | `soralia-village-sioz`                                                                    |
| **ADVISORY-031.md**                 | Onboarding refactor (canonical)                                                                 | Phase 0 nullable tenantId not done                                                        |
| **contexts/competitions.md**        | Missing competition widget registration                                                         | —                                                                                         |
| **contexts/widget.md**              | Phase 38 (ServicesLayer + MessagesLayer) pending                                                | ServicesLayer exists but architecture milestone not done                                  |
| **COMMUNIQUE-03.md**                | Wrap gated pages with FeatureGateWall                                                           | Depends on FeatureGateWall existing                                                       |
| **COMMUNIQUE-03.md**                | Remove per-page 403 handling                                                                    | Depends on above                                                                          |
| **STANDARDS/TECH_DEBT_REMEDIATION** | ~26 still-open items (p2 bucket)                                                                | Error boundaries, React.memo, ESLint rules, a11y, Prettier, perf monitoring, Vercel costs |
| **STANDARDS/dependency-analysis**   | Supabase region verification                                                                    | —                                                                                         |
| **STANDARDS/dependency-analysis**   | Edge Runtime migration (blocked by deps)                                                        | —                                                                                         |
| **STANDARDS/dependency-analysis**   | Vercel spend alerts & scaling limits                                                            | —                                                                                         |
| **CMS_AUDIT_DISCOVERY.md**          | Content versioning — no revision history, diff, or rollback exists                              | Per CMS audit report, see `docs/reports/CMS_AUDIT_DISCOVERY.md` §7                        |
| **CMS_AUDIT_DISCOVERY.md**          | Content moderation — no multi-stage review pipeline, single-step publish/unpublish only         | Per CMS audit report §8. Existing admin has basic publish/flag — no staged workflow       |
| **reports/PubSub.md**               | Pick one event topology and document it — Supabase vs node:events vs cache invalidation         | Architectural decision, needs ADR                                                         |
| **reports/PubSub.md**               | Add event catalog mapping every DomainEvent to producer and consumer                            | CI check that every event has ≥1 emitter and ≥1 handler                                   |

---

## P3 — Low Priority (deferred / aspirational)

| Source                                | Item                                                                                   | Notes                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------- | --- |
| **PRD.md**                            | Platform analytics dashboard                                                           | Cross-tenant analytics                                   |
| **AGENT_MODEL.md**                    | Agent performance analytics                                                            | —                                                        |
| **AGENT_MODEL.md**                    | Commission payment processing (needs UCP/AP2)                                          | —                                                        |
| **AGENT_MODEL.md**                    | Property listing analytics                                                             | —                                                        |
| **AGENT_MODEL.md**                    | Agent specialization matching                                                          | —                                                        |
| **AGENT_MODEL.md**                    | External real estate platform integration                                              | —                                                        |
| **AGENT_MODEL.md**                    | All success metrics (conversion, engagement, deals)                                    | —                                                        |
| **cleaner_react_architecture.md**     | Domain predicates in `useIdentity.ts` as pure functions                                | —                                                        |
| **cleaner_react_architecture.md**     | Permissions module expansion                                                           | —                                                        |
| **MOBILE_MONOREPO.md**                | All 8 app store readiness items (blocked on app existence)                             | Privacy policy, screenshots, etc.                        |
| **widget-registry**.md                | react-rnd drag-and-drop grid (all items)                                               | No WidgetContainer, resize, drag                         |
| **widget-registry**.md                | MobileWidgetCard, useIsMobile, breakpoint testing                                      | —                                                        |
| **widget-registry**.md                | Remote widget loading (loader field, Module Federation)                                | —                                                        |
| **MIGRATION.md**                      | Remove empty legacy buckets (src/components/ empty, src/lib/ gone — doc stale)         | Already done                                             |
| **MIGRATION.md**                      | Update README (doc stale — already marked done)                                        | Already done                                             |
| **migration-plan-identity.md**        | Phase 5: Remove legacy fields (already removed from schema)                            | Already done                                             |
| **ADVISORY-030.md**                   | Onboarding refactor (earlier draft)                                                    | **SUPERSEDED** by ADVISORY-031                           |
| **contexts/widget.md**                | Phase 38 architecture milestone                                                        | ServicesLayer exists, milestone unplanned                |
| **COMMUNIQUE-03.md**                  | Document tier decision in ADR                                                          | —                                                        |
| **STANDARDS/TESTING_METHODS.md**      | All 17 manual E2E testing items                                                        | Ongoing QA activity                                      |
| **STANDARDS/dependency-analysis.md**  | Vercel Blob migration (not adopted)                                                    | Project chose different approach                         |
| **STANDARDS/dependency-analysis.md**  | Clerk auth migration (not adopted)                                                     | Project chose Better Auth                                |
| **STANDARDS/dependency-analysis.md**  | Full Edge Runtime deployment (not adopted)                                             | —                                                        |
| **STANDARDS/dependency-analysis.md**  | Edge-compatible health check                                                           | —                                                        |
| **STANDARDS/dependency-analysis.md**  | Monitor cost reduction                                                                 | —                                                        |
| **PRODUCT/user-stories-john-mary.md** | All 114 user stories (full anchor tenant roadmap)                                      | M5 launch aspirational scope                             |
| **TECH_DEBT_REMEDIATION_PLAN.md**     | P3 remaining items (unused code, logging, Core Web Vitals, Sentry)                     | Nice-to-have improvements                                |
| **reports/EVENT_REPORT.md**           | Recurring events support (#11)                                                         | `soralia-village-tepl`                                   |
| **reports/EVENT_REPORT.md**           | Font Awesome → lucide-react migration (#13)                                            | `soralia-village-e4fy` (69 occurrences in admin widgets) |
| **reports/EVENT_REPORT.md**           | Split `DisputeEventType` enum (#16)                                                    | `soralia-village-f1k7`                                   |
| **reports/EVENT_REPORT.md**           | Lowercase `user` model — coordinate with Better Auth upgrade (#17)                     | Not tracked — defer to Better Auth upgrade               |
| **reports/PubSub.md**                 | Standardize client cross-component signaling — replace ad-hoc window CustomEvents      | One existing case (PageSettingsWidget→Header)            | —   |
| **reports/PubSub.md**                 | Add delivery observability — count emits/handlers, dead-letter for failed side effects | Metrics, error surfacing                                 | —   |

---

## Items Confirmed as Already Implemented (source docs need ✅ update)

These are marked ⏳ in source docs but code confirms they are done:

| Source                             | Item                                                             | Code Evidence                                                     |
| ---------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| **contexts/chat.md**               | Message pruning (30-day retention)                               | Drizzle-based pruning in message route                            |
| **contexts/content.md**            | Content DTO in shared barrel                                     | Exported at `src/shared/api/dto/index.ts:11`                      |
| **contexts/user.md**               | `residentType` overlap                                           | Resolved — `residencyType` used consistently                      |
| **contexts/user.md**               | Suspension frontend                                              | `SuspendUserModal.tsx` + `UsersListSection.tsx` live              |
| **COMMUNIQUE.md**                  | `admin()` plugin configured                                      | In `auth.ts:178-180`                                              |
| **COMMUNIQUE.md**                  | `customSyntheticUser` config                                     | In `auth.ts:65-72`                                                |
| **COMMUNIQUE.md**                  | `banned`/`banReason`/`banExpires` columns                        | In `schema.prisma:121-123`                                        |
| **COMMUNIQUE.md**                  | `impersonatedBy` on session table                                | In `schema.prisma:79`                                             |
| **COMMUNIQUE-03.md**               | Gate context endpoint (`GET /api/gate/context`)                  | Route exists                                                      |
| **COMMUNIQUE-03.md**               | Zustand store (`useGateContextStore`)                            | At `entities/tenant/model/gate-context-store.ts`                  |
| **COMMUNIQUE-03.md**               | Dev tier decision (Soralia = PREMIUM)                            | Seeded as PREMIUM                                                 |
| **COMMUNIQUE-03.md**               | Apply tier to seed data (PlatformModule)                         | Done                                                              |
| **MIGRATION.md**                   | Phase 1.3: no-restricted-imports rules                           | Active in eslint.config.js                                        |
| **MIGRATION.md**                   | Phase 3.5: enforce lint boundaries                               | Steiger at `error` globally                                       |
| **MIGRATION.md**                   | Legacy bucket removal (`src/lib/` gone, `src/components/` empty) | Verified                                                          |
| **MIGRATION.md**                   | Lint boundaries prevent backsliding                              | Steiger in CI/pre-commit                                          |
| **migration-plan-identity.md**     | Phase 5: Remove legacy User fields                               | `street`, `unit`, `homeImage`, `residentType` removed from schema |
| **NETCOMPLEX_WIDGET_ALIGNMENT.md** | Version on widgets (gap resolved)                                | All have `version: '1.0.0'`                                       |
| **NETCOMPLEX_WIDGET_ALIGNMENT.md** | Lazy loading (gap resolved)                                      | All use `React.lazy()`                                            |
| **NETCOMPLEX_WIDGET_ALIGNMENT.md** | `icon` as component (gap resolved)                               | All use Lucide components                                         |
| **NETCOMPLEX_WIDGET_ALIGNMENT.md** | `author` field (gap resolved)                                    | On WidgetManifest                                                 |

---

## Summary by Priority

| Priority             | Items | Notes                                                                                                                     |
| -------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------- |
| **P0**               | 0     | No P0 items genuinely pending in PENDING.md                                                                               |
| **P1**               | ~20   | Agent verification, maintenance notifications, gate enforcement, household management UI, org switcher, FSD doc staleness |
| **P2**               | ~50   | Tenant provisioning UI, billing, API governance, commission tracking, widget patterns, migration doc staleness, tech debt |
| **P3**               | ~155+ | Analytics, mobile app store, react-rnd grid, user stories (114), event report items (4), aspirational standards           |
| **Done (doc stale)** | ~20   | Items confirmed implemented in code but still marked ⏳ in docs                                                           |

---

## Reference Documents (no pending items)

| Source                             | Purpose                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **reports/CMS_COMPARISON.md**      | Headless CMS platform comparison (Payload, Strapi, Contentful, Sanity, Directus, Ghost) — patterns to consider, no actionable items |
| **reports/CMS_AUDIT_DISCOVERY.md** | Full CMS implementation audit of existing TipTap/Content system — two P2 findings above (versioning, moderation workflow)           |
| **reports/EVENT_REPORT.md**        | Events system review — 17 issues identified, 13/17 resolved, 4 P3 remaining (see P3 table above)                                    |

## Action Items

1. Update source docs for ~20 confirmed-implemented items (⏳ → ✅)
2. Convert P1 items without BD issues into BD issues
3. Assess user-stories-john-mary.md (114 items) as M5 milestone scope — split into BD issues
4. Resolve MIGRATION.md doc staleness (many items done but still marked pending)
5. Remove duplicate widget-registry doc (`features/widget-registry-architecture-react-rnd-v2.md` = `features/widgets/widget-registry-architecture-react-rnd-v2.md`)
