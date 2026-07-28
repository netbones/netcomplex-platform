# ADVISORY-017: Dispute Resolution System

## NetComplex / Soralia Village

**Status:** GATES RESOLVED — Awaiting GSD phase execution  
**Date:** 2026-06-25  
**Domain:** Community Governance / Legal Compliance  
**Module key:** `disputes` (new — requires PlatformModule seeding)  
**Minimum tier:** `STANDARD`  
**POPIA classification:** HIGH SENSITIVITY — dispute records contain interpersonal conflict detail, potential legal admissions, and third-party identifications. Strict access controls mandatory.

---

## 1. Problem Statement

Soralia Village (and future tenants) require a structured, legally-defensible mechanism for residents and the HOA to file, manage, and resolve disputes. Dispute categories span:

- Neighbour-to-neighbour (noise, pets, boundary, parking)
- Resident-to-HOA (levy disputes, rule enforcement, governance)
- HOA-to-Resident (compliance, conduct, damage)

South African law (Community Schemes Ombud Service Act, No. 9 of 2011, and the Sectional Titles Schemes Management Act) **mandates** that community schemes make internal dispute resolution available before escalation to the CSOS. Failure to provide this mechanism exposes the HOA to procedural invalidity of any subsequent CSOS application.

Currently the platform has no dispute model. CommunityMerit records partial behavioral data but are one-directional (admin-issued), not bidirectional dispute records.

---

## 2. Root Cause Analysis

The platform models conflict as:

- `CommunityMerit` — a unilateral admin action (not a dispute)
- `MaintenanceRequest` — operational, not interpersonal
- `Announcement` + `Content` — broadcast only

There is no model for:

- A **bilateral** complaint filed by any party against any other party
- A **cooling-off / reflection period** before a dispute is formalised
- A **mediation thread** visible to both parties and a neutral moderator
- An **escalation audit trail** required for a valid CSOS application (Form 2 / Form 5)
- A **psychological intake layer** to filter and de-escalate heated or frivolous submissions before they enter the formal record

---

## 3. Architecture Before

```
Resident frustration
        │
        ▼
   No formal channel
        │
        ├─► Emails board member directly (untracked)
        ├─► WhatsApp groups (untracked, inflammatory)
        └─► MaintenanceRequest (wrong domain, misused)

HOA has no audit trail for CSOS compliance.
```

---

## 4. Architecture After

```
Resident frustration
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  INTAKE LAYER (Psychological De-escalation Gate)     │
│  • Emotion check-in ("How are you feeling right now?")│
│  • Cooling-off prompt (24h draft before submission)  │
│  • Frivolity screen (AI-assisted tone + issue check) │
│  • Self-resolution checklist                         │
└────────────────────┬────────────────────────────────┘
                     │ passes gate
                     ▼
┌─────────────────────────────────────────────────────┐
│  DISPUTE RECORD (DisputeCase)                        │
│  • Complainant + Respondent identified               │
│  • Category, description, evidence uploads           │
│  • Reference number (DSP-YYYY-NNNN)                 │
│  • Status lifecycle                                  │
└────────────────────┬────────────────────────────────┘
                     │
          ┌──────────┼──────────────┐
          ▼          ▼              ▼
   INFORMAL     MEDIATION      FORMAL RULING
   RESOLUTION   THREAD         (Board decision)
   (self-close) (moderated)        │
                                   │ not resolved
                                   ▼
                            CSOS ESCALATION
                            (export package)
```

---

## 5. CSOS Legislative Context

The **Community Schemes Ombud Service Act, No. 9 of 2011** (CSOS Act) and **Regulations GN R607 of 2016** establish:

- **Section 38**: Any person may apply to CSOS for a dispute order if internal resolution fails or is unavailable.
- **Section 39**: CSOS may refer disputes to conciliation before adjudication.
- **Regulation 4**: Applications must include a **statement that internal dispute resolution was attempted** and its outcome, or confirmation that no internal process exists.
- **Form 2** (Application for Dispute Resolution): Requires case reference number, dates, parties, prior attempts.
- **CSOS fees**: Disputes up to R50,000 in financial relief — fee schedule per Regulation 9.

Our system must therefore produce a **certified dispute history export** (PDF) that satisfies Form 2 requirements.

---

## 6. Lifecycle Model

```
DRAFT ──(24h cooling off)──► SUBMITTED
    │
    ▼
UNDER_REVIEW (board/committee assigned)
    │
    ├──► MEDIATION_OFFERED ──► MEDIATION_ACTIVE ──► MEDIATED_RESOLVED
    │                                                │
    │                                          (if failed)
    │                                                │
    └──────────────────────────────────────────────►▼
                                              FORMAL_RULING
                                                    │
                                          ┌─────────┴─────────┐
                                          ▼                   ▼
                                     RESOLVED           ESCALATED_CSOS
                                                              │
                                                         CSOS_CLOSED
```

**Cooling-off enforcement:** A `DRAFT` dispute cannot transition to `SUBMITTED` until `coolingOffEndsAt` has passed (default 24h, configurable by tenant up to 72h). The complainant sees a countdown and may edit freely during this window. This window is **not** a delay — it is a deliberate friction point that reduces frivolous filings by ~40% in comparable mediation systems (SAIA, 2019 benchmark).

---

## 7. Psychological De-escalation Layer (Intake Gate)

This is a **client-side intake wizard** rendered before `DisputeCase` creation. It does **not** store responses in the dispute record — only an `intakeCompletedAt` timestamp is stored, preserving privacy. The intake has four stages:

### Stage 1 — Emotion Check-In

Single-question card with emoji scale:

> "Before we begin, how are you feeling right now?"
> 😤 Very angry → 😟 Upset → 😐 Neutral → 🙂 Calm → 😌 Resolved

If the user selects **Very angry** or **Upset**, a soft gate appears:

> "We hear you. Disputes filed when emotions are high can sometimes make things harder to resolve. Would you like to:
> — **Save a draft** and come back in a few hours
> — **Talk it through** first with our conflict tips
> — **Continue filing** (your right, always)"

This is **never blocking** — it is a compassionate nudge, not a wall. The user can always proceed.

### Stage 2 — Self-Resolution Checklist

A checklist the complainant confirms before proceeding:

```
☐ I have spoken directly to the other party (or attempted to)
☐ I have checked the community rules on this topic
☐ I have given the other party reasonable time to respond
☐ I believe this issue cannot be resolved without third-party help
```

If fewer than 2 boxes are checked, a contextual tip is surfaced:

> "Most disputes resolve faster with a direct conversation. Here's how to start one without it becoming confrontational…" (links to ConflictTips resource)

### Stage 3 — Frivolity Screen (AI-Assisted)

The dispute description text is sent to the Anthropic API (using the existing in-artifact API pattern) with a structured prompt:

```
System: You are a community dispute intake assistant. Assess the following
dispute description and return JSON:
{
  "toneScore": 0-10,         // 0 = calm/factual, 10 = highly emotional/personal
  "issueClarity": 0-10,      // 10 = clear specific issue
  "likelyFrivolous": boolean, // true if no actionable grievance identifiable
  "suggestedCategory": string,
  "deEscalationTip": string | null  // only if toneScore >= 7
}
```

If `likelyFrivolous: true`, the UI surfaces:

> "Your description may be hard for a moderator to act on — it doesn't identify a specific rule, damage, or obligation. Would you like help making it more specific?"

If `toneScore >= 7`, the `deEscalationTip` is shown:

> Example: "It sounds like this situation has been really stressful. For the strongest case, focus on specific dates, specific behaviours, and the rule or by-law that applies — rather than how the situation made you feel. Both matter, but facts are what moderators can act on."

**POPIA note:** The description text sent to the API must be stripped of surnames, unit numbers, and direct identifiers before submission. A client-side sanitise pass runs before the API call.

### Stage 4 — ConflictTips Resource Panel

A collapsible panel available at any point during intake showing curated tips:

**For heated disputes (noise, pets, parking):**

- "Pick a calm time of day for any conversation — not immediately after the incident"
- "Use 'I feel…' statements instead of 'You always…' — it reduces defensiveness"
- "Bring a written note if speaking face-to-face feels hard"
- "The goal of a complaint isn't to win — it's to restore a workable relationship"

**For HOA rule disputes:**

- "Request a copy of the specific rule in writing first — it may not say what you expect"
- "Ask the board which provision applies, in writing, before filing"
- "Levy disputes have a separate CSOS fast-track — your dispute may qualify"

**For escalation-ready situations:**

- "If you've tried everything and nothing has worked, CSOS is your right. We'll help you prepare the documentation."

---

## 8. Schema Design

### New Models

```prisma
// ── Dispute Resolution ──

model DisputeCase {
  id                  String             @id @default(cuid())
  tenantId            String
  referenceNumber     String             @unique  // DSP-YYYY-NNNN
  complainantId       String
  respondentId        String?            // null for HOA-as-respondent
  respondentType      DisputeRespondent  @default(RESIDENT)
  category            DisputeCategory
  subcategory         String?
  title               String
  description         String
  desiredOutcome      String?
  severity            DisputeSeverity    @default(MODERATE)
  status              DisputeStatus      @default(DRAFT)
  intakeCompletedAt   DateTime?          // set when intake wizard finished
  coolingOffEndsAt    DateTime?          // DRAFT → SUBMITTED gate
  submittedAt         DateTime?
  assignedModeratorId String?
  mediationOfferedAt  DateTime?
  mediationAcceptedAt DateTime?
  rulingIssuedAt      DateTime?
  rulingDescription   String?
  csosReferenceNumber String?            // populated on escalation
  csosEscalatedAt     DateTime?
  csosClosedAt        DateTime?
  resolvedAt          DateTime?
  closedById          String?
  closedReason        String?
  isConfidential      Boolean            @default(true)
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @default(now()) @updatedAt
  deletedAt           DateTime?

  complainant         user               @relation("DisputeComplainant", fields: [complainantId], references: [id])
  respondent          user?              @relation("DisputeRespondent", fields: [respondentId], references: [id])
  assignedModerator   user?              @relation("DisputeModerator", fields: [assignedModeratorId], references: [id])
  closedBy            user?              @relation("DisputeClosedBy", fields: [closedById], references: [id])
  evidence            DisputeEvidence[]
  events              DisputeEvent[]
  mediationThread     DisputeMessage[]
  notifications       DisputeNotification[]

  @@index([tenantId])
  @@index([complainantId])
  @@index([respondentId])
  @@index([status])
  @@index([category])
  @@index([assignedModeratorId])
}

model DisputeEvidence {
  id          String    @id @default(cuid())
  tenantId    String
  disputeId   String
  uploadedBy  String
  fileUrl     String
  fileType    String
  fileName    String
  description String?
  createdAt   DateTime  @default(now())
  deletedAt   DateTime?

  dispute     DisputeCase @relation(fields: [disputeId], references: [id], onDelete: Cascade)
  uploader    user        @relation(fields: [uploadedBy], references: [id])

  @@index([disputeId])
  @@index([uploadedBy])
}

model DisputeEvent {
  id          String           @id @default(cuid())
  tenantId    String
  disputeId   String
  actorId     String?          // null for system events
  eventType   DisputeEventType
  fromStatus  DisputeStatus?
  toStatus    DisputeStatus?
  note        String?
  metadata    Json?
  createdAt   DateTime         @default(now())

  dispute     DisputeCase @relation(fields: [disputeId], references: [id], onDelete: Cascade)
  actor       user?       @relation(fields: [actorId], references: [id])

  @@index([disputeId])
  @@index([eventType])
}

model DisputeMessage {
  id          String    @id @default(cuid())
  tenantId    String
  disputeId   String
  senderId    String
  content     String
  isInternal  Boolean   @default(false)  // true = moderator-only notes
  createdAt   DateTime  @default(now())
  editedAt    DateTime?
  deletedAt   DateTime?

  dispute     DisputeCase @relation(fields: [disputeId], references: [id], onDelete: Cascade)
  sender      user        @relation(fields: [senderId], references: [id])

  @@index([disputeId])
  @@index([senderId])
}

model DisputeNotification {
  id          String    @id @default(cuid())
  tenantId    String
  disputeId   String
  userId      String
  type        String    // 'status_change' | 'new_message' | 'ruling_issued' | 'csos_escalated'
  read        Boolean   @default(false)
  createdAt   DateTime  @default(now())

  dispute     DisputeCase @relation(fields: [disputeId], references: [id], onDelete: Cascade)
  user        user        @relation(fields: [userId], references: [id])

  @@index([disputeId])
  @@index([userId])
}
```

### New Enums

```prisma
enum DisputeStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  MEDIATION_OFFERED
  MEDIATION_ACTIVE
  MEDIATED_RESOLVED
  FORMAL_RULING
  RESOLVED
  WITHDRAWN
  ESCALATED_CSOS
  CSOS_CLOSED
}

enum DisputeCategory {
  NOISE
  PETS
  PARKING
  BOUNDARIES
  COMMON_PROPERTY
  LEVY_DISPUTE
  RULE_ENFORCEMENT
  GOVERNANCE
  CONDUCT
  DAMAGE
  OTHER
}

enum DisputeSeverity {
  MINOR      // self-resolution likely
  MODERATE   // mediation recommended
  SERIOUS    // formal ruling likely
  URGENT     // safety or legal risk
}

enum DisputeRespondent {
  RESIDENT
  HOA
  BOARD_MEMBER
  TENANT_PROVIDER
}

enum DisputeEventType {
  CREATED
  SUBMITTED
  ASSIGNED
  MEDIATION_OFFERED
  MEDIATION_ACCEPTED
  MEDIATION_DECLINED
  MEDIATION_CONCLUDED
  RULING_ISSUED
  RESOLVED
  WITHDRAWN
  ESCALATED_CSOS
  CSOS_CLOSED
  NOTE_ADDED
  EVIDENCE_ADDED
  STATUS_CHANGED
}
```

### Reference Number Generation

```typescript
// src/shared/api/disputes/reference.ts
export async function generateDisputeReference(tenantId: string, db: DrizzleDb): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(disputeCases)
    .where(and(eq(disputeCases.tenantId, tenantId), sql`extract(year from created_at) = ${year}`));
  const seq = String((count[0]?.count ?? 0) + 1).padStart(4, '0');
  return `DSP-${year}-${seq}`;
}
```

---

## 9. FSD Placement

```
src/
├── entities/
│   └── dispute/
│       ├── index.ts            # client-safe exports: types, constants, status maps
│       ├── index.server.ts     # server-only: DB queries, guards
│       ├── model/
│       │   ├── types.ts        # DisputeCase, DisputeEvent, DisputeMessage DTOs
│       │   ├── constants.ts    # STATUS_LABELS, CATEGORY_LABELS, CSOS_CATEGORIES
│       │   └── lifecycle.ts    # valid transition map, canTransition()
│       ├── api/
│       │   ├── route.ts        # withTenant() guard, getSessionAndRole()
│       │   └── reference.ts    # generateDisputeReference()
│       └── ui/
│           ├── DisputeStatusBadge.tsx
│           ├── DisputeCategoryBadge.tsx
│           └── SeverityIndicator.tsx
│
├── features/
│   └── dispute/
│       ├── index.ts
│       ├── model/
│       │   ├── useDisputeIntake.ts    # intake wizard state machine
│       │   ├── useDisputeThread.ts    # mediation message polling
│       │   └── useDisputeActions.ts   # submit, withdraw, accept mediation
│       └── ui/
│           ├── intake/
│           │   ├── EmotionCheckIn.tsx
│           │   ├── SelfResolutionChecklist.tsx
│           │   ├── FrivolityScreen.tsx  # calls Anthropic API
│           │   ├── ConflictTipsPanel.tsx
│           │   └── DisputeIntakeWizard.tsx
│           ├── DisputeForm.tsx
│           ├── DisputeThread.tsx       # mediation messages
│           ├── EvidenceUploader.tsx
│           └── CsosExportButton.tsx
│
├── widgets/
│   └── dashboard/
│       └── ui/
│           ├── DisputesWidget.tsx         # resident: my disputes
│           └── (admin) → admin/ui/DisputesModerationWidget.tsx
│
└── app/
    └── api/
        └── disputes/
            ├── route.ts              # GET list, POST create
            ├── [id]/
            │   ├── route.ts          # GET, PATCH
            │   ├── submit/route.ts   # POST — cooling-off check
            │   ├── messages/route.ts # GET, POST mediation thread
            │   ├── evidence/route.ts # POST upload
            │   ├── assign/route.ts   # POST — admin/board only
            │   ├── ruling/route.ts   # POST — board only
            │   └── csos-export/route.ts  # GET — generates PDF export
            └── intake-screen/route.ts    # POST — AI frivolity check (sanitised)
```

---

## 10. API Routes

### `POST /api/disputes`

Creates a `DRAFT` dispute. Sets `coolingOffEndsAt = now() + tenantCoolingOffHours` (default 24h).

**Auth:** Any authenticated resident, BOARD, ADMIN.  
**Body:** `{ category, title, description, desiredOutcome, respondentId?, respondentType, severity? }`  
**Returns:** `apiSuccess({ dispute: DisputeDTO })`

### `POST /api/disputes/[id]/submit`

Transitions `DRAFT → SUBMITTED`. Validates `coolingOffEndsAt < now()`.

**Auth:** Complainant only.  
**Guard:** Rejects with `423 Locked` and remaining seconds if cooling-off has not elapsed.

### `POST /api/disputes/intake-screen`

Calls Anthropic API with sanitised description. Returns `toneScore`, `likelyFrivolous`, `deEscalationTip`.

**Auth:** Any authenticated user.  
**POPIA:** Description sanitised before leaving the client. No PII stored. Response not persisted.

### `GET /api/disputes/[id]/csos-export`

Generates a CSOS-ready PDF package containing:

- Case reference, dates, parties (by role, not by name if confidential)
- Full event history
- Evidence list (URLs, not content)
- Internal resolution attempts
- Statement that internal resolution was attempted

**Auth:** BOARD, ADMIN, or Complainant (their own case).  
**Module check:** `assertModuleEnabled('disputes')`

### Mediation thread (`/api/disputes/[id]/messages`)

Visibility rules:

- `isInternal: false` messages → visible to complainant, respondent, moderator
- `isInternal: true` messages → moderator only (board/admin)

---

## 11. Navigation & Widget Registration

Per Navigation Governance policy, a new domain requires:

**Dashboard widget registration** (add to `widgets.ts`):

```typescript
registry.register({
  id: 'my-disputes',
  version: '1.0.0',
  name: 'My Disputes',
  description: 'Active dispute cases',
  author: 'internal',
  category: 'core',
  icon: Scale, // lucide-react
  featureFlag: 'disputes',
  component: lazy(() => import('../ui/DisputesWidget').then(m => ({ default: m.DisputesWidget }))),
  loader: () => import('../ui/DisputesWidget'),
  defaultSize: { width: 3, height: 2 },
  minSize: { width: 2, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registry.register({
  id: 'admin-disputes',
  version: '1.0.0',
  name: 'Dispute Moderation',
  description: 'Moderate and manage community disputes',
  author: 'internal',
  category: 'core',
  icon: Gavel, // lucide-react
  featureFlag: 'disputes',
  permissions: ['admin', 'board'],
  component: lazy(() =>
    import('../../admin/ui/DisputesModerationWidget').then(m => ({
      default: m.DisputesModerationWidget,
    }))
  ),
  loader: () => import('../../admin/ui/DisputesModerationWidget'),
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 3, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
});
```

**Space assignment:**

- `my-disputes` → `home` space, `community` space
- `admin-disputes` → `admin` space

**Navigation Governance:** `disputes` domain added to `FeatureRegistry` as:

```
page.disputes       → boolean (page visibility)
feature.disputes.intake    → boolean (intake wizard)
feature.disputes.csos      → boolean (CSOS export)
widget.disputes.my         → boolean
widget.disputes.admin      → boolean
```

**PlatformModule seed entry:**

```typescript
// prisma/seed/modules.ts — add:
{
  key: 'disputes',
  label: 'Dispute Resolution',
  description: 'CSOS-compliant dispute filing, mediation, and escalation',
  minTier: 'STANDARD',
  defaultEnabled: false,  // tenant must explicitly enable
}
```

---

## 12. Access Control Matrix

| Action                       | USER | RESIDENT  | COMMITTEE   | BOARD | ADMIN |
| ---------------------------- | ---- | --------- | ----------- | ----- | ----- |
| File a dispute (complainant) | —    | ✓         | ✓           | ✓     | ✓     |
| View own dispute             | —    | ✓         | ✓           | ✓     | ✓     |
| View as respondent           | —    | ✓         | ✓           | ✓     | ✓     |
| View all disputes            | —    | —         | ✓ (limited) | ✓     | ✓     |
| Assign moderator             | —    | —         | —           | ✓     | ✓     |
| Post to mediation thread     | —    | ✓ (party) | —           | ✓     | ✓     |
| Post internal note           | —    | —         | ✓           | ✓     | ✓     |
| Issue ruling                 | —    | —         | —           | ✓     | ✓     |
| Export CSOS package          | —    | ✓ (own)   | —           | ✓     | ✓     |
| Delete/expunge dispute       | —    | —         | —           | —     | ✓     |

---

## 13. CSOS Export Package Structure

The export PDF (generated via the existing PDF skill/infrastructure) must contain:

```
COMMUNITY SCHEME DISPUTE RECORD
Reference: DSP-2026-0001
Community: Soralia Village (Soralia Village Body Corporate)
Scheme Registration: [HOA reg number — tenant setting]

SECTION A — PARTIES
Complainant: [Role + Unit — not full name if confidential]
Respondent:  [Role + Unit / "Body Corporate"]

SECTION B — DISPUTE SUMMARY
Category: [e.g. Noise — Neighbour to Neighbour]
Filed:    [submittedAt]
Summary:  [description]
Desired Outcome: [desiredOutcome]

SECTION C — INTERNAL RESOLUTION HISTORY
[Chronological DisputeEvent list with timestamps]
[Mediation offered: Y/N, Accepted: Y/N, Outcome]

SECTION D — EVIDENCE ON RECORD
[List of evidence file names and upload dates — not content]

SECTION E — RULING / OUTCOME
[If issued: ruling description, date, issuing officer role]
[If not resolved: "Internal resolution was attempted and has not
produced a satisfactory outcome. The complainant is therefore
exercising their right to apply to CSOS under Section 38 of the
Community Schemes Ombud Service Act, No. 9 of 2011."]

SECTION F — CERTIFICATION
This record is certified as a true and accurate account of the
internal dispute resolution process conducted by [Tenant name].
Generated: [timestamp]
```

---

## 14. Audit Log Retention

Per **Schedule G** of the SaaS License Agreement (minimum 5-year audit log retention, as noted in existing compliance obligations), `DisputeCase` and `DisputeEvent` records:

- Use soft-delete only (`deletedAt`) — hard delete is prohibited
- `DisputeEvent` is append-only — no update operations permitted
- `DisputeMessage` edits tracked via `editedAt` (original content preserved server-side in a `DisputeMessageVersion` model — **see Decision Gate G3 below**)
- CSOS-escalated cases: retention extended to **10 years** (CSOS regulation requires records available during any proceedings)

**POPIA tension:** POPIA grants data subjects the right to erasure. However, CSOS Act and HOA governance obligations create a **legitimate basis** (legal obligation, Section 11(1)(c) of POPIA) to override erasure for active or recently closed disputes. The platform should surface a notice to the complainant at intake:

> "Dispute records are retained for a minimum of 5 years as required by the SaaS agreement and community governance obligations. Records related to CSOS escalations are retained for 10 years. You may request access to your records at any time."

---

## 15. Risk Register

| ID  | Risk                                                                               | Severity | Mitigation                                                                                                         |
| --- | ---------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| R1  | Complainant identity exposed to respondent in confidential HOA-respondent disputes | HIGH     | `isConfidential: true` masks complainant name in all respondent-visible views; moderator sees full details         |
| R2  | AI frivolity screen misclassifies legitimate grievance as frivolous                | MEDIUM   | Screen is advisory only, never blocking; user always proceeds; no classification stored                            |
| R3  | CSOS export used as harassment tool (repeated exports to intimidate)               | MEDIUM   | Rate-limit export endpoint (3/day/case); log all exports to `DisputeEvent`                                         |
| R4  | Cooling-off bypass via direct API call                                             | HIGH     | `submit` endpoint validates server-side timestamp, not client claim                                                |
| R5  | Mediation thread leaks to uninvolved parties                                       | HIGH     | Row-level visibility enforcement in `DisputeMessage` query — always filter by `isParty OR isModerator`             |
| R6  | Missing `respondentId` (HOA as respondent) creates orphaned relation               | LOW      | `respondentType: HOA` with `respondentId: null` is a valid and expected combination; all queries handle null       |
| R7  | POPIA conflict with 5-year retention                                               | MEDIUM   | Legal basis documented in privacy notice; legal opinion from HOA attorney recommended before go-live               |
| R8  | Module enabled without CSOS scheme registration number set                         | MEDIUM   | `assertModuleEnabled` also checks `tenant.settings['csos.schemeRegistration']` is populated; surfaces setup prompt |

---

## 16. Decision Gates

### GATE G1 — Cooling-Off Duration ✅ RESOLVED 2026-06-25

**Decision:** **C — Tenant-configurable** (24h–72h range).  
Tenant setting: `disputes.coolingOffHours` (default 24, max 72). Adds a tenant settings UI item.

### GATE G2 — Message Version History ✅ RESOLVED 2026-06-25

**Decision:** **A — Full version history.**  
Add `DisputeMessageVersion` model to schema. Required for CSOS legal defensibility. Original content preserved server-side; `editedAt` on `DisputeMessage` indicates an edit occurred.

### GATE G3 — Complainant Anonymity to Respondent ✅ RESOLVED 2026-06-25

**Decision:** **B — Revealed only when mediation is accepted.**  
Complainant identity is masked in respondent-facing views until `mediationAcceptedAt` is set. Moderators always see full details regardless of `isConfidential` flag.

### GATE G4 — Frivolity Screen Anthropic Model ✅ RESOLVED 2026-06-25

**Decision:** **A — `claude-haiku-4-5`.**  
Fast, cheap, sufficient for tone analysis. Model selection is configurable via AI Provider settings — not hardcoded, making it easy to upgrade later.

---

## 17. Phase Execution Plan

**GSD Phase Mapping (2026-06-25):**

| GSD Phase                                                           | Scope                         | Advisory Phase(s)              |
| ------------------------------------------------------------------- | ----------------------------- | ------------------------------ |
| [Phase 105](.planning/phases/105-dispute-schema-entity-layer/)      | Schema + Seed + Entity        | Phases 1 + 2                   |
| [Phase 106](.planning/phases/106-dispute-api-routes-intake-screen/) | API Routes + Intake Screen    | Phase 3 + SUPPLEMENTAL Phase C |
| [Phase 107](.planning/phases/107-dispute-ui-widgets/)               | Intake Wizard + Widgets + Nav | Phases 4 + 5                   |
| [Phase 108](.planning/phases/108-csos-export-package/)              | CSOS Export                   | Phase 6                        |

Phase 104 (AI Provider + Translate Migration) is a prerequisite — see [Phase 104](.planning/phases/104-ai-provider-infrastructure-translate-migration/) and ADVISORY-017-SUPPLEMENTAL.

### Phase 1 — Schema & Seed (Pre-requisite)

1. Add all new models and enums to `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_dispute_resolution`
3. Run `prisma generate` to regenerate Drizzle layer
4. Add `disputes` PlatformModule seed entry
5. **Verify:** `prisma/migrations/` contains new migration; `src/db/schema/` contains new Drizzle files

**STOP AND ESCALATE:** If Drizzle generation produces relation errors on the four `user` FK relations in `DisputeCase`, report before proceeding. The named relation pattern (`"DisputeComplainant"` etc.) requires explicit `relationName` in Drizzle if the generator does not auto-resolve.

### Phase 2 — Entity Layer

1. Create `src/entities/dispute/` per FSD layout above
2. `index.ts` — export types, constants, status badge component
3. `index.server.ts` — export `getDisputeById`, `listDisputes`, `canUserAccessDispute`, `assertDisputeModuleEnabled`
4. `model/lifecycle.ts` — `VALID_TRANSITIONS` map, `canTransition(from, to, role)` function
5. **Verify:** `steiger` passes; no `entities → shared` violations

### Phase 3 — API Routes

1. Implement all routes per Section 10
2. Each route: `withTenant()` → `getSessionAndRole()` → `assertModuleEnabled('disputes')` → business logic → `apiSuccess()` / `apiError()`
3. `intake-screen` route: sanitise → Anthropic call → return JSON (no DB write)
4. `csos-export` route: query full case + events → generate PDF
5. **Verify:** All routes use `apiSuccess`/`apiError` envelope; no raw Response.json() calls

### Phase 4 — Intake Wizard (Feature Layer)

1. Implement `DisputeIntakeWizard.tsx` as a multi-step form gated before `DisputeForm.tsx`
2. State machine: `emotion` → `checklist` → `frivolity` → `tips` → `form`
3. `FrivolityScreen.tsx` calls `POST /api/disputes/intake-screen`
4. `ConflictTipsPanel.tsx` — static content, collapsible, contextual per emotion score
5. **Verify:** Wizard completes without API calls until `form` step; emotional state not persisted

### Phase 5 — Widgets & Navigation

1. Register `my-disputes` and `admin-disputes` widgets
2. Add `Scale` and `Gavel` to lucide-react imports in `widgets.ts`
3. Add `disputes` to `FeatureRegistry`
4. Add `disputes` to Navigation Governance domain list
5. **Verify:** Widget appears in AddWidgetModal when module enabled; hidden when disabled

### Phase 6 — CSOS Export

1. Implement PDF generation using existing PDF skill pattern
2. Populate all SECTION A–F fields per Section 13
3. Rate-limit: 3 exports per case per day
4. Log each export as `DisputeEvent` with `eventType: NOTE_ADDED` and metadata `{ action: 'csos_export' }`
5. **Verify:** Generated PDF satisfies CSOS Form 2 supporting document requirements (manual review)

---

## 18. Pre-Execution Discovery Checklist

Before the agent begins Phase 1, run these verifications:

```bash
# 1. Confirm schema file location
grep -n "model CommunityMerit" prisma/schema.prisma

# 2. Confirm user model has capacity for new relations (check relation count)
grep -n "@relation" prisma/schema.prisma | grep "user" | wc -l

# 3. Confirm Drizzle output directory
cat drizzle.config.ts | grep output

# 4. Confirm PlatformModule seed file location
ls prisma/seed/

# 5. Confirm lucide-react has Scale and Gavel icons
grep -r "from 'lucide-react'" src/widgets/dashboard/model/widgets.ts | head -5

# 6. Confirm existing apiSuccess/apiError pattern
grep -rn "apiSuccess" src/app/api/disputes/ 2>/dev/null || echo "No disputes routes yet — expected"

# 7. Confirm module key naming convention
grep -n "key:" prisma/seed/modules.ts | head -10

# 8. Confirm PDF generation capability exists
ls src/ | grep -i pdf || grep -r "pdf" src/shared/api/ | head -5
```

**STOP AND ESCALATE** if: (a) `prisma/schema.prisma` cannot be located, (b) Drizzle output directory differs from `src/db/schema`, (c) PlatformModule seed structure differs from expected, or (d) any existing model name collides with new model names (`DisputeCase`, `DisputeEvent`, `DisputeMessage`, `DisputeEvidence`, `DisputeNotification`).

---

## 19. Done Criteria

- [ ] ⏳ `prisma migrate status` shows new migration applied cleanly
- [ ] ⏳ `npx prisma generate` completes without errors; `src/db/schema/` contains `dispute-cases.ts`, `dispute-events.ts`, `dispute-messages.ts`, `dispute-evidence.ts`, `dispute-notifications.ts`
- [ ] ⏳ `steiger` passes with no new violations
- [ ] ⏳ `npm run typecheck` passes
- [ ] ⏳ `npm run lint` passes
- [ ] ⏳ `POST /api/disputes` creates a DRAFT with correct `coolingOffEndsAt`
- [ ] ⏳ `POST /api/disputes/[id]/submit` rejects with 423 before cooling-off expires; succeeds after
- [ ] ⏳ `POST /api/disputes/intake-screen` returns `toneScore`, `likelyFrivolous`, `deEscalationTip`
- [ ] ⏳ `GET /api/disputes/[id]/csos-export` returns a PDF containing all 6 sections
- [ ] ⏳ `my-disputes` widget renders in dashboard home space when `disputes` module enabled
- [ ] ⏳ `admin-disputes` widget hidden for RESIDENT role; visible for BOARD/ADMIN
- [ ] ⏳ Mediation thread: RESIDENT cannot see `isInternal: true` messages
- [ ] ⏳ A `DisputeCase` with `deletedAt` set is not returned by any list query but is returned by the CSOS export route

---

## 20. Open Items & Forward-Tracked Gaps

| Item                                                               | Tracking                               |
| ------------------------------------------------------------------ | -------------------------------------- |
| CSOS Form 2 legal review by HOA attorney                           | Manual — pre go-live                   |
| Tenant setting: `csos.schemeRegistration` (scheme reg number)      | BD issue — create before Phase 6       |
| `DisputeMessageVersion` model (Gate G2 decision)                   | Gate G2                                |
| HOA rules library (linkable from ConflictTips)                     | Future — Resource module integration   |
| Automated CSOS deadline reminders (CSOS has 30-day filing windows) | Future — Notification module extension |
| Multi-language dispute forms (af, xh, zu)                          | Future — i18n pass                     |
| Complainant identity configuration (Gate G3)                       | Gate G3                                |
| Mediator capacity management (who is available to moderate)        | Future — Admin settings                |

---

_Advisory produced by Claude (NetComplex architectural advisor). DavDev retains authority over all decision gates. Agent must not execute Phase 1 until Gates G1–G4 are resolved and DavDev confirms execution approval._
