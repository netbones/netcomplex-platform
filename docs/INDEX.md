# Netcomplex Documentation Index

Welcome to the central documentation hub for Netcomplex. This index provides an overview of the project's documentation organized by functional area.

> **Note:** The project has been reorganized. Core steering documents (PRD, SPEC, ADR, TDD, Guide) live in `/docs/STEERING/`. Root-level files have been filed into subdirectories.

---

## 🎯 [STEERING](./STEERING/)

Core governance, requirements, and methodology documents.

| Document                                                                                                    | Description                                                       |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **[PRD.md](./STEERING/PRD.md)**                                                                             | Product Requirements - multi-tenant platform, tiers, modules      |
| **[SPEC.md](./STEERING/SPEC.md)**                                                                           | Functional specifications - what the system does                  |
| **[ADR.md](./STEERING/ADR.md)**                                                                             | Architecture Decision Records - why we made architectural choices |
| **[GUIDE.md](./STEERING/GUIDE.md)**                                                                         | Development guides and best practices                             |
| **[TDD.md](./STEERING/TDD.md)**                                                                             | Test-driven development workflow                                  |
| **[tRPC_GUIDE.md](./STEERING/tRPC_GUIDE.md)**                                                               | tRPC procedures for OpenAPI/Android consumption                   |
| **[module.md](./STEERING/module.md)**                                                                       | Module architecture overview                                      |
| **[netcomplex-module-architecture-2026-04-22.md](./STEERING/netcomplex-module-architecture-2026-04-22.md)** | Module architecture details                                       |
| **[better-auth-paystack.md](./STEERING/better-auth-paystack.md)**                                           | Better Auth + Paystack integration                                |
| **[email-provider-comparison.md](./STEERING/email-provider-comparison.md)**                                 | Email provider comparison                                         |

---

## 🏛️ [Architecture](./architecture/)

Core system designs, technical models, and technical foundations.

| Document                                                                      | Description                                        |
| ----------------------------------------------------------------------------- | -------------------------------------------------- |
| **[NETCOMPLEX_ARCHITECTURE.md](./architecture/NETCOMPLEX_ARCHITECTURE.md)**   | Overall system topology and architecture           |
| **[AGENT_MODEL.md](./architecture/AGENT_MODEL.md)**                           | Behavioral agent system design and logic           |
| **[IDENTITY_MODEL.md](./architecture/IDENTITY_MODEL.md)**                     | User identity, roles, and permissions model        |
| **[TIER_MODEL.md](./architecture/TIER_MODEL.md)**                             | Service tiering and subscription logic             |
| **[HOLISTIC.md](./architecture/HOLISTIC.md)**                                 | Cross-context impact, systemic risks, and progress |
| **[MOBILE_MONOREPO.md](./architecture/MOBILE_MONOREPO.md)**                   | Mobile monorepo architecture (Expo / React Native) |
| **[CONTEXT_MAP.md](./architecture/CONTEXT_MAP.md)**                           | Bounded contexts, relationships, and contracts     |
| **[API_ARCHITECTURE.md](./architecture/API_ARCHITECTURE.md)**                 | API architecture design                            |
| **[DOMAINS.md](./architecture/DOMAINS.md)**                                   | Domain model documentation                         |
| **[REG_FLOW.md](./architecture/REG_FLOW.md)**                                 | Registration flow documentation                    |
| **[DWALLET_SPEC.md](./architecture/DWALLET_SPEC.md)**                         | dWallet specification                              |
| **[NAV_AUDIT.md](./architecture/NAV_AUDIT.md)**                               | Navigation audit                                   |
| **[NAVIGATION_GOVERNANCE.md](./architecture/NAVIGATION_GOVERNANCE.md)**       | Navigation governance rules                        |
| **[PROPERTY_HOUSEHOLD_MODEL.md](./architecture/PROPERTY_HOUSEHOLD_MODEL.md)** | Property and household data model                  |

---

## 📦 [Product](./product/) _(legacy)_

> ⚠️ **Deprecated:** These files are being migrated to `/docs/STEERING/`. Please update any references.

- **[PRD.md](./product/PRD.md)**: _(moved to STEERING/PRD.md)_
- **[SPEC.md](./product/SPEC.md)**: _(moved to STEERING/SPEC.md)_
- **[user-stories-john-mary.md](./product/user-stories-john-mary.md)**: User personas and journey mapping
- **[SaaS/](./product/SaaS/)**: SaaS-specific business documentation

---

## ✨ [Features](./features/)

Functional specifications and design for specific system components.

- **[CHAT_DESIGN.md](./features/CHAT_DESIGN.md)**: Real-time chat system design and Supabase integration
- **[MAINTENANCE_TICKETING_SPEC.md](./features/MAINTENANCE_TICKETING_SPEC.md)**: Maintenance request workflow and ticketing system
- **[COMPONENT_REGISTRY.md](./features/COMPONENT_REGISTRY.md)**: Shared UI component library documentation
- **[SURVEY_TESTING.md](./features/SURVEY_TESTING.md)**: Survey editor testing issues and findings
- **[widgets/](./features/widgets/)**: Widget-based architecture and registry details

---

## 🌐 [Multi-Tenant](./multi-tenant/)

Core multi-tenancy configuration, strategy, and audits.

- **[MULTI_TENANT.md](./multi-tenant/MULTI_TENANT.md)**: Core strategy for multi-tenant isolation and scaling
- **[TENANT_AUDIT.md](./multi-tenant/TENANT_AUDIT.md)**: Audit of existing tenant structures and compliance
- **[MULTI_TENANT_SIGNUP.md](./multi-tenant/MULTI_TENANT_SIGNUP.md)**: Onboarding flow for new community tenants

---

## 🔄 [Migrations](./migrations/)

Strategy and history of database, identity, and platform evolutions.

- **[DATABASE_MIGRATION_v2.1.md](./migrations/DATABASE_MIGRATION_v2.1.md)**: V2.1 DB schema changes and migration steps
- **[migration-plan-identity.md](./migrations/migration-plan-identity.md)**: Strategy for migrating to the new identity model
- **[WHITE_LABEL_MIGRATE.md](./migrations/WHITE_LABEL_MIGRATE.md)**: Procedures for white-labeling the village portal
- **[MIGRATION.md](./migrations/MIGRATION.md)**: FSD migration checklist
- **[tRPC_MIGRATION_STATUS.md](./migrations/tRPC_MIGRATION_STATUS.md)**: tRPC migration status and REST route coverage

---

## 🛠️ [Infrastructure](./infrastructure/)

Deployment, performance, security, and edge configuration.

- **[BETTER_AUTH_EDGE.md](./infrastructure/BETTER_AUTH_EDGE.md)**: Better Auth on Vercel Edge
- **[Vercel_Edge_Runtime_Compatibility_Audit.md](./infrastructure/Vercel_Edge_Runtime_Compatibility_Audit.md)**: Edge runtime compatibility status
- **[minimize_vercel_compute_costs.md](./infrastructure/minimize_vercel_compute_costs.md)**: Cloud compute cost optimization strategies
- **[IOREDIS_DEBUG.md](./infrastructure/IOREDIS_DEBUG.md)**: ioredis import chain debug investigation

---

## 📏 [Standards](./standards/)

Best practices, linting rules, testing strategies, and technical debt management.

- **[TESTING_METHODS.md](./standards/TESTING_METHODS.md)**: Comprehensive project testing strategy
- **[ESLINT.md](./standards/ESLINT.md)**: Code style, linting rules, and formatting standards
- **[TECH_DEBT_REMEDIATION_PLAN.md](./standards/TECH_DEBT_REMEDIATION_PLAN.md)**: Technical debt resolution strategy
- **[tech-debt-register.md](./standards/tech-debt-register.md)**: Technical debt register with findings
- **[steiger.md](./standards/steiger.md)**: Steiger FSD linting configuration notes
- **[check.md](./standards/check.md)**: Security checklist and best practices
- **[REVIEW_OUTSTANDING.md](./standards/REVIEW_OUTSTANDING.md)**: Page review checklist (Home, Directory, Admin, Conservation)

---

## 📅 [Plans](./plans/)

Roadmaps, strategic project planning, and long-term initiatives.

- **[ROUTE_MAP_PLANNING.md](./plans/ROUTE_MAP_PLANNING.md)**: Strategic development roadmap
- **[p3-plan.md](./plans/p3-plan.md)**: Phase 3 development plan
- **[progress-review.md](./plans/progress-review.md)**: Project progress review and status updates
- **[PROPERTY_MIGRATION_PLAN.md](./plans/PROPERTY_MIGRATION_PLAN.md)**: Property data migration plan
- **[GATE_PLAN.md](./plans/GATE_PLAN.md)**: Feature gate consolidation plan
- **[OUTSTANDING.md](./plans/OUTSTANDING.md)**: Deferred items register with blocker tracking
- **[11-ANNOUNCEMENTS-REVISED-INSTRUCTIONS.md](./plans/11-ANNOUNCEMENTS-REVISED-INSTRUCTIONS.md)**: Phase 11 announcements plan

---

## 🖼️ [Assets](./assets/)

Visual resources, maps, infographics, and branding assets.

- **[branding/](./assets/branding/)**: Brand identity, logos, and style guides
- **[infographics/](./assets/infographics/)**: Visual data representations and village infographics
- **[soralia_map.png](./assets/soralia_map.png)**: Core village layout map

---

## 📋 [Advisories](./advisories/)

Architecture and security advisory documents (ADR supplements).

- Full list: 45 advisories (ADVISORY-001 through ADVISORY-036, including supplements)
- **[REGISTER.md](./advisories/REGISTER.md)**: Advisory register index

---

## 🔍 [Audits](./audits/)

Audit reports covering specific subsystems.

- **[BOOKINGS_AUDIT.md](./audits/BOOKINGS_AUDIT.md)**: Bookings subsystem audit
- **[SETTINGS_AUDIT.md](./audits/SETTINGS_AUDIT.md)**: Settings infrastructure audit

---

## 📊 [Reports](./reports/)

Analysis, architecture reviews, and investigation reports.

- **[ARCHITECT_REVIEW.md](./reports/ARCHITECT_REVIEW.md)**: Architectural friction analysis across bounded contexts
- **[QUERY_INFRA.md](./reports/QUERY_INFRA.md)**: Dashboard query infrastructure report
- **[SETTINGS_INFRA_REVIEW.md](./reports/SETTINGS_INFRA_REVIEW.md)**: Settings infrastructure review
- **[SETTINGS_REPORT.md](./reports/SETTINGS_REPORT.md)**: Settings subsystem report
- **[TRPC_ARCHI_REVIEW.md](./reports/TRPC_ARCHI_REVIEW.md)**: tRPC architecture and security review
- **[TRPC_SECURITY_REPORT.md](./reports/TRPC_SECURITY_REPORT.md)**: tRPC security audit report
- **[CHAT_INFRA_REPORT.md](./reports/CHAT_INFRA_REPORT.md)**: Chat/messaging subsystem exploration
- **[CONSERVATION_PAGE_REVIEW.md](./reports/CONSERVATION_PAGE_REVIEW.md)**: Conservation page feature analysis
- **[ADMIN_INFRA_REPORT.md](./reports/ADMIN_INFRA_REPORT.md)**: Admin infrastructure report
- **[TICKETING_REPORT.md](./reports/TICKETING_REPORT.md)**: Ticketing system report
- **[CMS_COMPARISON.md](./reports/CMS_COMPARISON.md)**: Headless CMS platform comparison (Payload, Strapi, Contentful, Sanity, Directus, Ghost)
- **[CMS_AUDIT_DISCOVERY.md](./reports/CMS_AUDIT_DISCOVERY.md)**: Full CMS implementation audit — TipTap editor, Content schema, API routes, media pipeline
- And more: DEDUP, GATING, MERITS, NOTIFICATIONS, PERFORMANCE, SECURITY, SITE, TIER, TOAST_TOOLTIPS

---

## 💬 [Discussions](./discussions/)

Design discussions and architectural proposals.

- **[AGENT_DISCUSSION.md](./discussions/AGENT_DISCUSSION.md)**: Agent system discussion
- **[CHAT_E2EE.md](./discussions/CHAT_E2EE.md)**: Chat E2EE discussion
- **[GATE_DISCUSSION.md](./discussions/GATE_DISCUSSION.md)**: Feature gate discussion
- **[PROXY_SIG_DISCUSSION.md](./discussions/PROXY_SIG_DISCUSSION.md)**: Proxy voting module discussion
- And more: billing, chips, credentials, groups chat, iris, onboarding, resources, services, wallet

---

## 🗺️ [Contexts](./contexts/)

Bounded context definitions and domain boundaries.

- **[CONTEXT_MAP.md](./contexts/CONTEXT_MAP.md)**: Context map with bounded contexts and relationships
- Context files: admin, booking, chat, competitions, content, directory, events, maintenance, service, tenant, user, widget

---

## 📢 [Communiques](./communiques/)

Project communications and status updates.

- 12 communiques (COMMUNIQUE.md, COMMUNIQUE-02 through COMMUNIQUE-12)

---

## 🕐 [Pending](./PENDING.md)

Consolidated list of all incomplete (⏳) work items across docs/, with BD issue references.

## 🗒️ [Todo](./todo/)

Outstanding work items and technical debt tracking.

- **[SOLID_REPORT.md](./todo/SOLID_REPORT.md)**: SOLID architecture audit with Step 3 items tracked in BD

---

## 🧪 [UAT](./UAT/)

User acceptance testing documentation.

- **[46-qx7-UAT.md](./UAT/46-qx7-UAT.md)**: Phase 46 UAT

---

## 🧠 [Skills](./skills/)

Expert skill definitions for AI-assisted development.

- performance-optimisation-engineer/
- security-expert/
- senior-engineer-audit/
- solid-expert/

---

## 📝 [To Claude](./to-claude/)

Context handoff notes for AI sessions.

- **[API_REVIEW.md](./to-claude/API_REVIEW.md)**: API review notes
- **[CODE_QUALITY.md](./to-claude/CODE_QUALITY.md)**: Code quality notes
- **[EXPLORE.md](./to-claude/EXPLORE.md)**: Exploration notes
- **[PRISMA_ANALYSIS.md](./to-claude/PRISMA_ANALYSIS.md)**: Prisma analysis notes

---

## 🎨 [Design](./design/)

UI design mockups and assets.

- Screenshots and visual references (PNG)
- **[CategoryCloud.tsx](./design/CategoryCloud.tsx)**: Category cloud component

---

## 📂 [Misc](./misc/)

Miscellaneous data, workspace configurations, and legacy references.

---

_Last updated: July 2026_
