# Phase 105: Dispute Schema & Entity Layer - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning
**Source:** ADVISORY-017.md + resolved gates (G1–G4)

<domain>
## Phase Boundary

Add the dispute resolution domain models (DisputeCase, DisputeEvidence, DisputeEvent, DisputeMessage, DisputeMessageVersion, DisputeNotification) and 5 supporting enums to the Prisma schema. Run migration, generate Drizzle schemas, seed the disputes PlatformModule, and create the entity layer (`src/entities/dispute/`) with types, constants, lifecycle state machine, and server-side query helpers. This phase is the prerequisite for all subsequent dispute phases (API routes, intake wizard, widgets, CSOS export).

Depends on Phase 104 (AI Provider) — `DisputeMessageVersion` model, `disputes` module seed, and entity helpers follow the same patterns.
</domain>

<decisions>
## Implementation Decisions

### Schema (Phase 1)

- DisputeCase — 22 fields, 4 user FK relations (DisputeComplainant, DisputeRespondent, DisputeModerator, DisputeClosedBy), 6 indexes
- DisputeEvidence — 8 fields, FK to DisputeCase + uploader
- DisputeEvent — 10 fields (append-only, no updates), FK to DisputeCase + actor
- DisputeMessage — 11 fields (isInternal flag for moderator notes), FK to DisputeCase + sender
- DisputeMessageVersion — ORIGINAL content preservation (Gate G2: full version history)
- DisputeNotification — 7 fields, FK to DisputeCase + user
- 5 enums: DisputeStatus (11 values), DisputeCategory (11), DisputeSeverity (4), DisputeRespondent (4), DisputeEventType (14)
- Reference number: DSP-YYYY-NNNN pattern
- CoolOffEndsAt: DRAFT→SUBMITTED gate, tenant-configurable 24h–72h (Gate G1)
- isConfidential: true masks complainant from respondent until mediation accepted (Gate G3)

### Entity Layer (Phase 2)

- `src/entities/dispute/index.ts` — client-safe exports: DTOs, constants, status/category maps
- `src/entities/dispute/index.server.ts` — server-only: DB queries, guards
- `src/entities/dispute/model/types.ts` — TypeScript interfaces
- `src/entities/dispute/model/constants.ts` — STATUS_LABELS, CATEGORY_LABELS
- `src/entities/dispute/model/lifecycle.ts` — VALID_TRANSITIONS map, canTransition(from, to, role)
- `src/entities/dispute/api/route.ts` — dispute route helpers
- `src/entities/dispute/api/reference.ts` — generateDisputeReference()
- `src/entities/dispute/ui/` — DisputeStatusBadge, DisputeCategoryBadge, SeverityIndicator

### Module Seed

- Key: `disputes`, minTier: STANDARD, defaultEnabled: false
- Added to prisma/seed/modules.ts in the STANDARD tier section

### Risk Escalation

- If Drizzle generator fails on 4 named user FK relations in DisputeCase, stop and report. Named relation pattern ("DisputeComplainant" etc.) may need explicit relationName in Drizzle config.

### Cooling-Off

- Tenant-configurable via `disputes.coolingOffHours` setting (default 24h, max 72h)
- Server-side validation only (not client-claimed)

### Audit & Retention

- Soft-delete only (deletedAt)
- DisputeEvent is append-only
- DisputeMessage edits preserved via DisputeMessageVersion
- CSOS-escalated cases: 10-year retention

### the agent's Discretion

- Exact Drizzle file naming (generator output — use actual filenames after `prisma generate`)
- Barrel re-export paths in `@api/server`
- Whether to add schema push [BLOCKING] task (has schema changes — yes)
  </decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Dispute Design

- `docs/advisories/ADVISORY-017.md` — Full dispute resolution system specification (all 20 sections)
- `docs/advisories/ADVISORY-017-SUPPLEMENTAL-2.md` — AI pool integration (intake screen calls pool)
- `docs/advisories/ADVISORY-017-SUPPLEMENTAL.md` — Original AI provider concept (superseded by SUPP-2)

### Existing Patterns

- `prisma/schema.prisma` — Existing models, enum conventions, relation patterns
- `prisma/seed/modules.ts` — PlatformModule seeding pattern
- `drizzle.config.ts` — Drizzle output: `./drizzle` (not `src/db/schema`)
- `src/entities/tenant/` — Entity layer pattern (index.ts, index.server.ts, api/, model/)
- `src/shared/api/server/index.ts` — Barrel export pattern

### Phase 104 Context

- `.planning/phases/104-ai-provider-infrastructure-translate-migration/104-01-SUMMARY.md` — Schema + entity patterns established
- `.planning/phases/104-ai-provider-infrastructure-translate-migration/104-RESEARCH.md` — getTenantModule, module seeding, DB migration patterns

### FSD Rules

- Entities may export client-safe and server-only barrels
- No entities → shared violations
- `steiger` check enforced
  </canonical_refs>

<specifics>
## Specific Ideas

### Schema Addition

Add after existing models in `prisma/schema.prisma`:

```prisma
model DisputeCase { ... }
model DisputeEvidence { ... }
model DisputeEvent { ... }
model DisputeMessage { ... }
model DisputeMessageVersion { ... }
model DisputeNotification { ... }
```

### Migration Command

```bash
npx prisma migrate dev --name add_dispute_resolution
npx prisma generate
```

### Schema Push Requirement

**[BLOCKING]** `prisma db push` or `npx prisma migrate dev` must run after schema changes. Types from Drizzle config will pass typecheck without push — creating a false-positive verification.

### Pre-Execution Discovery (from ADVISORY-017 §18)

```bash
grep -n "model CommunityMerit" prisma/schema.prisma
grep -n "@relation" prisma/schema.prisma | grep "user" | wc -l
cat drizzle.config.ts | grep output
ls prisma/seed/
grep -r "from 'lucide-react'" src/widgets/dashboard/model/widgets.ts | head -5
```

</specifics>

<deferred>
## Deferred Ideas

- Dispute API routes, intake wizard, widgets, CSOS export (Phases 106–108)
- CSOS Form 2 legal review by HOA attorney (pre go-live)
- Tenant setting: `csos.schemeRegistration` (BD issue before Phase 108)
- HOA rules library (future Resource module integration)
- Automated CSOS deadline reminders (future Notification module)
- Multi-language dispute forms (future i18n pass)
  </deferred>

---

_Phase: 105-dispute-schema-entity-layer_
_Context gathered: 2026-06-25 from ADVISORY-017.md_
