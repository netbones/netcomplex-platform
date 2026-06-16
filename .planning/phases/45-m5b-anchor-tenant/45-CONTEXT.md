---
phase: 45-m5b-anchor-tenant
type: execute
status: planning
created: 2026-06-04
updated: 2026-06-16
milestone: M5b (anchor tenant launch)
---

# Phase 45: Anchor Tenant Features

**Gathered:** 2026-06-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the 4 launch-blocking features for Soralia Village's 180-home rollout. Each is a feature, not a fix — the system functions without it, but the anchor tenant experience is incomplete.

**In scope:**
- Community Merits & Standing System (BD `2at`) — flagship
- OTP-based password reset via Better Auth emailOTP plugin (BD `0tb`)
- i18n batch for 37 widgets (BD `l23`) — prioritize most visible surfaces
- Tiptap content localization (BD `0f7`) — blocked on l23

**Out of scope:**
- 7-day production soak — deferred to its own phase when ready
- dWallet (Phase 47, sibling in M5b)
- M5a architecture work (Phase 44)
- M5+ post-launch features (Phase 46)
</domain>

<decisions>
## Implementation Decisions

### Phase Identity
- **D-01:** Phase name is "Anchor Tenant Features" — the 7-day soak was originally repositioned here but creates the wrong framing. Soak gets its own separate phase when the system is ready for it.

### Community Merits — Data Model
- **D-02:** Standalone `behaviorRecord` table — clean separation from `platformSuspension` (Phase 33). Merits, warnings, and infractions live in their own model. Phase 33 suspension remains the enforcement mechanism; merits is the positive/negative tracking surface.
- **D-03:** Tier thresholds (Gold/Silver/Bronze/Probation) are hardcoded constants, not per-tenant configurable. Keeps complexity down for MVP; re-evaluate if a second tenant needs different thresholds.

### Community Merits — Resident Visibility
- **D-04:** Standing badge visible on directory cards AND profile page. Directory gives community awareness; profile gives the resident their full standing detail.

### Community Merits — Auto-Escalation
- **D-05:** Event-driven escalation — on infraction creation, immediately evaluate if thresholds are crossed. Same pattern as Phase 33 auto-unsuspension on API request (no cron job needed).

### Community Merits — Admin UI
- **D-06:** Dedicated admin page at `/admin/merits` — full CRUD for behavior entries, standing overview per user, tier audit log, manual override. Not an AdminLayer widget (too much surface area for an inline widget).

### OTP Password Reset
- **D-07:** Email-based OTP (6-digit code) via Better Auth `emailOTP` plugin. No authenticator app required — works with existing MailerSend infrastructure. Lower friction for residents.

### Feature Execution Order
- **D-08:** Plan order: (1) OTP password reset (quickest win, smallest scope), (2) Community Merits (flagship, most complex), (3) i18n batch (prioritize visible surfaces: HomeLayer, admin domain grids, navigation), (4) Tiptap i18n (blocked on l23 completion).
- **D-09:** i18n batch prioritizes the most visible surfaces first — HomeLayer widgets, admin domain grids, navigation. Less-visible widgets deferred to a follow-up.

### Dependencies from ROADMAP
- **D-10:** l23 (i18n epic) blocks 0f7 (Tiptap localization). Plan i18n batch before Tiptap i18n.
- **D-11:** cs5 (MyHomeSpace) ideally resolved in Phase 44 to avoid duplicating fix work. If not resolved there, carry into this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Definition
- `.planning/ROADMAP.md` §Phase 45 — Phase boundary, BD sources, dependencies
- `.planning/STATE.md` — Current project state and active decisions
- `.planning/PROJECT.md` — Project-level context, constraints, key decisions

### Precedent Phases (MUST understand before planning)
- `.planning/phases/33-user-suspension/33-CONTEXT.md` — Suspension system that Community Merits complements (same admin UI zone, auto-unsuspension pattern)
- `.planning/phases/42-i18n-hydration-fix/42-CONTEXT.md` — i18n patterns (`useSafeTranslation`, `I18nextProvider`) that inform the i18n batch
- `.planning/phases/34-admin-layer/34-CONTEXT.md` — AdminLayer architecture (precedent for admin page hierarchy)
- `.planning/phases/27-tenant-config-and-gaps/27-CONTEXT.md` — Tenant settings infrastructure (relevant if thresholds need config later)

### Architecture & Standards
- `docs/STEERING/ADR.md` — Architecture Decision Records
- `src/lib/auth.ts` — Better Auth configuration (where emailOTP plugin would be wired)
- Phase 33 suspension API routes (`src/app/api/users/[id]/suspend/route.ts`) — Pattern to follow for merits API
- Phase 42 `useSafeTranslation` hook — Pattern for i18n batch migration
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase 33 suspension API routes** — Pattern for admin CRUD with tenant isolation, transaction-wrapped mutations, and requireNotSuspended-style guard helpers. Merits will follow the same auth guard + Drizzle transaction pattern.
- **`useSafeTranslation` hook** (Phase 42) — Canonical pattern for i18n-safe translations with fallback. i18n batch should use this for all 37 widget translations.
- **AdminLayer** (Phase 34) — Command bar + domain grid pattern. Merits admin page can reuse AdminLayer's urgency badge and domain grid components.
- **Survey builder admin page** (Phase 36) — Precedent for a dedicated admin CRUD page with form validation, listing, and detail/edit views.

### Established Patterns
- **Drizzle + Prisma dual ORM** — Prisma for schema/migrations, Drizzle for queries. Any new schema (behaviorRecord table) goes through Prisma first.
- **Better Auth plugin pattern** — Phase 43 installed `validation-better-auth` via the plugin system. emailOTP will follow the same pattern.
- **API response envelope** — `apiSuccess(data)` + `apiError(code, status, message)` from Phase 35 alignment.
- **Event-driven state checks** — Phase 33 checks suspension expiry on every API request. Community Merits auto-escalation follows same pattern (check thresholds on infraction creation).

### Integration Points
- **Admin nav** — Merits admin page needs registration in admin navigation (admin domain items or nav constants).
- **Directory widgets** — Standing badge on directory cards renders in existing `UnifiedResidentCard` or similar.
- **Profile page** — Standing detail section in resident profile/settings page.
- **Better Auth auth.ts** — Where emailOTP plugin configuration lives.
</code_context>

<specifics>
## Specific Ideas

- Community Merits mirrors the Phase 33 suspension admin UI pattern — admin selects a user, creates a merit/warning/infraction entry with reason and optional expiry.
- Standing tiers calculated from merit balance: positive merits offset infractions. Simple math, no complex scoring.
- Email OTP follows the same email infrastructure as Phase 10 (MailerSend) — no new email provider.
</specifics>

<deferred>
## Deferred Ideas

- **7-day production soak** — Moved out of this phase. Create a new phase when the system is stable and you're ready for launch verification.
- **Per-tenant configurable tier thresholds** — Hardcoded for MVP. If a second tenant needs different thresholds, revisit.
- **Low-visibility i18n widgets** — The long tail of less-visited widgets. Deferred to follow-up after the visible surfaces are done.
</deferred>

---

*Phase: 45-m5b-anchor-tenant*
*Context gathered: 2026-06-16*
