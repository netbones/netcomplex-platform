Netcomplex Codebase — Complete Exploration

1. TOP-LEVEL DIRECTORY STRUCTURE

```bash
/home/ubuntupunk/Projects/soralia-village/
├── .beads/                    # BD issue tracker storage
├── .commandcode/              # CommandCode configs
├── .dependency-cruiser.cjs    # Dependency cruiser config
├── .documents/                # DocHub knowledge base
├── .env / .env.example / .env.local / .env.schema  # Environment configs
├── .git/                      # Git repository
├── .github/                   # GitHub workflows/templates
├── .gitmodules                # Git submodules
├── .husky/                    # Git hooks
├── .kilo/                     # Kilo tooling
├── .madgerc                   # Madge config
├── .next/                     # Next.js build output
├── .npmrc                     # npm/pnpm config
├── .opencode/                 # OpenCode configs
├── .planning/                 # GSD phase planning (milestones, roadmap, retros)
├── .prettierignore / .prettierrc
├── .redocly.yaml              # API linting config
├── AGENTS.md                  # Agent instructions
├── components.json            # shadcn/ui config
├── CONTRIBUTING.md
├── coverage/                  # Test coverage reports
├── docs/                      # Project documentation (STEERING/ etc.)
├── drizzle.config.ts          # Drizzle ORM config
├── drizzle/                   # Drizzle migrations meta
├── e2e/                       # End-to-end test configs
├── env.d.ts
├── eslint.config.js / eslint.config.mjs
├── fsd-detailed-dependencies.html / fsd-high-level-dependencies.html
├── justfile                   # Just task runner
├── LICENSE
├── lint_report.md
├── mail/                      # Email templates
├── next-env.d.ts
├── next.config.mjs            # Next.js configuration
├── node_modules/
├── opencode.json              # OpenCode config
├── package.json
├── patches/                   # pnpm patches
├── playwright.config.ts       # E2E test config
├── pnpm-lock.yaml
├── pnpm-workspace.yaml        # pnpm monorepo workspace
├── postcss.config.cjs
├── prisma/                    # Prisma schema + migrations
├── prod-ca-2021.crt           # Production CA certificate
├── public/                    # Static assets
├── README.md
├── scripts/                   # Utility/build scripts
├── SETTINGS_REPORT.md
├── src/                       # Application source code
├── steiger.config.js          # FSD architecture enforcement (Steiger)
├── supabase/                  # Supabase configs/migrations
├── tailwind.config.cjs        # Tailwind CSS config
├── test-email.ts
├── test-results/              # Playwright/vitest results
├── tree.md
├── tsconfig.json              # TypeScript config
├── tsconfig.tsbuildinfo
├── typecheck_report.md
├── vercel.json                # Vercel deployment config
└── vitest.config.ts           # Vitest test config
2. DIRECTORIES UNDER src/
src/
├── app/                # Next.js App Router (pages, layouts, API routes)
├── components/         # React components (legacy/additional)
│   └── admin/          # Admin-specific components (10 files)
├── db/                 # Database layer
│   ├── __tests__/
│   ├── index.ts
│   └── schema/         # Drizzle schema files (285 files — auto-generated from Prisma)
├── entities/           # FSD entities layer (21 entities)
├── features/           # FSD features layer (24 features)
├── instrumentation-client.ts
├── LICENSE
├── middleware.ts       # Next.js middleware
├── page-modules/       # FSD pages layer (7 page-modules)
├── server/             # Server-side logic (tRPC routers, DTOs, OpenAPI, payments)
├── shared/             # FSD shared layer
│   ├── api/            # Shared API utilities (auth, DB, tRPC, email, AI, storage)
│   ├── declarations/   # CSS module declarations
│   ├── lib/            # Shared libraries (hooks, constants, i18n, billing, providers)
│   └── ui/             # Shared UI components (36 entries — layout, editors, widgets)
├── test/               # Test infrastructure
├── widgets/            # FSD widgets layer (9 widget categories)
└── README.md
Note: There is no src/lib/ directory. The shared lib layer lives at src/shared/lib/. There is no src/types/ directory either — types are co-located within entity/feature modules.
3. prisma/ AND drizzle/ DIRECTORIES
prisma/
prisma/
├── migrations/                         # 37 migration directories
│   ├── 0_baseline/
│   ├── 20260618160000_add_rls_policies/
│   ├── 20260618160001_add_rls_indexes/
│   ├── 20260618160002_optimize_rls_initplan/
│   ├── 20260618160003_add_missing_fk_indexes/
│   ├── 20260618160004_fix_function_search_path/
│   ├── 20260619000000_add_behavior_record/
│   ├── 20260620000000_add_timestamps_to_setting/
│   ├── 20260620010000_add_schema_version_to_setting/
│   ├── 20260621205302_rename_behavior_record_to_community_merits/
│   ├── 20260622000000_add_provider_fk_relations/
│   ├── 20260623000000_add_notification_preferences/
│   ├── 20260623084645_rename_provider_credit_to_reputation/
│   ├── 20260623092113_add_evidence_url_to_provider_merits/
│   ├── 20260623093522_add_dispute_history_to_community_merits/
│   ├── 20260623095534_add_notification_type_enum_payload_readat_senderid/
│   ├── 20260623131106_content_type/
│   ├── 20260623170016_provider_enum/
│   ├── 20260623182500_add_achievements/
│   ├── 20260623183000_normalize_provider_table_naming/
│   ├── 20260623184500_add_due_diligence_items/
│   ├── 20260624000000_add_user_role_and_seat_lifecycle/
│   ├── 20260624010000_add_user_id_to_service_provider/
│   ├── 20260624020000_fix_service_provider_isactive_default/
│   ├── 20260624100000_add_tenant_icon/
│   ├── 20260625133302_add_ai_pool_models/
│   ├── 20260625143753_add_tenant_billing_models/
│   ├── 20260625192155_add_dwallet_module/
│   ├── 20260626084137_add_dispute_resolution/
│   ├── 20260626100000_add_estimated_cost_usd/
│   ├── 20260627000000_add_internal_maintenance_notes/
│   ├── 20260628104925_add_maintenance_routing_fields/
│   ├── 20260629120000_add_rls_achievements/
│   ├── 20260629130000_fix_rls_schema_usage/
│   ├── 20260630000000_add_address_registry/
│   ├── manual_add_tenant_billing_models/
│   └── migration_lock.toml
├── schema.prisma                       # Main Prisma schema (~2955 lines, ~200+ models)
├── seed.ts                             # Seed script
└── seed/
    └── modules.ts                      # Tenant modules seed data
drizzle/
drizzle/
└── meta/
    └── _journal.json                   # Drizzle migration journal
4. .planning/ DIRECTORY CONTENTS
.planning/
├── .workstreams/
│   └── phase-101-soft-deletes/
├── 34-01-ADVISORY.MD
├── ADVISORY.md
├── archive/
│   └── DISCUSSION.md
├── BD.md                              # BD issue tracker bridge
├── CADENCE.md                         # Sprint/release cadence tracking
├── config.json                        # GSD configuration
├── DASHBOARD-PHASE-A-PLAN.md
├── DISCUSSION-ADMIN-LAYER.md
├── GAPS.md                            # Known gaps/debt
├── GATE_ADVISORY.md
├── MERITS_DISCUSSION.md
├── MILESTONES.md                      # M0-M6+ milestone definitions
├── observability-soak-M5.md
├── phases/                            # 65 phase directories (see below)
├── PLANS/
│   └── dynamic-pages-flags-plan.md
├── PROJECT.md
├── REQUIREMENTS.md
├── retros/
│   ├── M0-retro.md
│   ├── M1-retro.md
│   ├── M2-retro.md
│   └── M3-retro.md
├── ROADMAP.md
├── STATE.md
├── templates/
│   └── retro.md
└── todos/
    ├── fsd-cleanup.md
    └── pending/
        └── 2026-04-04-enhance-maintenance-ticketing-admin-features.md
```

## 65 Phase directories under .planning/phases/:

00-multi-tenant-foundation, 01-enforcement, 02-admin-ui, 03-localization, 03-second-tenant, 04-content-i18n, 05-widget-registry-alignment, 06-maintenance-requests, 07-facility-booking, 08-module-architecture, 09-real-time-chat, 10-email-notifications, 100-plan-45, 101-soft-deletes, 102-achievements-system, 103-gallery-album-sharing, 104-ai-provider-infrastructure-translate-migration, 105-dispute-schema-entity-layer, 106-dispute-api-routes-intake-screen, 107-dispute-ui-widgets, 108-csos-export-package, 109-ai-pool-surcharge-billing, 11-announcements, 11-prisma-to-drizzle, 110-page-nav-access-control, 111-agent-gateway, 112-monorepo-full-milestone, 113-monorepo-scaffold-m0, 118-agent-gateway-hardening, 120-api-governance-hardening, 121-settings-unification, 18-toast-unification, 19-schema-corrections, 20-self-service-inception, 21-content-events, 22-page-flag-expansion, 23-competitions-resources, 24-dashboard-enhancement, 25-gap-closure, 26-navigation-alignment, 27-tenant-config-and-gaps, 28-proxy-consolidation, 29-dashboard-defaults, 30-dashboard-phase-b, 31-dashboard-tab-removal, 32-users-list-refactor, 33-user-suspension, 34-admin-layer, 35-api-alignment, 36-survey-builder, 37-admin-route-consolidation, 38-space-layers, 39-competition-entries, 40-maintenance-ticketing, 41-feature-gate-consolidation, 42-i18n-hydration-fix, 43-m4-5-blockers, 44-m5a-hardening, 45-m5b-anchor-tenant, 46-provider-platform, 46.1-platform-saas-billing-foundation, 46.2-address-registry, 47-dwallet-planning-build, 50-service-marketplace, 99-build-fix

# 5. package.json — DEPENDENCIES & SCRIPTS

## Scripts

| Script             | Command                                                |
| ------------------ | ------------------------------------------------------ |
| dev                | next dev                                               |
| build              | next build                                             |
| start              | next start                                             |
| lint               | eslint src/                                            |
| typecheck          | tsc --noEmit                                           |
| format             | prettier --write .                                     |
| db:generate        | prisma generate                                        |
| db:push            | prisma db push                                         |
| db:check           | prisma generate && git diff --exit-code src/db/schema/ |
| db:seed            | tsx scripts/seed-drizzle.ts                            |
| db:seed:village    | same with --only=soralia                               |
| db:seed:solaris    | same with --only=solaris-heights                       |
| db:studio          | drizzle-kit studio                                     |
| test               | vitest                                                 |
| test:run           | vitest run                                             |
| test:coverage      | vitest run --coverage                                  |
| test:e2e           | playwright test                                        |
| api:generate       | Generate OpenAPI spec                                  |
| api:lint           | Lint OpenAPI spec with Redocly                         |
| api:ci             | Generate + lint OpenAPI                                |
| fsd:check          | steiger ./src                                          |
| fsd:graph          | Dependency cruiser high-level graph                    |
| fsd:graph:detailed | Dependency cruiser detailed graph                      |

## Key Dependencies (97 total)

Category Packages
Framework next@^15.5.0, react@^19.2.4, react-dom@^19.2.4
Auth better-auth@^1.5.6, @better-auth/drizzle-adapter, @better-auth/passkey, @better-auth/cli
Database @prisma/client@5.22.0, drizzle-orm@^0.45.2, @neondatabase/serverless, pg, postgres
ORM Tools prisma@5.22.0, drizzle-kit@^0.31.10, prisma-generator-drizzle, drizzle-zod
API @trpc/client@^11.17.0, @trpc/server, @trpc/next, @trpc/react-query, @trpc/openapi, @redocly/cli
State/Data @tanstack/react-query@^5, zustand@^5.0.12, superjson
Forms react-hook-form@^7.72.0, @hookform/resolvers, zod@^3.25.76
UI tailwindcss@^3.4.19, lucide-react, @radix-ui/react-accordion, @radix-ui/react-tooltip, sonner, @dnd-kit/core/sortable/utilities
Editor @tiptap/react@^3.21.0, @tiptap/starter-kit, tiptap extensions
Maps leaflet@^1.9.4, react-leaflet@^5.0.0
Real-time @supabase/supabase-js@^2.101.1
Email resend@^6.12.2
AI @anthropic-ai/sdk, openai@^6.45.0
i18n i18next@^25.10.10, react-i18next, i18next-browser-languagedetector, i18next-http-backend
Logging pino@^10.3.1
Analytics @posthog/next@0.4.82, posthog-js@1.382.0
Flags flags@^4.0.6, @flags-sdk/statsig
Storage @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
Security @varlock/nextjs-integration, varlock, dompurify, validation-better-auth, jose
Misc usehooks-ts, uuid, emoji-mart, frimousse, @xyflow/react, codemod, server-only, type-fest
Package Manager pnpm@11.9.0

## 6. next.config.mjs

- reactStrictMode: true
- serverExternalPackages: pino, ioredis
- allowedDevOrigins: app.netbones.co.za
- Images: DiceBear (avatars), Google (OAuth), Unsplash, Supabase storage, netbones local
- Custom Headers: Cache-Control for /api/stats (5min) and /api/content (3min)
- Rewrites: PostHog ingestion proxy (/ingest/:path\*)
- Webpack: Client-side polyfills disabled for dns, fs, net, tls

## 7. tsconfig.json

- Target: ES2022
- Strict mode: enabled
- Module: esnext with bundler resolution
- JSX: preserve (Next.js handles)
- Path aliases (FSD structure):
- @/_ → ./src/_
- @shared/_ → ./src/shared/_
- @api/server / @api/client / @api/shared
- @entities/_ → ./src/entities/_
- @entities/{tenant,content,maintenance,event,booking,dwallet,dispute,marketplace}/server
- @features/_ → ./src/features/_
- @widgets/_ → ./src/widgets/_
- @pages/_ → ./src/page-modules/_
- @processes/_ → ./src/processes/_
- @schema/_ → ./src/db/schema/_
- @server/_ → ./src/server/_

## 8. tailwind.config.cjs

- Content paths: src/pages/, src/components/, src/app/, src/shared/, src/entities/, src/features/, src/widgets/, src/page-modules/
- Custom Colors:
- soralia: primary (#4F46E5), secondary (#10B981), accent (#F59E0B), dark, light
- lapis: deep (#0F1F4A), mid (#1E3A7A), azure (#4A7AB5)
- gold: vein (#C8A84B)
- vellum: DEFAULT (#F2ECD8), light (#EAF0FA)
- Font: Uses CSS custom property --font-family with fallback to Inter
- Custom shadows: card, card-hover
- Custom animations: fade-in, slide-up, pulse-slow

## 9. ALL FILES IN src/app/

Route Group (auth)/ (6 pages + 1 layout)

- layout.tsx
- forgot-password/page.tsx
- reset-password/page.tsx
- sign-in/page.tsx
- sign-up/page.tsx
- verify-email/page.tsx
- verify-otp/page.tsx
  Route Group (dashboard)/
- disputes/[id]/page.tsx
  Route Group (platform)/ (7 entries)
- layout.tsx
- home/page.tsx
- login/page.tsx
- onboarding/[tenantId]/, onboarding/layout.tsx
- pricing/page.tsx
- signup/page.tsx
- admin/platform/[id]/, admin/platform/new/, admin/platform/page.tsx
  Route Group (tenant)/ (7 top entries + deep admin + dashboard)
- layout.tsx, page.tsx
- Dashboard: dashboard/[space]/layout.tsx, dashboard/[space]/page.tsx, dashboard/admin/ (analytics, providers, revenue, settings, transactions, domain), dashboard/communication/ (announcements, domain), dashboard/layout.tsx, dashboard/page.tsx, dashboard/providers/ (billing), dashboard/services/ (bookings, events, domain), dashboard/wallet/page.tsx
- Admin (24 subdirectories): achievements, announcements, bookings, campaigns, carousel, categories, competitions, content, disputes, dwallet, events, external-surveys, groups, households, layout.tsx, merits, page.tsx, providers, requests, resources, services, surveys, system, users
- Tenant Billing: tenant/billing/ (layout, payment-methods, invoices, page)
- Education: education/page.tsx
- Providers: providers/register/page.tsx
  i18n Route [lng]/
- layout.tsx, platform/layout.tsx, platform/home/page.tsx

## API Routes (src/app/api/ — 58 subdirectories)

API Route Sub-routes
access/ route.ts
achievements/ route.ts, progress/
admin/ (admin API)
agent/ (agent API)
agents/ activity/
announcements/ route.ts, [id]/
auth/ [...all]/, signup/, suspension-status/
bookings/ route.ts
campaign/ (campaign API)
chat/ (chat API)
community-services/ inquiries/, reviews/, analytics/, moderation/, listings/, provider/
competitions/ route.ts, [id]/
conservation/ route.ts
content/ (content API)
conversations/ route.ts, find/
cron/ ai-pool-rollover/
dashboard/ stats/
delegations/ (delegation API)
disputes/ route.ts, intake-screen/, [id]/ (csos-export, messages, evidence, submit, ruling, assign)
events/ route.ts, [id]/, [id]/register/
external-surveys/ route.ts
flags/ route.ts
gate/ context/
groups/ route.ts, [id]/, members/, membership-requests/
health/ route.ts
households/ route.ts, [id]/
invitations/ route.ts, [id]/, accept/, validate/
maintenance/ (maintenance API)
marketplace/ checkout/, webhook/
media/ route.ts
merits/ (community merits API)
messages/ route.ts, urgency/, unread/
notifications/ (notifications API)
openapi.json/ route.ts
payments/ paypal/ (webhook, capture), paystack/ (webhook, verify)
platform/ onboarding/, tenants/
premium/ listings/, portfolio/
pricing/ route.ts
properties/ [id]/
providers/ (provider API)
purge/ route.ts
resources/ route.ts, [id]/, [id]/download/
seats/ route.ts
service-bookings/ route.ts
services/ urgency/, [id]/availability/
settings/ route.ts, [key]/, contact/
stats/ (stats API)
surveys/ route.ts, [id]/ (responses, questions, sections, reorder)
tenant/ billing/
tenants/ [id]/modules/
translate/ route.ts
trpc/ [trpc]/
upload/ route.ts
user/ albums/, tags/
users/ route.ts, [id]/ (suspend, unsuspend, suspensions, books)
v1/ public/ (resources, events, competitions, content), system/ (health, flags), tenant/ (community-services), platform/
webhooks/ payload/

## Standalone Page Routes (16)

- bookings/ (layout, page)
- campaign/ (layout, page)
- competition/ (layout, id/page, page)
- conservation/ (layout, page)
- dashboard/ (empty directory)
- directory/ (layout, page)
- groups/ (layout, id/page, page)
- guidelines/page.tsx
- interest/page.tsx
- invite/[token]/page.tsx
- maintenance/ (layout, page)
- member/[id]/
- messages/ (layout, page)
- news/ (layout, id/page, page)
- notifications/page.tsx
- privacy/page.tsx
- profile/ (layout, page)
- proudly-soralia/page.tsx
- resident/ (layout, id/page, page)
- resources/ (layout, page)
- services/ (layout, page, id/)
- surveys/ (layout, id/page, page)
- terms/page.tsx
- unit/[id]/page.tsx, unit/[id]/member/[profileId]/page.tsx
  Root-level files
- layout.tsx (root layout)
- globals.css (global styles)
- providers.tsx (React context providers)

## 10. ALL FILES IN src/shared/lib/ (The project's lib layer)

Note: There is no src/lib/. The shared library is at src/shared/lib/.

```
src/shared/lib/
├── __tests__/
│   ├── agent-token.test.ts
│   ├── constants.test.ts
│   ├── permissions.test.ts
│   └── useAutoSave.test.ts
├── agent-token.ts
├── billing/
│   ├── billing.test.ts
│   ├── helpers.ts
│   ├── index.ts
│   ├── seed-plans.ts
│   └── tier-sync.ts
├── constants/
│   └── tiers.ts
├── constants.ts
├── dispute/
│   └── intake-screen-output.ts
├── hooks/
│   ├── index.ts
│   ├── toast-messages.ts
│   ├── useActiveAnnouncements.ts
│   ├── useAdminContent.ts
│   ├── useAdminUsers.ts
│   ├── useApiToast.ts
│   ├── useContactSettings.ts
│   ├── useConversations.ts
│   ├── usePageAccess.test.ts
│   ├── usePageAccess.ts
│   ├── usePageFlags.ts
│   ├── usePageLoading.tsx
│   ├── usePremiumListings.ts
│   ├── useSafeTranslation.ts
│   ├── useUnreadMessages.ts
│   ├── useUpcomingEvents.ts
│   └── useUserProfile.ts
├── i18n/
│   ├── __tests__/content-i18n.test.ts
│   ├── config.ts
│   └── index.ts
├── id.ts
├── index.ts
├── logger/
│   └── index.ts
├── nav/
│   └── index.ts
├── permissions.ts
├── providers/
│   ├── admin.test.ts
│   ├── admin.ts
│   ├── billing.test.ts
│   ├── billing.ts
│   ├── registration.test.ts
│   └── registration.ts
├── sanitize/
│   ├── index.ts
│   └── server.ts
├── schemas/
│   └── user-profile.ts
├── settings/
│   ├── defaults.ts
│   ├── types.ts
│   └── validation.ts
├── tenant-config/
│   └── tenant.ts
├── types/
│   ├── index.ts
│   ├── platform-page-flags.ts
│   └── tenant.ts
├── useAutoSave.ts
├── utils.ts
└── workflow/
    ├── __tests__/useWorkflow.test.ts
    ├── createWorkflow.ts
    ├── index.ts
    ├── types.ts
    └── useWorkflow.ts
```

## SUMMARY STATISTICS

| Area                      | Count                                                                                                                                                                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top-level entries         | 68                                                                                                                                                                                                                                                                     |
| src/ entries              | 15                                                                                                                                                                                                                                                                     |
| FSD Entities              | 21 (access, admin, agent, booking, chat, content, delegation, directory, dispute, dwallet, education, event, maintenance, marketplace, merit, service, survey, tenant, user, widget)                                                                                   |
| FSD Features              | 24 (admin, ai-provider, announcements, auth, billing, booking, chat, content, dashboard, directory, dispute, events, gate, i18n, maintenance, marketing, marketplace, onboarding, platform, pricing, provider-billing, provider-registration, service, survey-builder) |
| FSD Widgets               | 9 (admin, booking, chat, dashboard, delegation, education, maintenance, service, settings)                                                                                                                                                                             |
| FSD Page Modules          | 7 (admin, booking, chat, directory, disputes, maintenance, service)                                                                                                                                                                                                    |
| API route directories     | 58                                                                                                                                                                                                                                                                     |
| Drizzle schema files      | 285                                                                                                                                                                                                                                                                    |
| Prisma migrations         | 37                                                                                                                                                                                                                                                                     |
| Planning phases           | 65                                                                                                                                                                                                                                                                     |
| package.json dependencies | 97 total (63 prod + 34 dev)                                                                                                                                                                                                                                            |
