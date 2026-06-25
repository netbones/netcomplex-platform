# Phase 106: Dispute API Routes & Intake Screen - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning
**Source:** ADVISORY-017.md Phases 3 + SUPPLEMENTAL-2 Phase C

<domain>
## Phase Boundary

Implement all dispute API routes and the intake screen with AI frivolity checking. This phase wires the dispute domain into the API layer — CRUD operations, cooling-off enforcement, mediation thread visibility rules, evidence upload, moderator assignment, ruling issuance, and CSOS export. The intake screen integrates with Phase 104's AI pool for frivolity screening.

Depends on: Phase 104 (AI Provider) + Phase 105 (Dispute Schema + Entity).
</domain>

<decisions>
## Implementation Decisions

### API Routes (from ADVISORY-017 §10)

- `POST /api/disputes` — Create DRAFT with coolingOffEndsAt = now() + tenant cooling-off hours
- `GET /api/disputes` — List disputes for authenticated user
- `GET /api/disputes/[id]` — Get single dispute (access-controlled)
- `PATCH /api/disputes/[id]` — Update dispute fields
- `POST /api/disputes/[id]/submit` — DRAFT→SUBMITTED with server-side cooling-off validation (423 before expiry)
- `POST /api/disputes/[id]/messages` — Post to mediation thread (isInternal flag controls visibility)
- `GET /api/disputes/[id]/messages` — List messages (filtered by isParty OR isModerator)
- `POST /api/disputes/[id]/evidence` — Upload evidence files
- `POST /api/disputes/[id]/assign` — Admin/board assign moderator
- `POST /api/disputes/[id]/ruling` — Board issue formal ruling
- `GET /api/disputes/[id]/csos-export` — Generate CSOS Form 2 PDF

### Route Pattern

Every route: `withTenant()` → `getSessionAndRole()` → `assertModuleEnabled('disputes')` → business logic → `apiSuccess()` / `apiError()`

### Intake Screen (from ADVISORY-017 §7 + SUPPLEMENTAL-2 §5)

- `POST /api/disputes/intake-screen` — AI frivolity check
- Uses Phase 104's AI pool: `checkQuota()` → `getAiProvider()` → `recordUsage()`
- Sanitises description before sending to AI (POPIA — strip surnames, unit numbers)
- Returns: `toneScore`, `likelyFrivolous`, `suggestedCategory`, `deEscalationTip`
- Response not persisted — advisory only, never stored
- Graceful degradation: returns 503 when AI unavailable; intake wizard skips step

### Access Control (from ADVISORY-017 §12)

| Action             | RESIDENT | COMMITTEE  | BOARD | ADMIN |
| ------------------ | -------- | ---------- | ----- | ----- |
| File dispute       | ✓        | ✓          | ✓     | ✓     |
| View own dispute   | ✓        | ✓          | ✓     | ✓     |
| View all disputes  | —        | ✓(limited) | ✓     | ✓     |
| Assign moderator   | —        | —          | ✓     | ✓     |
| Post mediation     | ✓(party) | —          | ✓     | ✓     |
| Post internal note | —        | ✓          | ✓     | ✓     |
| Issue ruling       | —        | —          | ✓     | ✓     |
| Export CSOS        | ✓(own)   | —          | ✓     | ✓     |
| Delete/expunge     | —        | —          | —     | ✓     |

### CSOS Export PDF

- 6 sections: Parties, Summary, Resolution History, Evidence, Ruling/Outcome, Certification
- Rate-limited: 3 exports/case/day
- Each export logged as DisputeEvent (NOTE_ADDED with metadata)

### the agent's Discretion

- Exact PDF generation approach (existing infrastructure or new)
- Evidence file upload endpoint (existing upload patterns vs. new)
- Rate-limiting implementation (existing rateLimitByKey/rateLimitByUser helpers)
  </decisions>

<canonical_refs>

## Canonical References

- `docs/advisories/ADVISORY-017.md` — Full spec (§10 API Routes, §12 Access Control, §13 CSOS Export)
- `docs/advisories/ADVISORY-017-SUPPLEMENTAL-2.md` §5 — Intake screen pool integration pattern
- `.planning/phases/104-ai-provider-infrastructure-translate-migration/` — AI pool (checkQuota, recordUsage, getAiProvider)
- `.planning/phases/105-dispute-schema-entity-layer/` — Schema + entity layer (prerequisite)
- `src/shared/api/server/index.ts` — apiSuccess/apiError/apiInternalError envelope
- `src/entities/tenant/lib/modules/` — assertModuleEnabled pattern
  </canonical_refs>

<deferred>
## Deferred Ideas

- Intake wizard UI (Phase 107)
- Widget registration (Phase 107)
- Full CSOS PDF formatting (Phase 108)
- Ruling issuance workflow polish (Phase 108)
  </deferred>

---

_Phase: 106-dispute-api-routes-intake-screen_
_Context gathered: 2026-06-25 from ADVISORY-017.md_
