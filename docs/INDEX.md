# Netcomplex Documentation Index

Welcome to the central documentation hub for Netcomplex. This index provides an overview of the project's documentation organized by functional area.

> **Note:** The project has been reorganized. Core steering documents (PRD, SPEC, ADR, TDD, Guide) now live in `/docs/STEERING/`. Legacy product docs are being migrated.

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

- **[AGENT_MODEL.md](./architecture/AGENT_MODEL.md)**: Behavioral agent system design and logic.
- **[IDENTITY_MODEL.md](./architecture/IDENTITY_MODEL.md)**: Comprehensive user identity, roles, and permissions model.
- **[TIER_MODEL.md](./architecture/TIER_MODEL.md)**: Service tiering and subscription logic.
- **[NETCOMPLEX_ARCHITECTURE.md](./architecture/NETCOMPLEX_ARCHITECTURE.md)**: Overall system topology and architecture.
- **[netcomplex_modular_services_architecture.html](./architecture/netcomplex_modular_services_architecture.html)**: Modular services architecture diagram.

---

## 📦 [Product](./product/) _(legacy)_

> ⚠️ **Deprecated:** These files are being migrated to `/docs/STEERING/`. Please update any references.

Requirements, business logic, and user-centric documentation.

- **[PRD.md](./product/PRD.md)**: _(moved to STEERING/PRD.md)_
- **[SPEC.md](./product/SPEC.md)**: _(moved to STEERING/SPEC.md)_
- **[user-stories-john-mary.md](./product/user-stories-john-mary.md)**: User personas and journey mapping.
- **[SaaS/](./product/SaaS/)**: SaaS-specific business documentation.

---

## ✨ [Features](./features/)

Functional specifications and design for specific system components.

- **[CHAT_DESIGN.md](./features/CHAT_DESIGN.md)**: Real-time chat system design and Supabase integration.
- **[MAINTENANCE_TICKETING_SPEC.md](./features/MAINTENANCE_TICKETING_SPEC.md)**: Maintenance request workflow and ticketing system.
- **[COMPONENT_REGISTRY.md](./features/COMPONENT_REGISTRY.md)**: Documentation for the shared UI component library.
- **[widgets/](./features/widgets/)**: Widget-based architecture and registry details.

---

## 🌐 [Multi-Tenant](./multi-tenant/)

Core multi-tenancy configuration, strategy, and audits.

- **[MULTI_TENANT.md](./multi-tenant/MULTI_TENANT.md)**: Core strategy for multi-tenant isolation and scaling.
- **[TENANT_AUDIT.md](./multi-tenant/TENANT_AUDIT.md)**: Audit of existing tenant structures and compliance.
- **[MULTI_TENANT_SIGNUP.md](./multi-tenant/MULTI_TENANT_SIGNUP.md)**: Onboarding flow for new community tenants.

---

## 🔄 [Migrations](./migrations/)

Strategy and history of database, identity, and platform evolutions.

- **[DATABASE_MIGRATION_v2.1.md](./migrations/DATABASE_MIGRATION_v2.1.md)**: V2.1 DB schema changes and migration steps.
- **[migration-plan-identity.md](./migrations/migration-plan-identity.md)**: Strategy for migrating to the new identity model.
- **[WHITE_LABEL_MIGRATE.md](./migrations/WHITE_LABEL_MIGRATE.md)**: Procedures for white-labeling the village portal.

---

## 🛠️ [Infrastructure](./infrastructure/)

Deployment, performance, security, and edge configuration.

- **[BETTER_AUTH_EDGE.md](./infrastructure/BETTER_AUTH_EDGE.md)**: Implementation of Better Auth on Vercel Edge.
- **[Vercel_Edge_Runtime_Compatibility_Audit.md](./infrastructure/Vercel_Edge_Runtime_Compatibility_Audit.md)**: Edge runtime compatibility status.
- **[minimize_vercel_compute_costs.md](./infrastructure/minimize_vercel_compute_costs.md)**: Optimization strategies for cloud compute efficiency.

---

## 📏 [Standards](./standards/)

Best practices, linting rules, testing strategies, and technical debt management.

- **[TESTING_METHODS.md](./standards/TESTING_METHODS.md)**: Comprehensive project testing strategy.
- **[ESLINT.md](./standards/ESLINT.md)**: Code style, linting rules, and formatting standards.
- **[TECH_DEBT_REMEDIATION_PLAN.md](./standards/TECH_DEBT_REMEDIATION_PLAN.md)**: Strategy for identifying and resolving technical debt.

---

## 🖼️ [Assets](./assets/)

Visual resources, maps, infographics, and branding assets.

- **[branding/](./assets/branding/)**: Brand identity, logos, and style guides.
- **[infographics/](./assets/infographics/)**: Visual data representations and village infographics.
- **[soralia_map.png](./assets/soralia_map.png)**: Core village layout map.

---

## 📅 [Plans](./plans/)

Roadmaps, strategic project planning, and long-term initiatives.

- **[ROUTE_MAP_PLANNING.md](./plans/ROUTE_MAP_PLANNING.md)**: Strategic development roadmap.
- **[p3-plan.md](./plans/p3-plan.md)**: Phase 3 development plan.
- **[progress-review.md](./plans/progress-review.md)**: Project progress review and status updates.
- **[PROPERTY_MIGRATION_PLAN.md](./plans/PROPERTY_MIGRATION_PLAN.md)**: Property data migration plan.

---

## 📂 [Misc](./misc/)

Miscellaneous data, workspace configurations, and legacy references.

---

_Last updated: May 2026_
