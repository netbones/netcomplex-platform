---
title: Ticketing System Review: Soralia Village vs. Market Standards
status: current
reviewed: 2026-07-28
tags: [report, analysis]
audience: developer
---

# Ticketing System Review: Soralia Village vs. Market Standards

> **Date:** 2026-07-11
> **Scope:** Maintenance requests + dispute cases
> **Competitors referenced:** Quick-Ticket, Helpin, TicketiHub (limited direct data); PayHOA, Buildium, Pilera, OxMaint, MojoHelpdesk, Proprli, HOAworks, Solume (industry benchmark data from market research)

---

## 1. What You've Got Right

### Maintenance Requests

1. **7-status workflow with sensible lifecycle** — `SUBMITTED → ASSIGNED → SCHEDULED → IN_PROGRESS → PENDING_PARTS → COMPLETED → CANCELLED`, with a PENDING_PARTS loop-back to IN_PROGRESS. This maps directly to real-world maintenance workflows that competitors (PayHOA, Buildium, Pilera) offer.

2. **Dual assignment model** (in-house teams + external providers) — Most HOA platforms cap at simple vendor assignment. Having both with a handoff flow (team → provider reassignment with history) is above market.

3. **Ticket numbering with SRV-YYYY-NNNN format** — Professional per-tenant per-year sequential reference numbering, tenant-configurable. Many HOA platforms skip ticket numbering entirely.

4. **Routing intelligence** (HOA vs LANDLORD based on occupancy type) — Automatically routes rental-unit maintenance to the property owner/landlord rather than HOA management. No competitor does this. Genuinely innovative.

5. **Scope filtering** (`mine`/`all`/`community`) — The community scope publishes a redacted log (id, ticketNumber, category, priority, status, timestamps only — no PII/assignment). Good privacy-first design for a community portal.

6. **Full audit trail** (`RequestHistory` with field-level old-value/new-value/comment tracking) — Most competitors log only status changes, not field-level diffs. This is leading.

7. **Permission-gated views** — Residents see own requests; admins see all; community sees redacted log. Clean role-based separation matching the 9-role identity model.

8. **3-language i18n** (English, Afrikaans, Xhosa, Zulu) — No general-purpose HOA software does multi-language. Genuinely market-leading for South Africa.

9. **Feature-gated module system** — Maintenance is a PlatformModule, tenant-configurable, with per-tenant feature flags. Most competitors are single-tenant or hard-bundle all features.

### Dispute Cases

10. **CSOS-compliant design from the ground up** — 11-status lifecycle, cooling-off period, mediation thread, formal ruling, CSOS escalation, certified PDF export package. This isn't a bolt-on; it's architected to satisfy the Community Schemes Ombud Service Act (No. 9 of 2011) and Regulations GN R607 of 2016. Zero competitors have this.

11. **Psychological de-escalation intake layer** — 4-stage intake wizard (emotion check-in, self-resolution checklist, AI frivolity screening, conflict tips panel) rendered _before_ dispute creation. Emotional state is never stored; the wizard is advisory-only, never blocking. This is genuinely pioneering. No HOA software has anything like it.

12. **POPIA-compliant PII sanitisation** before AI processing — Client-side stripping of unit numbers, surnames, phone numbers, and email addresses before sending to the AI frivolity screen. Strong data protection design.

13. **State machine-based transition enforcement** — `VALID_TRANSITIONS` map with `canTransition(from, to)` validation prevents illegal status jumps. Terminal statuses (RESOLVED, WITHDRAWN, CSOS_CLOSED) have no outgoing transitions. Most ticket systems don't enforce this formally.

14. **Complainant anonymity config** — Complainant identity is masked in respondent-facing views until `mediationAcceptedAt` is set (Gate G3 decision). Moderators always see full details. Thoughtful privacy for small-community contexts where parties know each other.

15. **Message version history** (`DisputeMessageVersion` model) — Original message content preserved server-side; `editedAt` on `DisputeMessage` indicates an edit occurred. Required for CSOS legal defensibility (Gate G2). Far above market standard.

16. **Append-only event log** with 15 event types — Comprehensive immutable audit trail (`DisputeEvent`). No update operations permitted on events. Meets 5-year minimum retention (10-year for CSOS-escalated cases).

17. **CSOS export PDF** (6-section Form 2 document structure) — Parties, Dispute Summary, Internal Resolution History, Evidence on Record, Ruling/Outcome, Certification. Rate-limited (3/case/day), audit-logged on each export.

---

## 2. Where You're Failing

1. **No SLA / time tracking** — This is the single biggest gap. Every competitive HOA platform (PayHOA, Buildium, Pilera, OxMaint, MojoHelpdesk) has SLA tracking: response-time targets, resolution-time targets, breach alerts. Your system has no time-to-respond, time-to-resolve, or escalation timeouts. A ticket can sit in SUBMITTED forever with no alert.

2. **No vendor performance scorecards** — You track vendors but don't measure them. Competitors offer vendor rating, SLA compliance %, cost-vs-estimate tracking. You store `estimatedCost`/`actualCost` but don't surface this as a metric anywhere.

3. **No automated escalation rules** — No rule that says "if IN_PROGRESS > 48h, escalate to board admin" or "if no assignment within 4h of SUBMITTED, notify." Competitors (Pilera, PayHOA) have rule-based escalation chains with configurable timeouts.

4. **No resident self-service knowledge base** — Most competitors (PayHOA, Pilera, MojoHelpdesk) offer a knowledge base for common issues. Your system has no "how to reset a breaker" or "when is bin collection day" content. This increases ticket volume for trivial issues.

5. **No real-time status push for maintenance** — Disputes use Supabase Realtime for mediation threads, but maintenance has no real-time status push. Residents must poll or refresh to see updates.

6. **No mobile-optimised quick-submit flow** — Competitors like Buildium and Pilera offer photo-first quick-ticket flows (snap a photo, add a caption, submit). Your maintenance form requires category, priority, description (10–2000 chars), preferred date/time — it's thorough but not quick.

7. **Dispute system shipped but untested in production** — Phases 105 (schema + entity), 106 (API routes + intake screen), 107 (UI + intake wizard + widgets + detail page), and 108 (CSOS PDF export) are all complete (shipped 2026-06-26, 12 plans across 4 phases). The full ADVISORY-017 design is implemented end-to-end. However, there is no Phase 106 VERIFICATION.md or UAT sign-off — the system has not been validated against its 14 threat mitigations or tested with real users.

8. **No unified ticket view across domains** — Maintenance and disputes are completely separate modules with different UIs, different routing, different conventions. A resident sees maintenance at `/maintenance` and disputes at `/disputes` — no combined "My Cases" or "My Issues" dashboard.

9. **Missing cost tracking closure loop** — `estimatedCost` vs `actualCost` are fields on MaintenanceRequest, but there is no dashboard, no trend analysis, no budget impact reporting that HOA boards need for reserve planning.

10. **No preventive maintenance scheduling** — Competitors like OxMaint offer recurring PM schedules (quarterly HVAC, annual roof inspection). Your system is purely reactive (request → resolve). The HOA board has fiduciary duty to maintain common areas; documented PM schedules protect the board legally.

11. **Inconsistent API patterns across domains** — Maintenance uses both REST (`/api/maintenance/*`) and tRPC; disputes use REST-only. Route structure conventions differ. Error handling patterns vary (some routes inline `getSessionAndRole`, some use the canonical import from `@api/server`).

12. **"Ticket" vs "MaintenanceRequest" dual vocabulary** — Documented in UBIQUITOUS_LANGUAGE.md as intentional, but it creates confusion. The codebase uses both terms inconsistently. Maintenance is called a "ticket" in ticketNumber but "request" everywhere else. Disputes have referenceNumbers but are never called tickets.

---

## 3. Critical Gaps

| Gap                                    | Severity     | Market Standard                   | What competitors do                                                                                            |
| -------------------------------------- | ------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| SLA / response-time tracking           | **CRITICAL** | Universal                         | PayHOA, Buildium, Pilera, OxMaint: SLA targets, breach alerts, time-to-resolve dashboards                      |
| Automated escalation rules             | **HIGH**     | Standard                          | Pilera, PayHOA: rule-based escalation chains with configurable timeouts and notification triggers              |
| Resident-facing status notifications   | **HIGH**     | Universal                         | All platforms: email/SMS/push on status change; your system has none for maintenance                           |
| Knowledge base / self-service          | **HIGH**     | Standard                          | Pilera, MojoHelpdesk, PayHOA: searchable KB reduces ticket volume for trivial/repeat issues                    |
| Dispute system (production validation) | **MEDIUM**   | None comparable                   | Fully shipped (12/12 plans across Phases 105–108) but lacks UAT sign-off and verification against threat model |
| Preventive maintenance scheduling      | **MEDIUM**   | Emerging                          | OxMaint, Proprli: recurring PM schedules, reserve study forecasting, compliance documentation                  |
| Vendor performance metrics             | **MEDIUM**   | Emerging                          | OxMaint: vendor scorecards, SLA compliance %, cost-vs-estimate tracking, competitive pressure                  |
| Unified cross-domain case view         | **MEDIUM**   | N/A (unique to your architecture) | No competitor has both maintenance + disputes — but the gap is real for your users                             |
| Photo-first quick ticket flow          | **LOW**      | Common                            | Buildium, Pilera, PropertyMeld: snap-and-submit with minimal required fields                                   |
| Tenant-configurable workflows          | **LOW**      | Common                            | PayHOA: custom statuses and workflows per community                                                            |
| Bulk operations                        | **LOW**      | Standard                          | Pilera: portfolio-level batch assign/close/reassign                                                            |
| Cost analytics dashboard               | **LOW**      | Emerging                          | OxMaint: budget impact, trend analysis, reserve integration                                                    |

---

## 4. Benchmark Summary

| Dimension                            | Soralia Village                                                   | Market Standard                 | Verdict               |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------- | --------------------- |
| Status workflow richness             | 7-status (maintenance) + 11-status (disputes)                     | 3–5 statuses                    | **Ahead**             |
| Audit trail depth                    | Field-level diffs + append-only event log                         | Status-change-only logging      | **Ahead**             |
| Legal compliance (CSOS)              | Full pipeline designed: intake → mediation → ruling → CSOS export | Non-existent in HOA software    | **Unique**            |
| De-escalation / psychological intake | 4-stage wizard (emotion, checklist, AI screen, tips)              | None                            | **Unique**            |
| Multi-language support               | 4 languages (en, af, xh, zu)                                      | English only                    | **Ahead**             |
| Multi-tenant architecture            | Per-tenant modules, flags, categories, teams                      | Single-tenant or hard-bundled   | **Ahead**             |
| Routing intelligence                 | HOA vs LANDLORD auto-routing                                      | None                            | **Unique**            |
| Assignment model                     | Dual (teams + providers) with handoff                             | Simple vendor assignment        | **Ahead**             |
| SLA / time tracking                  | None                                                              | Universal                       | **Behind — critical** |
| Automated escalation                 | None                                                              | Standard                        | **Behind**            |
| Knowledge base                       | None                                                              | Standard                        | **Behind**            |
| Vendor scorecards                    | None                                                              | Emerging standard               | **Behind**            |
| Real-time status push                | Disputes only; maintenance has none                               | Some platforms (Push, Realtime) | **Behind**            |
| Preventive maintenance               | None                                                              | Some platforms                  | **Behind**            |
| Mobile quick-submit                  | None                                                              | Common                          | **Behind**            |
| Cost analytics                       | Data collected, no dashboard                                      | Emerging                        | **Behind**            |

---

## 5. Architecture Quality Assessment

### Strengths

- **FSD layer discipline** — Maintenance and dispute entities follow Feature-Sliced Design cleanly: entities → features → widgets → page-modules. Separation of client-safe vs server-only exports (`index.ts` / `index.server.ts`).
- **Dual REST + tRPC surface** — Provides both internal (tRPC, type-safe) and external (REST, OpenAPI-generatable) API surfaces per API Governance Plan.
- **Comprehensive DTO layer** — Zod-based DTOs for all entities with Drizzle-zod integration. Type-safe from DB to API response.
- **Test coverage** — 12 test files for maintenance covering routes, assignment, notes, history, routing logic, permissions. Disputes have 10 test files (61 tests across schemas, PII sanitizer, route handlers, UI components, PDF builder, CSOS export button) plus a UAT document with 21 scenarios.
- **Soft-delete strategy** — Domain entities use `deletedAt`; immutable audit trails (RequestHistory, DisputeEvent) are hard-delete-only via legal purge. Documented in SOFT_DELETE.md.
- **Risk register** — ADVISORY-017 §15 documents 8 specific risks with mitigation strategies for the dispute system. No equivalent exists for maintenance.

### Weaknesses

- **Two entirely separate codebases for what users see as "my issues"** — Maintenance and disputes share no common UI patterns, no shared ticket/list components, no unified status badge system. A resident navigating between them experiences two completely different applications.
- **Inconsistent API patterns** — Some routes use `withErrorHandler()`, some inline try/catch. Some import `getSessionAndRole` from `@api/server`, some redefine it locally. Documented in API_REVIEW.md.
- **tRPC migration ambiguity** — The tRPC router for disputes is marked "Likely dead — verify" in tRPC_MIGRATION.md. REST routes are the canonical surface, but the tRPC router still exists and may cause confusion.
- **No maintenance risk register** — The dispute system has formal threat modelling (ADVISORY-017 §15); maintenance does not. Given that maintenance handles property access, cost authorisation, and vendor payments, this is a gap.
- **Feature flag dependency chain risk** — The dispute intake screen's AI frivolity check depends on Phase 104 (AI Provider Infrastructure). Phase 104 is planned but not yet executed. The intake screen route is built with graceful degradation (returns 503 when AI unavailable), so the dispute system works without it — but the de-escalation intake layer is degraded until Phase 104 ships.

---

## 6. Implementation Status

### Maintenance Ticketing (Phase 40)

**Status:** Complete — 4/4 plans shipped (2026-05-31 → 2026-06-01)

| Plan  | Scope                                                                    | Status     |
| ----- | ------------------------------------------------------------------------ | ---------- |
| 40-01 | Schema: 7-status enum, 3 new models, migrate orphan tables               | ✅ Shipped |
| 40-02 | API: CRUD for teams/providers/categories, assignment, ticket numbers     | ✅ Shipped |
| 40-03 | Admin UI: inline categories, assignment panel, handoff flow, timeline    | ✅ Shipped |
| 40-04 | User tracking: enhanced /maintenance page, ActivityZone, 7 seed requests | ✅ Shipped |

### Dispute Resolution (Phases 105–108)

**Status:** Complete — 12/12 plans shipped (2026-06-26)

| Phase | Scope                                                                              | Plans     | Status     | Verification                                          |
| ----- | ---------------------------------------------------------------------------------- | --------- | ---------- | ----------------------------------------------------- |
| 105   | Schema + Entity Layer (6 models, 5 enums, Drizzle, types, lifecycle)               | 2/2 plans | ✅ Shipped | ✅ VERIFICATION.md (11/11 truths, 35 tests)           |
| 106   | API Routes + Intake Screen (CRUD, cooling-off, AI frivolity, CSOS export)          | 4/4 plans | ✅ Shipped | ⚠️ VALIDATION.md only (14 threat mitigations pending) |
| 107   | UI + Widgets (intake wizard, dispute form, mediation thread, widgets, detail page) | 4/4 plans | ✅ Shipped | ⚠️ VALIDATION.md only                                 |
| 108   | CSOS Export Package (PDF generation, Form 2 compliance)                            | 2/2 plans | ✅ Shipped | ⚠️ VALIDATION.md only                                 |

**Key files shipped:**

- `src/entities/dispute/` — Full entity layer: types, constants, lifecycle state machine, reference generator, 13 UI components, PII sanitizer, 8 Zod schemas, 35+ tests
- `src/app/api/disputes/` — 9 route handlers: list, create, get, update, submit (cooling-off), messages (Realtime), evidence (S3 upload), assign, ruling, intake-screen (AI screening), csos-export (Form 2 PDF)
- `src/features/dispute/` — 6-stage intake wizard: EmotionCheckIn, SelfResolutionChecklist, FrivolityScreen, ConflictTipsPanel, ReviewScreen, DisputeForm
- `src/widgets/dashboard/ui/` — MyDisputesWidget (resident), AdminDisputesWidget (board/admin moderation queue)
- `src/app/(tenant)/admin/disputes/` — Admin list + detail pages with breadcrumbs
- `src/app/(tenant)/disputes/[id]/` — Resident-facing dispute detail page with responsive 2-column layout

### Community Merit Disputes (Phase 45-02/45-03)

**Status:** Complete — subset of Phase 45 (M5b Anchor Tenant)

- `POST /api/merits/[id]/dispute` — Resident self-dispute (ACTIVE → DISPUTED)
- `POST /api/merits/[id]/resolve` — Admin uphold/overturn resolution
- `DisputeResolveDialog` — Modal with UPHOLD/OVERTURN buttons
- `PendingDisputesWidget` — Admin widget showing pending dispute count
- This is a **separate third dispute domain** (behaviour record disputes), distinct from the DisputeCase system.

---

## 7. Recommendations

### Immediate (next phase)

1. **Add SLA tracking to maintenance** — `responseTargetHours`, `resolutionTargetHours` per category/priority. Store `firstRespondedAt`, `resolutionDueAt`. Surface breach alerts in admin dashboard. This is table stakes.

2. **Add automated escalation** — Rule engine: "if IN_PROGRESS and no update in 48h, notify board admin." Simple, configurable per tenant. Start with 3 rules, expand later.

3. **Add status change notifications for maintenance** — Email (via existing email infrastructure) and in-app notification (via existing Notification model) on status transitions. This closes the biggest UX gap.

4. **Verify Phases 106–108** — Run `/gsd-verify-work` on each phase. Phase 105 has a passing VERIFICATION.md (11/11); Phases 106–108 have only VALIDATION.md plans with all 14 threat mitigations marked ⬜ pending. UAT document exists for Phase 106 with 21 scenarios — needs execution.

### Short-term (within M5)

5. **Unify "My Cases" view** — A single widget or page that shows both a resident's maintenance requests and dispute cases in one list, sorted by last activity. Reuse existing MaintenanceCard/DisputeListTable components behind a common list wrapper.

6. **Build knowledge base foundation** — Start with 10–15 static FAQ articles (how to submit maintenance, what the HOA covers vs owner responsibility, dispute process overview). Integrate into the ticket submission flow as "related articles."

7. **Add vendor performance dashboard** — Surface `estimatedCost` vs `actualCost`, average resolution time per vendor, assignment count. Simple admin widget.

8. **Ship Phase 104 (AI Provider Infrastructure)** — Currently blocking the AI frivolity screening in the dispute intake wizard. The intake screen gracefully degrades (503 when AI unavailable), but the full de-escalation experience requires Phase 104.

### Medium-term (M6+)

9. **Preventive maintenance scheduling** — Recurring work orders for common-area maintenance. Integrate with reserve study data for capital planning.

10. **Mobile quick-submit** — Photo-first flow with optional description. Use existing image upload infrastructure from maintenance form.

11. **Cost analytics dashboard** — Trend analysis, budget vs actual, category spending breakdown. Critical for HOA board reporting.

12. **Unified component library** — Shared StatusBadge, PriorityBadge, Timeline, ActionBar components that work across maintenance, disputes, and merits. Reduce the "two different apps" feel.

---

## 8. Bottom Line

Your system is **over-engineered on structure, under-engineered on operations** — but significantly further along than a surface read of the planning docs would suggest.

You have the best dispute resolution system in any community platform — the CSOS compliance pipeline, de-escalation intake wizard, and POPIA-aware AI screening are not just designed but **fully implemented** (12 plans across Phases 105–108, shipped 2026-06-26). Your maintenance audit trail, routing intelligence, and multi-language architecture are above market.

But you're missing the basics that every competitor ships: **SLA tracking, automated escalation, response-time measurement, status notifications for maintenance, and a resident knowledge base**. These aren't nice-to-haves — they're table stakes for any ticketing system. HOA boards will expect them from day one.

The dispute system is real but unverified — Phases 106–108 have VALIDATION.md plans with all threat mitigations still pending. The AI intake screen gracefully degrades until Phase 104 (AI Provider Infrastructure) ships. The combined testing surface is strong (61 dispute tests + 21 UAT scenarios), but the verification gates haven't been run.

**Priority order for closing gaps:**

1. SLA tracking + automated escalation (maintenance)
2. Status change notifications (maintenance)
3. Verify Phases 106–108 (UAT + threat mitigation validation)
4. Ship Phase 104 (AI Provider — unblocks full intake wizard)
5. Unified My Cases view
6. Knowledge base
7. Vendor scorecards + cost analytics
