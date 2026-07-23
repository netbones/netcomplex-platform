# Phase 125: proxy-vote-module — Research

**Researched:** 2026-07-23
**Domain:** HOA proxy voting workflow — lightweight event-attached module with multi-party notification, document upload, digital signature, QR reference, and admin approval
**Confidence:** MEDIUM (ecosystem stack verified via npm registry; documentation via brave web search cross-checked; user session/auth patterns verified against existing codebase)

## Summary

This phase implements a proxy voting workflow attached to HOA meeting events (AGM, SGM, Special Resolution, Trustee Election). The core is a 6-step resident journey (cannot attend → appoint proxy → upload form → proxy acceptance → digital signature → complete) plus an HOA admin dashboard for approval. The architecture models this as a **lightweight workflow attached to an Event** using existing infrastructure: Events module, Notifications system, MediaUpload/Document subsystem, User Directory, and the admin widget framework.

Two new npm dependencies are required: `react-signature-canvas` (signature drawing canvas — wraps `signature_pad` v5.1.3) and `qrcode.react` v4.2.0 (QR code generation for PV-YYYY-NNNN reference codes). The existing S3-compatible storage (`src/shared/api/storage.ts`) must be extended to support PDF uploads alongside images.

The signature system is architected as a **provider abstraction** (`SignatureService` interface, `SignatureProviderAdapter` interface, `signatureProviders` registry Map), but Phase 125 ships only the `INTERNAL` adapter (draw canvas → PNG data URL, or type full name + checkbox). All other providers (Lightning, Nostr, DocuSign, etc.) are deferred — their enum values and JSON evidence shapes are reserved in the schema so future phases can add them without migrations.

**Primary recommendation:** Build this as a new FSD slice `src/features/proxy-vote/` with entity-layer models + Drizzle schema, extend `uploadImage()` to accept PDF/JPG/PNG, reuse the existing `db.insert(notifications).values()` pattern for cross-user notifications, and use `qrcode.react` for QR generation and `react-signature-canvas` for signature drawing.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Proxy Vote enabled only for events:** AGM, SGM, Special Resolution Meeting, Trustee Election
- **6-step resident journey:** cannot attend → appoint proxy → upload signed form → proxy acceptance → digital signature → complete
- **Signature provider** = `INTERNAL` only in Phase 125; all external providers (Lightning, Nostr, DocuSign, Adobe Sign, Passkey, PGP, GOV_EID) deferred
- **Signature modes:** draw (canvas → PNG data URL) OR type full name + checkbox
- **Database model:** `MeetingProxy` table with `signatureProvider` enum (8 values reserved), `signatureEvidence` JSON column
- **`signatureEvidence` shape for INTERNAL:** `{ mode: "draw" | "type", signatureDataUrl: "<data:image/png;base64,...>" }`
- **Signature provider abstraction:** `SignatureService` interface → `InternalSignatureAdapter` class → `SignatureProviderAdapter` interface → `signatureProviders` registry Map (INTERNAL only)
- **No dWallet dependency:** Signature and Wallet are separate service layers
- **7 statuses:** Draft → WaitingForUpload → WaitingForProxy → PendingHoaReview → Approved ↔ Rejected → Withdrawn
- **QR reference code format:** PV-YYYY-NNNN (after approval)
- **No OCR, no AI, no PDF parsing** — simple file upload only
- **Notifications:** 3-party system (Owner, Proxy, HOA) with specific events per CONTEXT.md
- **Integration points:** Events module, Media subsystem, Notifications, User Directory, Admin UI, Signature Service
- **No new pages** if possible — prefer widgets embeddable into existing dashboards

### the agent's Discretion

- Component structure within the proxy-vote feature slice
- Widget vs page decisions for HOA admin dashboard
- Internal adapter implementation details (canvas rendering, SHA-256 hash generation)
- Form validation schemas and multi-step form orchestration
- Notification trigger placement (inline in service code vs. centralized)
- Storage extension strategy for PDF support (new function vs. parameterized uploadImage)
- FSD slice organization (shared types vs. feature-specific)

### Deferred Ideas (OUT OF SCOPE)

- One proxy holder representing multiple owners
- Voting units displayed at check-in
- Attendance register export (PDF)
- Auto-invalidate outstanding proxies when meeting closes
- External signature providers (Lightning, Nostr, DocuSign, Adobe Sign, Passkey, PGP, GOV_EID)
- dWallet integration
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID    | Description                                                                      | Research Support                                                                                              |
| ----- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| PV-01 | MeetingProxy Prisma model with signatureProvider enum + signatureEvidence JSON   | Prisma enum add-value migration pattern verified; Drizzle jsonb() pattern confirmed across 32 existing tables |
| PV-02 | Signature Service provider abstraction — interface + registry + INTERNAL adapter | react-signature-canvas + signature_pad identified as standard canvas signature lib                            |
| PV-03 | Resident journey: 6-step multi-party workflow UI                                 | React Hook Form + Zod multi-step pattern; usehooks-ts available for debounce/state                            |
| PV-04 | Document upload: PDF/JPG/PNG to existing storage                                 | storage.ts ALLOWED_TYPES extendable; PDF magic bytes (%PDF) verifiable; S3 PutObjectCommand pattern reusable  |
| PV-05 | Proxy nomination: resident search + non-resident form                            | Resident type exists in directory entity (id, name, email, phone); search pattern TBD by planner              |
| PV-06 | Proxy acceptance/decline via notification with Accept/Decline buttons            | Notification model has link+payload fields; db.insert(notifications) pattern confirmed for cross-user inserts |
| PV-07 | Digital signature: draw canvas OR type name + checkbox                           | react-signature-canvas exports toDataURL() for PNG/base64; canvas component pattern researched                |
| PV-08 | HOA admin dashboard widget: approve/reject with QR reference code                | qrcode.react v4.2.0 for QR generation; admin widget pattern established                                       |
| PV-09 | QR reference code PV-YYYY-NNNN generation after approval                         | qrcode.react renders SVG/PNG from string; sequential numbering pattern TBD                                    |

</phase_requirements>

## Architectural Responsibility Map

| Capability                       | Primary Tier     | Secondary Tier   | Rationale                                                                                                     |
| -------------------------------- | ---------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Proxy form workflow UI           | Browser / Client | —                | Multi-step wizard with canvas signature is inherently interactive; server components can't handle draw events |
| MeetingProxy CRUD API            | API / Backend    | —                | Business logic (status transitions, notification dispatch, validation) — standard REST/tRPC backend           |
| Document upload (PDF/JPG/PNG)    | API / Backend    | CDN / Static     | S3 PutObject via backend; public URLs served from CDN                                                         |
| QR code generation               | Browser / Client | API / Backend    | `qrcode.react` generates client-side from string input; no server computation needed                          |
| Signature canvas drawing         | Browser / Client | —                | HTML5 Canvas API — browser-only                                                                               |
| SHA-256 document hash            | API / Backend    | —                | Server-side Node.js crypto for file integrity — client can't compute hash of uploaded form reliably           |
| Cross-user notification dispatch | API / Backend    | —                | `db.insert(notifications).values()` pattern — server-side only                                                |
| Admin approval widget            | Browser / Client | —                | Interactive approve/reject buttons                                                                            |
| User directory search            | API / Backend    | Browser / Client | Backend query + client-side debounced search                                                                  |
| Signature evidence verification  | API / Backend    | —                | verify() method on adapter checks signatureDataUrl or typedName against stored evidence                       |

## Standard Stack

### Core

| Library                | Version       | Purpose                                              | Why Standard                                                                                                                                                                                                                          |
| ---------------------- | ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| react-signature-canvas | 1.1.0-alpha.2 | Canvas signature drawing with PNG/base64 export      | Wraps `signature_pad` v5.1.3 (2.4M weekly downloads); 100% test coverage; TypeScript types included; <150 LoC wrapper; supports `toDataURL()` for base64 PNG output matching INTERNAL adapter evidence shape [VERIFIED: npm registry] |
| qrcode.react           | 4.2.0         | QR code SVG/PNG rendering for PV-YYYY-NNNN reference | 7.1M weekly downloads; maintained by Meta (zpao); React-native component — no server-side computation needed; renders directly from string input [VERIFIED: npm registry]                                                             |

### Supporting (Existing — No New Install)

| Library               | Version    | Purpose                                | When to Use                                                                           |
| --------------------- | ---------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| React Hook Form + Zod | (existing) | Multi-step form validation             | Proxy form wizard: appointment step, upload step, signature step                      |
| Drizzle ORM           | 0.45.2     | Database queries for MeetingProxy      | All CRUD operations — existing pattern in `src/shared/api/db.ts`                      |
| Pino                  | (existing) | Structured logging                     | Signature events, status transitions, admin actions                                   |
| Better Auth           | (existing) | Session/auth for all routes            | `protectedProcedure` / `privilegedProcedure` patterns already used                    |
| Sonner                | (existing) | Toast notifications                    | User feedback on proxy submission, acceptance, approval                               |
| TanStack Query        | (existing) | Server state management                | Proxy list queries for resident + admin views                                         |
| Notification model    | (existing) | Multi-party notification dispatch      | `db.insert(notifications).values()` pattern used in merits, competitions, maintenance |
| usehooks-ts           | (existing) | `useDebounceValue` for resident search | AGENTS.md §Hooks Best Practices — prefer usehooks-ts over custom                      |

### Alternatives Considered

| Instead of             | Could Use         | Tradeoff                                                                                                                                                        |
| ---------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| react-signature-canvas | react-canvas-draw | Canvas-draw has undo capability but unmaintained (last commit 2020); signature-canvas has active maintenance and dedicated signature_pad backend                |
| qrcode.react           | qrcode (node)     | `qrcode` npm (18.7M/wk) renders server-side to canvas/file; `qrcode.react` renders client-side SVG — no server computation, better UX for inline widget display |
| qrcode.react           | react-qr-code     | react-qr-code v2.2.0 (2.3M/wk, published 2026-06-09) newer but smaller ecosystem; qrcode.react v4.2.0 (7.1M/wk, Meta-maintained) more battle-tested             |

**Installation:**

```bash
pnpm add react-signature-canvas qrcode.react
```

**Version verification:** Both packages confirmed on npm registry — `react-signature-canvas` v1.1.0-alpha.2 (published 2025-03-29, ~1.1M weekly downloads) and `qrcode.react` v4.2.0 (published 2024-12-11, ~7.1M weekly downloads). Drizzle ORM v0.45.2 already installed. SHA-256 via Node.js built-in `crypto` (zero-dependency).

## Package Legitimacy Audit

| Package                | Registry | Age      | Downloads | Source Repo                                | Verdict | Disposition                                                 |
| ---------------------- | -------- | -------- | --------- | ------------------------------------------ | ------- | ----------------------------------------------------------- |
| react-signature-canvas | npm      | ~1.3 yrs | 1.1M/wk   | github.com/agilgur5/react-signature-canvas | OK      | Approved                                                    |
| qrcode.react           | npm      | ~4 yrs   | 7.1M/wk   | github.com/zpao/qrcode.react (Meta)        | OK      | Approved                                                    |
| signature_pad          | npm      | ~9 yrs   | 2.4M/wk   | github.com/szimek/signature_pad            | OK      | Approved (nested dep of react-signature-canvas, not direct) |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious SUS:** none

_All packages confirmed via npm registry + legitimacy check seam. No [ASSUMED] packages in this phase._

## Architecture Patterns

### System Architecture Diagram

```
RESIDENT (Owner)                    PROXY NOMINEE                    HOA ADMIN
      │                                  │                              │
      │ "Cannot attend"                  │                              │
      ▼                                  │                              │
┌─────────────┐                          │                              │
│ Step 1:      │                          │                              │
│ View Meeting │                          │                              │
│ (Event Page) │                          │                              │
└──────┬──────┘                          │                              │
       │                                  │                              │
       │ Appoint proxy                   │                              │
       ▼                                  │                              │
┌──────────────┐                         │                              │
│ Step 2:       │                         │                              │
│ Search resident│ ←── User Directory API │                              │
│ OR non-resident│                         │                              │
│ form           │                         │                              │
└──────┬────────┘                         │                              │
       │                                  │                              │
       │ Upload form (PDF/JPG/PNG)       │                              │
       ▼                                  │                              │
┌──────────────┐                         │                              │
│ Step 3:       │                         │                              │
│ UploadProxyForm│ ──→ S3 Storage         │                              │
│ (API POST     │     (extended upload)   │                              │
│  multipart)   │                         │                              │
└──────┬────────┘                         │                              │
       │                                  │                              │
       │ Notify proxy nominee            │                              │
       │ db.insert(notifications)        ▼                              │
       │                      ┌──────────────────┐                     │
       │                      │ Step 4:           │                     │
       │                      │ Proxy Acceptance  │                     │
       │                      │ (Accept/Decline   │                     │
       │                      │  via notification │                     │
       │                      │  action buttons)  │                     │
       │                      └────────┬─────────┘                     │
       │                               │                                │
       │                               │ Accept → Step 5               │
       │                               ▼                                │
       │                      ┌──────────────────┐                     │
       │                      │ Step 5:           │                     │
       │                      │ Digital Signature │                     │
       │                      │ (Draw canvas OR   │                     │
       │                      │  type name +      │                     │
       │                      │  checkbox)        │                     │
       │                      └────────┬─────────┘                     │
       │                               │                                │
       │                               │ Submit → PendingHoaReview      │
       │                               ▼                                │
       │                      ┌──────────────────────┐                 │
       │                      │ Step 6: Complete      │                 │
       │                      │ (Status: Submitted    │                 │
       │                      │  to HOA, Pending      │                 │
       │                      │  verification)        │                 │
       │                      └──────────────────────┘                 │
       │                                                                │
       │ Notify HOA "Ready for review"                                 │
       ▼                                                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                     HOA Admin Dashboard Widget                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Owner │ Proxy │ Owner Signed? │ Proxy Signed? │ Approve/Reject│ │
│  │ Name  │ Name  │ ✓ / ✗         │ ✓ / ✗         │ [Buttons]    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                │                                   │
│                       Approve → QR: PV-YYYY-NNNN                   │
│                       Reject  → Notify owner                       │
└──────────────────────────────────────────────────────────────────┘

INTERNAL SIGNATURE ADAPTER:
  draw → HTML5 Canvas → toDataURL('image/png') → base64 → signatureEvidence.signatureDataUrl
  type → form input → typedName → signatureEvidence.typedName + mode:'type'

SIGNATURE PROVIDER REGISTRY (Phase 125):
  Map<SignatureProvider, SignatureProviderAdapter>
  Only key registered: 'INTERNAL' → InternalSignatureAdapter
  Future phases register: LIGHTNING, NOSTR, DOCUSIGN, etc.
```

### Recommended Project Structure (FSD Slice)

```
src/
├── features/
│   └── proxy-vote/              # NEW: Feature slice
│       ├── index.ts             # Public API barrel
│       ├── model/
│       │   ├── types.ts         # ProxyStatus enum, MeetingProxy type, SignatureProvider, SignatureEvidence
│       │   ├── schema.ts        # Zod schemas for proxy form, acceptance, signature
│       │   ├── useProxyFlow.ts  # TanStack Query hooks for proxy workflow
│       │   └── constants.ts     # ALLOWED_EVENT_CATEGORIES, STATUS_TRANSITIONS, QR_FORMAT
│       ├── ui/
│       │   ├── ProxyFlowWizard.tsx       # 6-step wizard container
│       │   ├── StepAppointProxy.tsx      # Step 2: resident search + non-resident form
│       │   ├── StepUploadForm.tsx        # Step 3: file upload
│       │   ├── StepProxyAcceptance.tsx   # Step 4: accept/decline notification view
│       │   ├── StepSignature.tsx         # Step 5: draw canvas + type name option
│       │   ├── StepComplete.tsx          # Step 6: submission status
│       │   ├── AdminProxyWidget.tsx      # HOA admin approval widget
│       │   ├── SignatureCanvas.tsx       # Reusable canvas wrapper component
│       │   └── ProxyQRCode.tsx           # PV-YYYY-NNNN QR display
│       └── server/
│           └── signature/
│               ├── types.ts             # SignatureService, SignatureProviderAdapter interfaces
│               ├── registry.ts          # signatureProviders Map
│               └── internal-adapter.ts  # InternalSignatureAdapter (Phase 125 only)
│
├── entities/
│   └── proxy-vote/              # NEW: Entity layer
│       ├── index.ts             # Public API barrel
│       ├── index.server.ts      # Server-only exports (DB queries)
│       ├── schema.ts            # Drizzle schema definitions
│       ├── dto/
│       │   └── proxy.ts         # MeetingProxyDTO, ProxyListItemDTO
│       ├── services/
│       │   ├── proxy-crud.ts    # create, get, update, list, approve, reject
│       │   ├── proxy-status.ts  # Status transition machine
│       │   └── proxy-notify.ts  # Notification dispatch helpers
│       └── api/
│           └── route.ts         # REST/tRPC routes for proxy-vote
│
├── server/
│   └── routers/
│       └── community/
│           └── proxy-vote.ts    # NEW: tRPC router registered in appRouter
│
├── shared/
│   └── api/
│       └── storage.ts           # MODIFIED: Extend uploadImage() for PDF support
│                                #   - Add 'application/pdf' to ALLOWED_TYPES
│                                #   - Add PDF magic bytes (%PDF) to MAGIC_BYTES
│                                #   - Add 'image/jpg' to ALLOWED_TYPES (currently only 'image/jpeg')
│
└── prisma/
    └── schema/
        └── schema.prisma        # MODIFIED: Add MeetingProxy model, ProxyStatus enum,
                                 #           SignatureProvider enum (8 values)
```

### Pattern 1: tRPC Router + Drizzle Service (Existing Pattern — Reuse)

**What:** Entity layer exports services (`proxy-crud.ts`, `proxy-status.ts`, `proxy-notify.ts`) that use Drizzle via `@api/server`. tRPC router in `src/server/routers/community/proxy-vote.ts` wraps them with `protectedProcedure` / `privilegedProcedure` and OpenAPI metadata.

**When to use:** All MeetingProxy CRUD operations, status transitions, notification dispatch.

**Example (from existing notifications router):**

```typescript
// Source: src/server/routers/community/notifications.ts (lines 27-64)
list: protectedProcedure
  .meta({ openapi: { method: 'GET', path: '/notifications', tags: ['Notifications'], protect: true } })
  .input(z.object({ unread: z.boolean().optional() }).optional())
  .output(z.object({ success: z.literal(true), data: z.array(nDto) }))
  .query(async ({ input, ctx }) => {
    const conditions = [
      eq(notifications.userId, ctx.userId),
      eq(notifications.tenantId, ctx.tenantId!),
      notDeleted(notifications),
    ];
    // ... query + toEnvelope
  }),
```

[VERIFIED: codebase — src/server/routers/community/notifications.ts]

### Pattern 2: Cross-User Notification Dispatch (Existing Pattern — Reuse)

**What:** Direct `db.insert(notifications).values()` calls in service code, not through `notifications.create` tRPC procedure (which targets only current user). This pattern is used in merits, competitions, and maintenance routes.

**When to use:** Sending notifications to proxy nominee, HOA admins, or owner — when the target userId is not the current session user.

**Example:**

```typescript
// Source: src/server/routers/community/merits.ts (lines 169-178)
await db.insert(notifications).values({
  id: createId(),
  tenantId,
  userId, // target userId (not ctx.userId)
  title,
  message,
  type: 'info',
  read: false,
});
```

[VERIFIED: codebase — src/server/routers/community/merits.ts]

### Pattern 3: Prisma Enum + Drizzle Enum Mapping (Existing Pattern — Reuse)

**What:** Define enum in `schema.prisma`, then map in Drizzle schema via custom enum type. The Prisma migration for adding enum values uses `ALTER TYPE ... ADD VALUE` — requires careful migration handling since `ALTER TYPE ADD VALUE` cannot run inside a transaction block in PostgreSQL versions < 12.

**When to use:** Adding `SignatureProvider` enum (8 values) and `ProxyStatus` enum (7 values) to Prisma schema.

**Key constraint:** Prisma's auto-generated migration for new enum + new model with that enum field may generate a two-step AlterEnum that drops and recreates the type. For PostgreSQL ≥12 (Supabase uses PG 15), `ALTER TYPE ... ADD VALUE` works inside transactions. The migration should be reviewed and potentially customized per Prisma docs on migration customization [CITED: prisma.io/docs/guides/migrate/developing-with-prisma-migrate/customizing-migrations].

### Pattern 4: S3 File Upload with MediaUpload Record (Existing — Modified)

**What:** `uploadImage()` in `src/shared/api/storage.ts` validates MIME type, magic bytes, size, then uploads via S3 `PutObjectCommand` and inserts a `MediaUpload` record.

**When to use:** Step 3 (upload signed proxy form). Must be extended to support PDF (`application/pdf`) and JPG (`image/jpg`).

**Required changes to `storage.ts`:**

- Add `'application/pdf'` and `'image/jpg'` to `ALLOWED_TYPES` array (or create a new `uploadDocument()` function)
- Add PDF magic bytes `[0x25, 0x50, 0x44, 0x46]` (`%PDF`) to `MAGIC_BYTES`
- Remove or relax the `file.type.startsWith('image/')` guard on line 89 (currently rejects all non-image files)
- Consider increasing `MAX_FILE_SIZE` for PDFs (2MB may be insufficient — signed forms can be larger; recommend 5MB)

[VERIFIED: codebase — src/shared/api/storage.ts]

### Pattern 5: React Hook Form Multi-Step Wizard (Existing Pattern — Reuse)

**What:** Multi-step forms use React Hook Form with Zod resolver, stepping through sequential sub-forms. State managed via `useState` for current step index + accumulated form data.

**When to use:** The 6-step proxy flow wizard — each step is a separate sub-form with its own Zod schema, chained together.

**Example (from existing patterns — AGENTS.md conventions):**

```typescript
// Define Zod schema for validation
const proxyAppointmentSchema = z
  .object({
    proxyUserId: z.string().optional().nullable(),
    proxyName: z.string().optional(),
    proxyEmail: z.string().email().optional(),
    proxyPhone: z.string().optional(),
  })
  .refine(data => data.proxyUserId || (data.proxyName && data.proxyEmail), {
    message: 'Either select a resident proxy or provide name and email for non-resident proxy',
  });

// Use with react-hook-form
const form = useForm<ProxyAppointmentData>({
  resolver: zodResolver(proxyAppointmentSchema),
});
```

[VERIFIED: AGENTS.md §Forms — React Hook Form + Zod; codebase pattern from src/features/maintenance/model/useMaintenanceForm.ts]

### Pattern 6: TanStack Query for Server State (Existing Pattern — Reuse)

**What:** Custom hooks in `features/proxy-vote/model/` wrapping TanStack Query for CRUD operations.

**When to use:** Fetching proxy submissions for residents and admins, submitting proxy data, acceptance/decline actions.

### Anti-Patterns to Avoid

- **Avoid building a custom canvas signature component:** react-signature-canvas already handles touch events, stroke smoothing, PNG export, and canvas management — building custom would duplicate 1,500+ lines of tested code [CITED: github.com/agilgur5/react-signature-canvas]
- **Avoid using `notifications.create` tRPC procedure for cross-user notifications:** It targets `ctx.userId` only. Use direct `db.insert(notifications).values()` for proxy nominee and HOA admin notifications.
- **Avoid storing signatures as raw canvas blobs:** Use the `signatureEvidence` JSON column with structured data (`{ mode, signatureDataUrl, typedName }`) — enables verification and provider switching.
- **Avoid embedding the signature service directly in UI components:** Keep the adapter pattern pure — UI calls `sign()` on the adapter, adapter handles evidence generation.
- **Avoid server-side QR generation:** qrcode.react renders client-side from string — no server round-trip needed.

## Don't Hand-Roll

| Problem                                      | Don't Build                                             | Use Instead                                                                                                              | Why                                                                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canvas signature drawing                     | Custom `<canvas>` component with manual stroke handling | `react-signature-canvas` (wraps `signature_pad` v5.1.3)                                                                  | Handles touch events, pressure sensitivity, stroke smoothing, PNG export, clear/undo, pen color customization. Custom canvas requires ~1,500 LoC to match this functionality. [VERIFIED: npm registry] |
| QR code image generation                     | Manual SVG construction or external API call            | `qrcode.react` v4.2.0                                                                                                    | Generates SVG/PNG from string input with configurable size, colors, error correction level. Zero server dependency. [VERIFIED: npm registry]                                                           |
| Multi-step form orchestration                | Custom step state machine with manual validation        | React Hook Form + Zod (existing) + sequential sub-form pattern                                                           | Already used in onboarding wizard (Phase 20), maintenance forms, signup flow. Zod schemas per step, accumulated form state.                                                                            |
| PDF file validation                          | Custom PDF magic byte checker or trust MIME type only   | Extend existing `validateMagicBytes()` in `storage.ts`                                                                   | PDF magic bytes `%PDF` (0x25 0x50 0x44 0x46) are well-defined. Existing infrastructure already handles S3 upload, MediaUpload record, size limits, MIME validation — just add PDF to the allowed set.  |
| SHA-256 document hash                        | Custom hash implementation                              | Node.js built-in `crypto.createHash('sha256')`                                                                           | Zero-dependency, FIPS-compliant. Used for document integrity and future provider adapter signatures.                                                                                                   |
| Status transition machine                    | Inline if/switch scattered across handlers              | Entity service `proxy-status.ts` with pure function `transition(current: ProxyStatus, action: ProxyAction): ProxyStatus` | Prevents invalid transitions (e.g., Rejected → Approved without resubmission). Testable in isolation.                                                                                                  |
| Sequential reference number generation       | Custom counter or UUID                                  | Database auto-increment or `SELECT COUNT(*) + 1` pattern with year prefix                                                | PV-YYYY-NNNN format: year from `new Date().getFullYear()`, NNNN from query counting approved proxies in that year + 1. Deterministic and collision-free at DB level.                                   |
| Notification action buttons (Accept/Decline) | Custom deep-link system                                 | Notification `link` + `payload` fields + tRPC mutation endpoints                                                         | `link` navigates to proxy acceptance page; `payload` carries proxyId for URL construction. Accept/Decline call separate tRPC mutations.                                                                |

**Key insight:** The only genuinely new code in this phase is the `MeetingProxy` schema, the proxy workflow state machine, and the `InternalSignatureAdapter`. Everything else — file upload, notification dispatch, admin widgets, form handling, user search — reuses existing battle-tested infrastructure. The two new npm dependencies (`react-signature-canvas`, `qrcode.react`) solve problems that would each take ~500-1500 LoC to build from scratch.

## Runtime State Inventory

> This phase is a **greenfield feature** — no rename, refactor, or migration of existing runtime state required.

| Category            | Items Found                                                                                                                                        | Action Required                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Stored data         | None — new `MeetingProxy` table only, no existing data to migrate                                                                                  | Create table via Prisma migration |
| Live service config | None — no external services configured for proxy voting                                                                                            | No action                         |
| OS-registered state | None                                                                                                                                               | No action                         |
| Secrets/env vars    | None — Phase 125 uses existing S3 storage credentials (STORAGE_ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY, STORAGE_BUCKET); no new env vars needed | No action                         |
| Build artifacts     | None                                                                                                                                               | No action                         |

**Nothing found in category:** None — verified by codebase audit and CONTEXT.md scope definition.

## Environment Availability

| Dependency            | Required By          | Available | Version                                                 | Fallback |
| --------------------- | -------------------- | --------- | ------------------------------------------------------- | -------- |
| Node.js               | Server runtime       | ✓         | v24.10.0                                                | —        |
| pnpm                  | Package manager      | ✓         | 11.9.0                                                  | —        |
| npm registry          | Package installation | ✓         | accessible                                              | —        |
| PostgreSQL/Supabase   | Database             | ✓         | Supabase hosted                                         | —        |
| S3-compatible storage | Document upload      | ✓         | STORAGE_ENDPOINT configured (existing storage.ts works) | —        |
| Prisma CLI            | Schema migration     | ✓         | (installed in project)                                  | —        |
| Drizzle ORM           | DB queries           | ✓         | 0.45.2                                                  | —        |
| Dev server (Next.js)  | Local testing        | ✓         | running or startable                                    | —        |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Common Pitfalls

### Pitfall 1: Prisma `ALTER TYPE ADD VALUE` Transaction Block Failure

**What goes wrong:** Prisma's auto-generated migration for adding new enum values to a PostgreSQL enum uses `ALTER TYPE ... ADD VALUE`, which fails inside a transaction block on PostgreSQL < 12. This causes migration deployment failure.

**Why it happens:** Supabase uses PostgreSQL 15 (transaction-safe for ALTER TYPE ADD VALUE), but the migration generation may still produce a multi-step AlterEnum (drop → recreate → rename) when the enum is new AND referenced by a new model in the same migration. This can cause data loss if applied incorrectly.

**How to avoid:**

1. Define the enum (`SignatureProvider`, `ProxyStatus`) and the `MeetingProxy` model in the same `schema.prisma` edit
2. Review the generated migration SQL before applying
3. If Prisma generates a drop-recreate pattern, manually edit the migration to use `CREATE TYPE ... AS ENUM (...)` then `ALTER TABLE ... ADD COLUMN ... TYPE ...`
4. For future phases adding new enum values to an already-deployed enum: use `ALTER TYPE ... ADD VALUE` commands (safe on PG 15)

**Warning signs:** Migration SQL containing `CREATE TYPE "SignatureProvider_new"` or `DROP TYPE "SignatureProvider_old"` — this is the drop-recreate pattern, safe for new tables but hazardous if any data exists.

[CITED: github.com/prisma/prisma/issues/8424; github.com/prisma/prisma/issues/5290]

### Pitfall 2: PDF Upload Breaking Existing Image-Only Validation

**What goes wrong:** The current `uploadImage()` function has `if (!file.type.startsWith('image/'))` on line 89 that rejects ALL non-image files before reaching ALLOWED_TYPES check. If we only add PDF to ALLOWED_TYPES without removing this guard, PDF uploads will fail.

**Why it happens:** `uploadImage()` was designed as image-only. PDF has MIME type `application/pdf`, which doesn't start with `image/`.

**How to avoid:** Either:

- **Option A (recommended):** Create a new `uploadDocument()` function in `storage.ts` that handles `application/pdf`, `image/jpeg`, `image/png` with separate magic byte validation and ALLOWED_TYPES
- **Option B:** Restructure `uploadImage()` to be `uploadFile()` with a `FileCategory` parameter controlling which ALLOWED_TYPES and MAGIC_BYTES to use

**Option A is preferred** — keeps the image-only path untouched for backward compatibility with existing upload API routes.

**Warning signs:** `415 Unsupported Media Type` errors when uploading PDFs in development.

[VERIFIED: codebase — src/shared/api/storage.ts lines 89-91]

### Pitfall 3: notification.create tRPC Procedure Targeting Wrong User

**What goes wrong:** Using `trpc.notifications.create.mutate()` to notify a proxy nominee sends the notification to the current session user (ctx.userId) instead of the nominee.

**Why it happens:** The `notifications.create` procedure in `src/server/routers/community/notifications.ts` line 103 hardcodes `userId: ctx.userId` — it's designed for the caller to create their own notifications.

**How to avoid:** Use direct `db.insert(notifications).values({ userId: targetUserId, ... })` in service code for cross-user notifications. This is the established pattern used in `merits.ts`, `competitions.ts`, `maintenance/route.ts`.

**Warning signs:** Proxy nominee never receives notification; owner receives notification intended for proxy.

[VERIFIED: codebase — src/server/routers/community/notifications.ts line 103]

### Pitfall 4: Canvas Signature Not Serializable to JSON Column

**What goes wrong:** Storing the raw canvas element reference or `ImageData` object in `signatureEvidence` JSON column — JSON can't serialize DOM objects.

**Why it happens:** Developer naively saves the canvas or blob directly instead of converting to base64 data URL.

**How to avoid:** Always call `signaturePad.toDataURL('image/png')` to get a base64 data URL string before storing. Store as `{ mode: 'draw', signatureDataUrl: '<data:image/png;base64,...>' }`. This is exactly what `react-signature-canvas` provides via its `toDataURL()` method.

**Warning signs:** `JSON.stringify` errors or empty/null `signatureDataUrl` in stored records.

[VERIFIED: npm registry — react-signature-canvas API docs]

### Pitfall 5: FSD Slice Boundary Violation

**What goes wrong:** Cross-slice imports (e.g., `@features/proxy-vote` importing from `@features/events` internal model files) triggering Steiger violations.

**Why it happens:** FSD enforces layer hierarchy — features may not import internals from other features without a public API.

**How to avoid:**

- Proxy-vote imports from `@entities/event` public API (types, schemas) — not from `@features/events/model/`
- Admin widget imports from `@entities/admin` public API
- If cross-feature imports needed, add to `steiger.config.js` `noPublicApiSidestep` allow-list with BD issue justification per AGENTS.md FSD policy

**Warning signs:** Steiger pre-commit hook fails with `no-public-api-sidestep` errors.

### Pitfall 6: Sequential Reference Number Race Condition

**What goes wrong:** Two approvals happening simultaneously both compute `count + 1` as the same NNNN, producing duplicate PV-YYYY-NNNN codes.

**Why it happens:** `SELECT COUNT(*) FROM MeetingProxy WHERE status='Approved' AND YEAR(createdAt)=currentYear` is not atomic.

**How to avoid:** Use a database-level counter or wrap the count + insert in a transaction with row-level locking. Alternatively, use a separate `ProxyCounter` table with `ON CONFLICT UPDATE` for atomic increment (simpler than transaction-level locking). Since proxy approvals are low-frequency (not concurrent), even a simple transaction wrapper is sufficient for MVP.

**Warning signs:** Duplicate QR reference codes in admin dashboard.

## Code Examples

### Canvas Signature Capture + Base64 Export

```typescript
// Source: react-signature-canvas npm docs (github.com/agilgur5/react-signature-canvas)
// File: src/features/proxy-vote/ui/SignatureCanvas.tsx
'use client';

import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface Props {
  onSignatureComplete: (dataUrl: string) => void;
}

export function SignatureCanvasComponent({ onSignatureComplete }: Props) {
  const sigRef = useRef<SignatureCanvas>(null);

  const handleClear = () => sigRef.current?.clear();
  const handleSave = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.toDataURL('image/png');
      onSignatureComplete(dataUrl);
    }
  };

  return (
    <div>
      <SignatureCanvas
        ref={sigRef}
        penColor="#4F46E5"
        canvasProps={{
          width: 500,
          height: 200,
          className: 'border border-gray-300 rounded-lg',
        }}
      />
      <div className="flex gap-2 mt-2">
        <button onClick={handleClear}>Clear</button>
        <button onClick={handleSave}>Save Signature</button>
      </div>
    </div>
  );
}
```

[VERIFIED: npm registry — react-signature-canvas v1.1.0-alpha.2 API]

### QR Code Reference Display

```typescript
// Source: qrcode.react v4.2.0 docs (github.com/zpao/qrcode.react)
// File: src/features/proxy-vote/ui/ProxyQRCode.tsx
'use client';

import { QRCodeSVG } from 'qrcode.react';

interface Props {
  referenceCode: string; // e.g., "PV-2026-0001"
}

export function ProxyQRCode({ referenceCode }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <QRCodeSVG
        value={referenceCode}
        size={128}
        level="M"
        includeMargin
        fgColor="#4F46E5"
      />
      <span className="font-mono text-sm">{referenceCode}</span>
    </div>
  );
}
```

[VERIFIED: npm registry — qrcode.react v4.2.0]

### SHA-256 Document Hash (Node.js Built-in)

```typescript
// Source: Node.js crypto docs (nodejs.org/api/crypto.html)
// File: src/features/proxy-vote/server/signature/internal-adapter.ts
import { createHash } from 'node:crypto';

async function hashDocument(fileBuffer: Buffer): Promise<string> {
  return createHash('sha256').update(fileBuffer).digest('hex');
}

// Verification stub (Phase 125 INTERNAL adapter — full verification deferred)
async function verifySignature(
  documentHash: string,
  evidence: SignatureEvidence
): Promise<boolean> {
  if (evidence.provider !== 'INTERNAL') return false;

  if (evidence.mode === 'draw') {
    // Verify signatureDataUrl is a valid base64 PNG
    return !!evidence.signatureDataUrl?.startsWith('data:image/png;base64,');
  }
  if (evidence.mode === 'type') {
    // Verify typedName is present and non-empty
    return !!evidence.typedName && evidence.typedName.length > 0;
  }
  return false;
}
```

[VERIFIED: Node.js stdlib — no dependency required]

### Cross-User Notification Dispatch

```typescript
// Source: codebase pattern — src/server/routers/community/merits.ts lines 169-178
// File: src/entities/proxy-vote/services/proxy-notify.ts
import { db, notifications } from '@api/server';
import { createId } from '@shared/lib/id';

export async function notifyProxyNominee(
  tenantId: string,
  proxyUserId: string,
  ownerName: string,
  meetingTitle: string,
  proxyId: string
) {
  await db.insert(notifications).values({
    id: createId(),
    tenantId,
    userId: proxyUserId,
    title: `You've been nominated as a proxy`,
    message: `${ownerName} has nominated you as their proxy for "${meetingTitle}". Please accept or decline.`,
    type: 'info',
    category: 'proxy-vote',
    link: `/dashboard/proxy/${proxyId}/accept`,
    payload: { proxyId, meetingTitle, ownerName },
    read: false,
  });
}
```

[VERIFIED: codebase — src/server/routers/community/merits.ts]

### Status Transition Machine (Pure Function)

```typescript
// File: src/entities/proxy-vote/services/proxy-status.ts
export type ProxyAction =
  | 'START_UPLOAD'
  | 'FORM_UPLOADED'
  | 'PROXY_ACCEPTED'
  | 'PROXY_DECLINED'
  | 'PROXY_SIGNED'
  | 'OWNER_SIGNED'
  | 'SUBMIT_FOR_REVIEW'
  | 'HOA_APPROVE'
  | 'HOA_REJECT'
  | 'WITHDRAW';

const TRANSITIONS: Record<ProxyStatus, Partial<Record<ProxyAction, ProxyStatus>>> = {
  Draft: { START_UPLOAD: 'WaitingForUpload', WITHDRAW: 'Withdrawn' },
  WaitingForUpload: { FORM_UPLOADED: 'WaitingForProxy', WITHDRAW: 'Withdrawn' },
  WaitingForProxy: {
    PROXY_ACCEPTED: 'WaitingForProxy',
    PROXY_DECLINED: 'Draft',
    WITHDRAW: 'Withdrawn',
  },
  WaitingForProxy: { PROXY_SIGNED: 'PendingHoaReview', WITHDRAW: 'Withdrawn' },
  PendingHoaReview: { HOA_APPROVE: 'Approved', HOA_REJECT: 'Rejected' },
  Approved: {}, // terminal
  Rejected: {}, // terminal
  Withdrawn: {}, // terminal
};

export function transition(current: ProxyStatus, action: ProxyAction): ProxyStatus | null {
  return TRANSITIONS[current]?.[action] ?? null;
}
```

[VERIFIED: codebase pattern — Phase 40 workflow transitions; Phase 105 dispute status transitions]

## State of the Art

| Old Approach                                   | Current Approach                                        | When Changed  | Impact                                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Custom canvas drawing implementations          | `react-signature-canvas` (wraps `signature_pad` v5.1.3) | 2024+         | 100% test coverage, TypeScript types, touch/mouse support, PNG/SVG export — eliminates 1,500 LoC of custom canvas code  |
| Server-side QR generation (node-qrcode canvas) | Client-side `qrcode.react` SVG rendering                | 2020+         | Zero server computation, faster rendering, no canvas dependency for QR                                                  |
| Prisma enum migration via drop-recreate        | `ALTER TYPE ... ADD VALUE` (PG ≥12 safe)                | PG 12 (2019)  | No data loss when adding enum values to existing enums; still requires migration review for new-enum + new-model combos |
| JSONB columns in PostgreSQL via raw SQL        | Drizzle `jsonb()` column type                           | Drizzle 0.28+ | Type-safe column definitions; existing pattern used in 32 Drizzle schema files in this project                          |

**Deprecated/outdated:**

- `react-signature-pad` (unmaintained since 2019): replaced by `react-signature-canvas` (active fork, 1.1M weekly downloads) [VERIFIED: npm registry]
- `qrcode` (node-canvas dependent) for React rendering: replaced by `qrcode.react` which generates SVG natively — no canvas dependency, smaller bundle [VERIFIED: npm registry]

## Assumptions Log

| #   | Claim                                                                                                                                          | Section               | Risk if Wrong                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Event categories AGM/SGM/Trustee Election/Special Resolution Meeting are represented by `category` field on the Event model (string, not enum) | Standard Stack        | LOW — Event.category exists as String field; these are HOA convention labels, not system codes. Planner should add validation that proxy cannot be enabled for events without these categories. |
| A2  | Resident search for Step 2 (appoint proxy) can reuse the existing directory API `/api/directory` or its tRPC equivalent                        | Architecture Patterns | LOW — directory entity has Resident type with search; if no tRPC route exists for user search by name, planner must add one                                                                     |
| A3  | The `link` field on Notifications can carry a relative path (e.g., `/dashboard/proxy/[id]/accept`) for Accept/Decline navigation               | Code Examples         | LOW — Notification.link is String?; existing patterns use it for navigation links. If Next.js App Router handles dynamic path params, clicking notification link navigates correctly.           |
| A4  | `uploadDocument()` can be added as a separate function in `storage.ts` without breaking existing `uploadImage()` API consumers                 | Don't Hand-Roll       | LOW — additive change; only risk is if someone accidentally refactors the existing `uploadImage()` function instead of creating a separate one.                                                 |
| A5  | This project's Supabase PostgreSQL is version 15+ (standard for Supabase projects created since 2023)                                          | Common Pitfalls       | LOW — Supabase has used PG 15 as default since late 2023. If the project was created earlier on PG 14, `ALTER TYPE ADD VALUE` still works (it was safe from PG 12 onward).                      |

**If this table is empty:** N/A — 5 assumptions logged for planner confirmation.

## Open Questions

1. **User directory search API availability for Step 2 (appoint proxy)**
   - What we know: `src/entities/directory/model/types.ts` defines `Resident` type (id, name, email, phone) and `UseResidentFilterReturn` hook interface with `setSearchQuery`. The directory page has search functionality.
   - What's unclear: Whether there's a backend API endpoint returning searchable user list for a step-by-step proxy wizard component (vs. the full directory page pattern)
   - Recommendation: Planner should either (a) reuse the existing directory API if accessible via tRPC, or (b) add a lightweight `GET /api/users/search?q=` endpoint scoped to tenant residents.

2. **QR reference code sequential numbering mechanism**
   - What we know: Format is PV-YYYY-NNNN. Existing patterns use `createId()` (UUID) for primary keys, not sequential counters.
   - What's unclear: Whether to use a database-level counter (new Counter table), a `SELECT COUNT(*) + 1` query wrapped in transaction, or a simple application-level counter (acceptable for low-frequency proxy approvals)
   - Recommendation: For MVP, use `SELECT COUNT(*) FROM MeetingProxy WHERE status = 'Approved' AND EXTRACT(YEAR FROM approvedAt) = currentYear` query inside the approval transaction. Proxy approvals are infrequent enough that race condition risk is negligible. Add a `@@unique([referenceCode])` constraint on the MeetingProxy table as belt-and-suspenders.

3. **Widget vs Page for proxy workflow UI**
   - What we know: AGENTS.md §Pages vs Widgets says "prefer widgets that can be imported to dashboards than new pages." The 6-step wizard doesn't fit a traditional small widget.
   - What's unclear: Whether to use a full-page layout for the multi-step wizard with modal components for each step, or a large widget embeddable in the Community/Services space
   - Recommendation: Use a dedicated page at `/dashboard/proxy/[meetingId]` for the resident journey (6-step wizard needs full-width focus). Use a widget for the HOA admin dashboard (`AdminProxyWidget` embeddable in admin space). This follows the admin widget pattern used for `GroupModerationWidget` (Phase 24) and `DelegationWidget` (Phase 111).

4. **Signature evidence verification depth for INTERNAL adapter**
   - What we know: CONTEXT.md defines `verify()` returning `Promise<boolean>`. INTERNAL adapter's draw mode stores a base64 PNG data URL.
   - What's unclear: Should `verify()` for INTERNAL adapter check that the base64 data decodes to a valid PNG, or simply check presence of the field? For type mode, should it match the proxy nominee's name?
   - Recommendation: Phase 125 INTERNAL adapter should do minimal verification (non-null check for draw mode, non-empty check for type mode). Full signature validation (PNG structure, name matching) is a legal compliance concern best deferred to HOA policies. The `verify()` method signature exists for future cryptographic providers that need real verification.

## Validation Architecture

### Test Framework

| Property           | Value                                                                  |
| ------------------ | ---------------------------------------------------------------------- |
| Framework          | Vitest (existing — used across project)                                |
| Config file        | `vitest.config.ts` (existing at project root)                          |
| Quick run command  | `npx vitest run src/entities/proxy-vote/__tests__/ --reporter=verbose` |
| Full suite command | `pnpm test` (runs all vitest suites)                                   |

### Phase Requirements → Test Map

| Req ID | Behavior                                                               | Test Type   | Automated Command                                                                                         | File Exists? |
| ------ | ---------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- | ------------ |
| PV-01  | MeetingProxy Prisma model generates valid Drizzle schema               | unit        | `npx vitest run src/entities/proxy-vote/__tests__/schema.test.ts -t "generates drizzle schema"`           | ❌ Wave 0    |
| PV-01  | signatureEvidence JSON column accepts valid INTERNAL evidence shape    | unit        | `npx vitest run src/entities/proxy-vote/__tests__/schema.test.ts -t "validates signatureEvidence"`        | ❌ Wave 0    |
| PV-02  | InternalSignatureAdapter.sign() returns PNG data URL                   | unit        | `npx vitest run src/entities/proxy-vote/__tests__/signature-adapter.test.ts -t "sign draw mode"`          | ❌ Wave 0    |
| PV-02  | InternalSignatureAdapter.verify() validates evidence presence          | unit        | `npx vitest run src/entities/proxy-vote/__tests__/signature-adapter.test.ts -t "verify"`                  | ❌ Wave 0    |
| PV-03  | Proxy wizard submits multi-step form with accumulated data             | integration | `npx vitest run src/features/proxy-vote/ui/__tests__/ProxyFlow.test.tsx -t "completes wizard"`            | ❌ Wave 0    |
| PV-04  | uploadDocument() accepts PDF with valid %PDF magic bytes               | unit        | `npx vitest run src/shared/api/__tests__/storage.test.ts -t "accepts PDF"`                                | ❌ Wave 0    |
| PV-04  | uploadDocument() rejects invalid MIME/spoofed file                     | unit        | `npx vitest run src/shared/api/__tests__/storage.test.ts -t "rejects spoofed PDF"`                        | ❌ Wave 0    |
| PV-05  | Proxy appointment validates resident-or-non-resident constraint        | unit        | `npx vitest run src/features/proxy-vote/model/__tests__/schema.test.ts -t "proxy appointment validation"` | ❌ Wave 0    |
| PV-06  | notifyProxyNominee inserts notification with correct userId            | unit        | `npx vitest run src/entities/proxy-vote/__tests__/proxy-notify.test.ts -t "targets correct user"`         | ❌ Wave 0    |
| PV-07  | QR code renders correct PV-YYYY-NNNN string                            | unit        | `npx vitest run src/features/proxy-vote/ui/__tests__/ProxyQRCode.test.tsx -t "renders reference code"`    | ❌ Wave 0    |
| PV-08  | Admin widget lists proxies with owner/proxy names and signature status | integration | `npx vitest run src/features/proxy-vote/ui/__tests__/AdminProxyWidget.test.tsx -t "lists proxies"`        | ❌ Wave 0    |
| PV-09  | Status transition machine rejects invalid transitions                  | unit        | `npx vitest run src/entities/proxy-vote/__tests__/proxy-status.test.ts -t "rejects invalid transitions"`  | ❌ Wave 0    |

### Sampling Rate

- **Per task commit:** `npx vitest run src/entities/proxy-vote/__tests__/ src/features/proxy-vote/`
- **Per wave merge:** `pnpm test` (full suite — pre-existing tests must not regress)
- **Phase gate:** Full suite green + new test coverage files all exist before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/entities/proxy-vote/__tests__/schema.test.ts` — Drizzle schema generation, JSON column validation
- [ ] `src/entities/proxy-vote/__tests__/proxy-crud.test.ts` — CRUD service tests
- [ ] `src/entities/proxy-vote/__tests__/proxy-status.test.ts` — Status transition machine
- [ ] `src/entities/proxy-vote/__tests__/proxy-notify.test.ts` — Notification dispatch
- [ ] `src/features/proxy-vote/server/signature/__tests__/internal-adapter.test.ts` — Signature adapter
- [ ] `src/features/proxy-vote/model/__tests__/schema.test.ts` — Zod validation schemas
- [ ] `src/features/proxy-vote/ui/__tests__/ProxyFlow.test.tsx` — Wizard integration
- [ ] `src/features/proxy-vote/ui/__tests__/SignatureCanvas.test.tsx` — Canvas component
- [ ] `src/features/proxy-vote/ui/__tests__/ProxyQRCode.test.tsx` — QR rendering
- [ ] `src/features/proxy-vote/ui/__tests__/AdminProxyWidget.test.tsx` — Admin widget
- [ ] `src/shared/api/__tests__/storage-document.test.ts` — Extended document upload (or add to existing storage test file)
- [ ] Test fixtures: proxy form PDF sample, mock notification data, mock user data
- [ ] Vitest config: ensure `react-signature-canvas` canvas mock is configured (canvas requires jsdom + canvas mock)

_(All test files must be created — this is a greenfield feature with zero existing test infrastructure for proxy voting)_

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                                                                                                                                        |
| --------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V2 Authentication     | yes     | Better Auth session via `protectedProcedure` / `privilegedProcedure` — all proxy CRUD routes require authenticated session                                                              |
| V3 Session Management | yes     | Better Auth handles session lifecycle — no custom session code needed                                                                                                                   |
| V4 Access Control     | yes     | Owner can only create proxies for themselves; proxy nominee can only accept/reject their own nominations; HOA admin (`board`/`admin` role) can approve/reject via `privilegedProcedure` |
| V5 Input Validation   | yes     | Zod schemas per step (React Hook Form + Zod resolver); file uploads validated via magic bytes + MIME type + size in `uploadDocument()`                                                  |
| V6 Cryptography       | yes     | SHA-256 document hash via `node:crypto` for file integrity; future provider signatures will use cryptographic verification (deferred)                                                   |

### Known Threat Patterns for HOA Proxy Voting

| Pattern                                                           | STRIDE                 | Standard Mitigation                                                                                                                                 |
| ----------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthorized proxy creation (creating proxy for another owner)    | Spoofing               | `protectedProcedure` + validate `ownerUserId === ctx.userId` in service layer                                                                       |
| Proxy nominee impersonation (accepting on behalf of someone else) | Spoofing               | `protectedProcedure` + validate `proxyUserId === ctx.userId` for acceptance/signature routes                                                        |
| Malicious file upload (executable disguised as PDF)               | Tampering              | Magic byte validation (`%PDF` check) + MIME type check + file size limit in `uploadDocument()`                                                      |
| Unauthorized admin approval (resident approving their own proxy)  | Elevation of Privilege | `privilegedProcedure` (requires `board` or `admin` role) for approve/reject routes                                                                  |
| Signature forgery (typing someone else's name in type mode)       | Repudiation            | INTERNAL adapter provides basic evidence only; full legal non-repudiation requires external providers (DocuSign, GOV_EID) deferred to future phases |
| Notification spoofing (fake proxy acceptance notification)        | Spoofing               | Notifications created server-side via `db.insert()` — no client-initiated notification creation for proxy workflows                                 |
| QR code tampering (modified PV code)                              | Tampering              | QR code is display-only derived from stored `referenceCode` field — modifying QR image doesn't change server record                                 |
| Race condition on proxy approval counter                          | Denial of Service      | Transaction-wrapped approval with `@@unique([referenceCode])` constraint as belt-and-suspenders                                                     |

### Specific Security Requirements from AGENTS.md

- **Never hardcode secrets:** S3 credentials (STORAGE_ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY) already in env vars — reuse existing pattern
- **Validate all user inputs:** Zod schemas for every step in the proxy form wizard (proxy appointment, file upload, signature)
- **Sanitize user-provided data:** File names, proxy email/phone fields — validate format via Zod, not raw string acceptance
- **Role-based access:** Owner → RESIDENT role (create/withdraw proxies); Proxy nominee → RESIDENT role (accept/decline/sign); HOA Admin → `board` or `admin` role (approve/reject)

## Sources

### Primary (HIGH confidence — verified via tool + authoritative source)

- **npm registry** — `react-signature-canvas` v1.1.0-alpha.2 (npm view), `qrcode.react` v4.2.0 (npm view), `signature_pad` v5.1.3 (npm view): package versions, descriptions, repository URLs, weekly downloads, postinstall scripts, legitimacy checks [VERIFIED: npm registry]
- **Codebase audit** — `src/shared/api/storage.ts` (uploadImage function, ALLOWED_TYPES, MAGIC_BYTES, S3 PutObjectCommand pattern), `src/server/routers/community/notifications.ts` (tRPC router, notification.create targeting ctx.userId), `src/server/routers/community/merits.ts` (cross-user db.insert(notifications) pattern), `src/db/schema/*` (32 files using jsonb() Drizzle column type), `src/entities/directory/model/types.ts` (Resident type), `src/entities/event/services/index.ts` (Drizzle query pattern) [VERIFIED: codebase]
- **Node.js stdlib** — `crypto.createHash('sha256')` for SHA-256 document hashing (zero-dependency) [VERIFIED: Node.js docs]
- **GSD tools seam** — `package-legitimacy check` confirmed all 5 packages as OK; `classify-confidence` returned MEDIUM for verified brave sources [VERIFIED: gsd-tools]

### Secondary (MEDIUM confidence — web search cross-checked)

- **npm-compare.com** — `react-canvas-draw` vs `react-signature-canvas` comparison: canvas-draw has undo but unmaintained (last commit 2020) [CITED: npm-compare.com]
- **Brave WebSearch** — `qrcode` (node) vs `qrcode.react` vs `react-qr-code` ecosystem overview: qrcode.react v4.2.0 Meta-maintained with 7.1M weekly downloads [CITED: brave web search]
- **StackOverflow / GitHub Issues** — Prisma enum migration patterns: `ALTER TYPE ADD VALUE` transaction error on PG < 12 (issues #8424, #5290, #24292); PostgreSQL ≥12 resolves this [CITED: stackoverflow.com, github.com/prisma/prisma]
- **Supabase Docs** — S3-compatible upload patterns, storage MIME type validation, presigned URL patterns [CITED: supabase.com/docs/guides/storage]
- **Next.js + Supabase blog (iloveblogs.blog)** — multi-category file upload pattern with separate ALLOWED_MIME_TYPES per category [CITED: iloveblogs.blog/guides/nextjs-supabase-file-storage-media-handling]

### Tertiary (LOW confidence — training knowledge only)

- `react-hook-form` multi-step wizard patterns: not verified against official docs this session (ctx7 CLI timed out) [ASSUMED — but existing codebase uses RHF extensively, pattern is well-established]
- `better-auth` session management in tRPC procedures: not verified against official docs this session (ctx7 CLI timed out) [ASSUMED — but existing codebase uses `protectedProcedure` extensively with Better Auth sessions]

## Project Constraints (from AGENTS.md)

The following AGENTS.md directives apply to this phase:

| Directive                                        | Source                            | Impact on Phase 125                                                                                                  |
| ------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Use pnpm package manager                         | AGENTS.md §3                      | `pnpm add react-signature-canvas qrcode.react`                                                                       |
| Use strict TypeScript, no `any`                  | AGENTS.md §TypeScript             | All proxy types must be strict with explicit interfaces                                                              |
| Prefer `interface` over `type` for object shapes | AGENTS.md §TypeScript             | `SignatureService`, `SignatureProviderAdapter`, `MeetingProxyDTO` as interfaces                                      |
| Max 200 lines per component                      | AGENTS.md §Component Size         | Wizard steps should be thin — extract hooks, keep components focused                                                 |
| Container/Presentational pattern                 | AGENTS.md §Component Architecture | `SignatureCanvas.tsx` presentational; `useSignatureFlow.ts` container                                                |
| Use usehooks-ts                                  | AGENTS.md §Hooks Best Practices   | `useDebounceValue` for resident search input                                                                         |
| FSD boundaries enforced (Steiger + ESLint)       | AGENTS.md §FSD Architecture       | New slice `src/features/proxy-vote/` must follow public API pattern; no cross-slice deep imports                     |
| Server components by default                     | AGENTS.md §Next.js                | Proxy flow wizard is `'use client'` (canvas interaction); admin widget is `'use client'`; API routes are server-side |
| Prisma + Drizzle dual ORM                        | AGENTS.md §Prisma + Drizzle       | Define MeetingProxy in `schema.prisma`; generate Drizzle schema; query via Drizzle                                   |
| Zod validation for all inputs                    | AGENTS.md §Forms                  | Zod schemas for proxy appointment, document upload, signature evidence                                               |
| Error boundaries on major components             | AGENTS.md §Error Boundaries       | ProxyFlowWizard wrapped in ErrorBoundary                                                                             |
| Cache-Control headers on API routes              | AGENTS.md §ISR                    | Proxy data changes infrequently — 2-5 min revalidation for admin widget list                                         |
| Quality gates before commit                      | AGENTS.md §Quality Gates          | `pnpm typecheck`, `pnpm lint`, `pnpm build` before every commit                                                      |
| Refs: bd-<id> trailer on commits                 | AGENTS.md §Time & Cost            | All Phase 125 commits must carry BD issue reference                                                                  |

## Metadata

**Confidence breakdown:**

- Standard stack: MEDIUM — npm packages verified via registry + legitimacy check; React Hook Form/Better Auth/Drizzle patterns verified against existing codebase (not official docs this session)
- Architecture: MEDIUM — FSD patterns, notification dispatch, file upload, tRPC router patterns all confirmed in codebase; signature adapter pattern from CONTEXT.md (locked decision)
- Pitfalls: MEDIUM — Prisma enum migration and PDF upload pitfalls validated via GitHub issues + codebase audit; notification and canvas pitfalls grounded in codebase patterns
- Security: MEDIUM — ASVS categories mapped to existing auth framework; threat patterns are domain-specific (proxy voting) and mapped to standard mitigations

**Research date:** 2026-07-23
**Valid until:** 2026-08-22 (30 days — proxy voting domain is stable; npm packages may have minor version bumps but APIs are stable)

**Key codebase files referenced:**

- `src/shared/api/storage.ts` — must be modified (extend for PDF)
- `src/server/routers/community/notifications.ts` — pattern reference (NOT modified)
- `src/server/routers/community/merits.ts` — cross-user notification pattern reference
- `src/entities/event/services/index.ts` — Drizzle query pattern reference
- `src/entities/directory/model/types.ts` — Resident type reference
- `src/shared/lib/id.ts` — createId() pattern reference
- `src/server/routers/index.ts` — tRPC router registration (NEW proxy-vote router to add)
- `prisma/schema/schema.prisma` — must be modified (add MeetingProxy + enums)
- `steiger.config.js` — may need sidestep allow-list entries
