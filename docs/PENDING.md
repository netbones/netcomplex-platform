---
title: Pending Work Items — Priority Assessment
status: current
reviewed: 2026-08-05
tags: [tracking, priorities, todos, bd-cross-ref]
audience: all
---

# Pending Work Items — Priority Assessment

> **BD is the source of truth for open work.** This document provides a high-level
> priority summary and cross-references BD IDs. Do not re-list individual items
> here that BD already tracks — consult `bd list` for the live queue.
>
> Reviewed 2026-08-05. BD queue snapshot: **50 open** (16 P1, 7 P2, 26 P3, 1 P4).
> 9 items are unblocked (ready).
>
> **Closed since last review (2026-07-30 → 2026-08-05):**
>
> - `l0co` — Migrate remaining raw fetch() call sites to http-client (was:
>   "to tRPC"). Completed across 5 refactor commits (37a2bce1 → 26a65b4b →
>   46608b4b → 3ba4185d → 415a9a2d). Final state: zero raw `fetch('/api/...')`
>   outside FormData uploads + binary downloads; http-client now exposes
>   `apiPostForm`/`apiFetchRaw`/`apiDeleteWithBody` so the FormData bypass
>   surface is centralized. Closed by `bd close soralia-village-l0co`.

---

## P1 — High Priority (16 BD issues)

BN BD queue maps 1:1 to the 16 P1 items formerhand-curated in PENDING.md; all
source-doc references now have BD IDs.

| BD ID  | Title                                                                                 |
| ------ | ------------------------------------------------------------------------------------- |
| `fucv` | Secure payload webhook endpoint (HMAC, replay, idempotency)                           |
| `wxjg` | Dead achievement listener — listener.ts imported nowhere                              |
| `w37u` | Better-Auth organization plugin integration for multi-tenant                          |
| `nkgt` | Test POST /api/auth/admin/stop-impersonating endpoint                                 |
| `jhuk` | Agent rating & review system — schema has fields but no agent-specific review CRUD    |
| `bvi9` | Module gating enforcement: verify SpaceLauncher auto-hides optional spaces            |
| `lwpw` | Mobile space overflow pattern: handle 6 spaces exceeding 5-slot mobile limit          |
| `5s99` | Maintenance admin: add sort controls, CSV export, ISR caching headers                 |
| `p9mq` | FeatureGateWall component + domain card gating — Phase C/D of gate consolidation      |
| `jtmt` | Organization/Tenant switcher component for multi-tenant navigation                    |
| `g7rq` | Household management UI: My Households dashboard section + /unit/[id]/manage page     |
| `upis` | Maintenance: auto-notify resident on status change + notify admin on new request      |
| `m1dg` | WidgetPermissionGate: enforce permission checks inside WidgetRenderer                 |
| `qoxf` | Agent verification workflow — schema exists but no UI/workflow for agent verification |
| `bel1` | Phase 126 follow-up: resolve ADVISORY-032 before 126-03 backfill                      |
| `63pl` | ADR-027: Request-Scope Engine — advisor review + feature-branch Phase 0/1A/1B/1C      |

---

## P2 — Medium Priority (7 BD issues)

| BD ID  | Title                                                                                        |
| ------ | -------------------------------------------------------------------------------------------- |
| `bn2q` | Enum-vs-lookup-table general pattern resolution (NotificationType + SignatureProvider + ...) |
| `z76s` | Platform architecture hardening: RLS activation, rate limiting, outkeep, API consolidation   |
| `vo6v` | Ticketing system gap closure: SLA tracking, escalation, notifications, phase verification    |
| `yvgz` | Phase 122 Workspace Bug Report & Gap Analysis                                                |
| `sm23` | Agent Gateway: Phase 111 ADDENDUM gaps                                                       |
| `hh1t` | Provider Platform: Paystack/PayPal gateway — remote subscription lifecycle                   |
| `5m7l` | Confirm Schedule F Table 2 revenue share % with anchor tenant (dWallet addendum)             |

Additional P2 items from the previous doc that are **not** yet in BD include
tenant provisioning UI, billing integration in PRD.md, CMS versioning, CMS
moderation workflow, and tech-debt remediation. These live in the source docs
listed below and should be converted to BD when they become active.

---

## P3 — Low Priority / Deferred (26 BD issues)

All 26 P3 BD items are low-priority, deferred, or aspirational. Key clusters:

| Cluster                | Count | Example BD IDs                                 |
| ---------------------- | ----- | ---------------------------------------------- |
| Caching remediation    | 1     | `4f6w` (M6+ Redis, observability)              |
| Events                 | 3     | `f1k7`, `e4fy`, `tepl`                         |
| Widget registry        | 3     | `sdft`, `j8ke`, `nm2z`                         |
| API/Platform debt      | 6     | `dvex`, `e8hs`, `g8c3`, `iswf`, `uovk`, `c2dd` |
| Provider Platform gaps | 6     | `vlfd`, `zuju`, `h3wr`, `a5a5`, `rkns`, `woqt` |
| RLS post-phase-43      | 2     | `57d`, `t78`                                   |
| Features & future      | 4     | `sioz`, `qyc4`, `m5ug`, `7tqj`                 |
| Topology               | 1     | `q8py`                                         |

For full details, run `bd list --priority P3`.

Additional P3 items tracked only in source docs (no BD IDf yet):

- Platform analytics dashboard (PRD.md)
- Agent analytics / commission payment (AGENT_MODEL.md)
- React-rnd drag-and-drop grid, mobile widget patterns (widget-registry.md)
- 114 user stories from user-stories-john-mary.md (M5 aspirational)
- Content versioning — revision history/diff/rollback (CMS_AUDIT_DISCOVERY.md §7)
- Content moderation — multi-stage review pipeline needed (CMS_AUDIT_DISCOVERY.md §8)
- Event catalog mapping DomainEvents to producers/consumers (reports/Query_Report.md §5)
- Prisma schema modularization (reports/QWEN_REPORT.md §3)
- Auth middleware deduplication (reports/QWEN_REPORT.md §4)
- State management coordination (reports/QWEN_REPORT.md §6)

---

## Items Confirmed as Already Implemented (source docs need ✅ updated))

These adversarial items were marked ⏳ in source docs but code confirms they are
done. Mark source docs as ✅ at next refresh:

| Source                             | Item                                                               | Code Evidence                                                     |
| ---------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **contexts/chat.md**               | Message pruning (30-day retention)                                 | Drizzle-based pruning in message route                            |
| **contexts/content.md**            | Content DTO in shared barrel                                       | Exported at `src/shared/api/dto/index.ts`                         |
| **contexts/user.md**               | residentType overlap resolved                                      | —                                                                 |
| **contexts/user.md**               | Suspension frontend                                                | `SuspendUserModal.tsx` + `UsersListSection.tsx` live              |
| **COMMUNIQUE.md**                  | admin() plugin + customUser config + ban/suspend columns           | auth.ts + schema.prisma                                           |
| **COMMUNIQUE-03.md**               | Gate context endpoint + Zustand store + Dev tier + seed data       | Gate context available + stored working                           |
| **MIGRATION.md**                   | FSD lint boundaries + legacy bucket removal + no-deep-imports rule | Steiger + eslint.config.js updated                                |
| **migration-plan-identity.md**     | Phase 5: Remove legacy User fields                                 | `street`, `unit`, `homeImage`, `residentType` removed from schema |
| **NETCOMPLEX_WIDGET_ALIGNMENT.md** | Version, lazy loading, icon component, author field                | All widgets compliant                                             |

---

## Reference Documents (no pending items, informational only)

| Source                             | Purpose                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **reports/CMS_COMPARISON.md**      | Headless CMS platform comparison (Payload, Strapi, Contentful, Sanity, Directus, Ghost) — patterns to consider, no actionable items |
| **reports/CMS_AUDIT_DISCOVERY.md** | Full CMS implementation audit — two P2 findings above (versioning, moderation workflow)                                             |

|

---

## Action Items

1. **Update source docs** for the ~10 confirmed-implemented items (⏳→✅) listed above.
2. **Keep BD in sync** — all P1 items have BDs IDs; convert residual P2/P3 source-doc items to BD when they become active.
3. **Resolve MIGRATION.md doc staleness** — 4 items in MIGRATION.md still flag work that's already done (FSD boundaries, legacy cleanup). Do not correct PENDING.md to match; fix MIGRATION.md directly.
4. **A116 user-stories-john-mary.md** 114 items against M5 anchor tenant roadmap scope — might needs a `spec` discussion.
5. **Remove duplicate widget-registry doc** — `features/widget-registry-architecture-react-rnd-v2.md` = `features/widgets/widget-registry-architecture-react-rnd-v2.md`.
