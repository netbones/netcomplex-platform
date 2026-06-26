# Phase 108: CSOS Export Package - Research

**Researched:** 2026-06-26
**Domain:** Legal PDF Generation / Server-Side Document Production
**Confidence:** MEDIUM

## Summary

Phase 108 upgrades the Phase 106 CSOS export route from returning structured JSON to producing a certified PDF document that satisfies Form 2 requirements under the Community Schemes Ombud Service Act. The existing route handler at `src/app/api/disputes/[id]/csos-export/route.ts` already implements data querying, access control, rate limiting (3/case/day via Upstash Redis), and audit logging (NOTE_ADDED DisputeEvent). This phase replaces the `apiSuccess(exportData)` JSON response with a binary PDF response using `pdf-lib`.

The CSOSExportButton (built in Phase 105, composed in Phase 107-04 at `DisputeDetailPage.tsx` and `DisputeActionsBar.tsx`) currently creates a JSON blob download — it must be updated to trigger a PDF file download. The 6-section Form 2 document structure is mandated by ADVISORY-017 Section 13 and must include: Parties, Dispute Summary, Internal Resolution History, Evidence on Record, Ruling/Outcome, and Certification.

No existing PDF generation pattern exists in the codebase (provider-billing.ts stores `pdfUrl` from payment gateway webhooks but does not generate PDFs). This is the first server-side PDF generation feature in the project.

**Primary recommendation:** Use `pdf-lib` (v1.17.1) — a pure JavaScript library with zero native dependencies — to construct the 6-section PDF programmatically in the existing route handler. Return a `NextResponse` with `Content-Type: application/pdf` instead of JSON. Extend the route to query `DisputeMessage` and `DisputeMessageVersion` models (not currently queried). Update CSOSExportButton to handle binary PDF download.

## Architectural Responsibility Map

| Capability                                              | Primary Tier       | Secondary Tier | Rationale                                                           |
| ------------------------------------------------------- | ------------------ | -------------- | ------------------------------------------------------------------- |
| PDF generation                                          | API / Backend      | —              | Server-side in Next.js route handler; no browser required           |
| Data querying (DisputeCase, events, evidence, messages) | API / Backend      | —              | Drizzle ORM queries within the route handler                        |
| Rate limiting (3/case/day)                              | API / Backend      | —              | Upstash Redis via existing `rateLimitByKey()` — already implemented |
| Audit logging (NOTE_ADDED event)                        | Database / Storage | —              | DisputeEvent insert — already implemented in existing route         |
| File download trigger                                   | Browser / Client   | —              | CSOSExportButton creates blob URL from binary response              |

## Standard Stack

### Core

| Library            | Version | Purpose                                      | Why Standard                                                                                                                                 |
| ------------------ | ------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pdf-lib`          | 1.17.1  | Create PDF documents programmatically        | Pure JS, zero native deps, works in any JS runtime including Vercel serverless. 7.6M weekly downloads. MIT license. [VERIFIED: npm registry] |
| `@pdf-lib/fontkit` | 1.1.1   | Font embedding for pdf-lib (Unicode support) | Required for embedding standard fonts (Helvetica, Times Roman). 924K weekly downloads. MIT license. [VERIFIED: npm registry]                 |

### Supporting

| Library       | Version    | Purpose                                                                                 | When to Use                                                  |
| ------------- | ---------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `drizzle-orm` | (existing) | Query DisputeCase, DisputeEvent, DisputeEvidence, DisputeMessage, DisputeMessageVersion | Already used in existing route — extend with message queries |

### Alternatives Considered

| Instead of | Could Use                 | Tradeoff                                                                                                                                                                                                               |
| ---------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pdf-lib`  | `@react-pdf/renderer`     | Known issues with Next.js 13/14 App Router route handlers (GitHub discussion #2402 — server-side rendering in route handlers not fully supported). Adds ~400KB to bundle. Not recommended for this use case. [ASSUMED] |
| `pdf-lib`  | `jspdf`                   | Primarily client-side; limited server-side support. Simpler API but less flexible for multi-page structured documents. [ASSUMED]                                                                                       |
| `pdf-lib`  | `puppeteer` / HTML-to-PDF | Cannot run on Vercel serverless (requires Chromium binary). Docker/self-hosted only. [CITED: pdf4.dev comparison article Mar 2026]                                                                                     |

**Installation:**

```bash
pnpm add pdf-lib @pdf-lib/fontkit
```

## Package Legitimacy Audit

| Package          | Registry | Age          | Downloads | Source Repo                | Verdict | Disposition |
| ---------------- | -------- | ------------ | --------- | -------------------------- | ------- | ----------- |
| pdf-lib          | npm      | 5 yrs (2021) | 7.7M/wk   | github.com/Hopding/pdf-lib | OK      | Approved    |
| @pdf-lib/fontkit | npm      | 6 yrs (2020) | 924K/wk   | github.com/Hopding/fontkit | OK      | Approved    |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│               CSOSExportButton (Client)               │
│  • Props: { disputeId, userId }                       │
│  • GET /api/disputes/:id/csos-export                  │
│  • Handles 429 (rate limited), PDF download           │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP GET
                       ▼
┌──────────────────────────────────────────────────────┐
│            Route Handler (Server)                      │
│  GET /api/disputes/[id]/csos-export                    │
│                                                        │
│  1. withTenant() → tenantId                            │
│  2. getSessionAndRole() → auth check                   │
│  3. Query DisputeCase (tenant-scoped, soft-deleted)    │
│  4. Access control: owner OR BOARD/ADMIN               │
│  5. rateLimitByKey("csos-export:{id}:{userId}")        │
│     → 429 if exhausted (3/day/case)                    │
│                                                        │
│  DATA QUERIES:                                         │
│  6. Query DisputeEvent (chronological)                  │
│  7. Query DisputeEvidence (non-deleted)                 │
│  8. Query DisputeMessage (non-deleted, non-internal)    │
│  9. Query DisputeMessageVersion (for edited messages)   │
│                                                        │
│  PDF GENERATION:                                       │
│  10. Build 6-section PDF via pdf-lib                    │
│  11. Section A: Parties                                 │
│  12. Section B: Dispute Summary                         │
│  13. Section C: Resolution History + Messages           │
│  14. Section D: Evidence on Record                      │
│  15. Section E: Ruling / Outcome                        │
│  16. Section F: Certification                           │
│                                                        │
│  17. Serialize PDF to Uint8Array bytes                  │
│  18. Insert NOTE_ADDED DisputeEvent (audit log)         │
│  19. Return NextResponse(pdfBytes, content-type: pdf)   │
└──────────────────────┬───────────────────────────────┘
                       │ binary PDF response
                       ▼
┌──────────────────────────────────────────────────────┐
│              Browser (CSOSExportButton)                │
│  • Create Blob from response.arrayBuffer()            │
│  • Create object URL                                   │
│  • Trigger <a> download: csos-export-{refNumber}.pdf   │
│  • Track export count client-side (max 3/day)          │
│  • Toast: success / error / rate-limited               │
└──────────────────────────────────────────────────────┘
```

### Entity Data → Section Mapping

| CSOS Section           | Data Source Models                                                                                                                                                                                     | Query Pattern                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Parties            | `DisputeCase` (complainantId, respondentId, respondentType, isConfidential, mediationAcceptedAt) + `users` (role, unit)                                                                                | Join dispute with users for role/unit. Honor Gate G3: mask complainant if `isConfidential && !mediationAcceptedAt`                              |
| B — Dispute Summary    | `DisputeCase` (referenceNumber, category, submittedAt, title, description, desiredOutcome)                                                                                                             | Direct fields from dispute row                                                                                                                  |
| C — Resolution History | `DisputeEvent` (eventType, fromStatus, toStatus, actorId, note, metadata, createdAt) + `DisputeMessage` (content, senderId, createdAt, editedAt) + `DisputeMessageVersion` (originalContent, editedAt) | Events ordered by createdAt ASC. Messages exclude `isInternal: true`. For edited messages, include `originalContent` from DisputeMessageVersion |
| D — Evidence           | `DisputeEvidence` (fileName, fileType, fileUrl, uploadedBy, createdAt)                                                                                                                                 | WHERE `deletedAt IS NULL`. List file names and upload dates only — NOT file content                                                             |
| E — Ruling/Outcome     | `DisputeCase` (rulingDescription, rulingIssuedAt, status) + CSOS eligibility check                                                                                                                     | If `rulingDescription` exists → ruling section. If unresolved → Section 38 statement                                                            |
| F — Certification      | Generated timestamp + authority role                                                                                                                                                                   | System-generated; no DB query needed                                                                                                            |

### Section 38 Eligibility Statement (Section E fallback)

When the dispute has no ruling (status is not `RESOLVED` and `rulingDescription` is null), the following statement must appear in Section E:

> "Internal resolution was attempted and has not produced a satisfactory outcome. The complainant is therefore exercising their right to apply to the Community Schemes Ombud Service under Section 38 of the Community Schemes Ombud Service Act, No. 9 of 2011."

This is drawn verbatim from ADVISORY-017 Section 13. [CITED: docs/advisories/ADVISORY-017.md#13]

### PDF Page Layout Pattern

```
┌─────────────────────────────────────────────────────┐
│  COMMUNITY SCHEME DISPUTE RECORD                      │
│  Reference: DSP-YYYY-NNNN                             │
│  Community: {tenant.name} ({tenant.legalName})        │
│  Scheme Registration: {tenant.settings.csos.regNo}    │
│                                                       │
│  SECTION A — PARTIES                                  │
│  Complainant: {role + unit OR "Complainant"}          │
│  Respondent:  {role + unit OR "Body Corporate"}       │
│                                                       │
│  SECTION B — DISPUTE SUMMARY                          │
│  Category: {categoryLabel}                            │
│  Filed:    {submittedAt ISO}                          │
│  Summary:  {description (multiline, word wrap)}       │
│  Desired Outcome: {desiredOutcome}                    │
│                                                       │
│  SECTION C — INTERNAL RESOLUTION HISTORY              │
│  {chronological events — one per line}                │
│  {mediation thread messages}                          │
│                                                       │
│  SECTION D — EVIDENCE ON RECORD                       │
│  {file name + upload date per line}                   │
│                                                       │
│  SECTION E — RULING / OUTCOME                         │
│  {ruling OR Section 38 statement}                     │
│                                                       │
│  SECTION F — CERTIFICATION                            │
│  "This record is certified..."                        │
│  Generated: {ISO timestamp}                           │
└─────────────────────────────────────────────────────┘
```

### Recommended File Structure

```
src/
├── app/api/disputes/[id]/csos-export/
│   ├── route.ts              # Modified: PDF response instead of JSON
│   └── build-csos-pdf.ts     # NEW: Pure function — data → Uint8Array PDF bytes
├── entities/dispute/
│   └── ui/
│       └── CSOSExportButton.tsx  # Modified: binary download instead of JSON
└── app/api/disputes/__tests__/
    └── csos-export.test.ts   # Updated: test PDF binary response
```

### Pattern 1: PDF Builder Module (Pure Function)

**What:** Extract PDF construction into a pure `buildCsosExportPdf()` function that takes structured data and returns `Promise<Uint8Array>`. This enables unit testing the PDF generation without HTTP request overhead.

**When to use:** Any server-side PDF generation. Separation of concerns: route handler handles auth/access/rate-limit; builder handles PDF layout.

**Example:**

```typescript
// src/app/api/disputes/[id]/csos-export/build-csos-pdf.ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { CsosExportData } from './types';

export async function buildCsosExportPdf(data: CsosExportData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage([595, 842]); // A4

  const { width } = page.getSize();
  const margin = 50;
  const lineHeight = 14;
  let y = page.getHeight() - 60;

  // Header
  page.drawText('COMMUNITY SCHEME DISPUTE RECORD', {
    x: margin,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight * 2;

  // Section A — Parties
  // ... (draw each section)
  // Use y position tracking; if y < bottom margin, add new page

  return pdfDoc.save();
}
```

### Pattern 2: Binary Response in Route Handler

**What:** The existing route handler uses `apiSuccess(exportData)` which returns JSON via `NextResponse.json()`. Replace with raw `NextResponse` for binary PDF output.

```typescript
// In route.ts, replace:
//   return apiSuccess(exportData);
// With:
const pdfBytes = await buildCsosExportPdf(exportData);

// Log audit event (existing code)
await db.insert(disputeEvents).values({
  /* ... */
});

return new NextResponse(pdfBytes, {
  status: 200,
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="csos-export-${dispute.referenceNumber}.pdf"`,
    'Content-Length': pdfBytes.length.toString(),
  },
});
```

### Pattern 3: Multi-Page Text Flow

**What:** For Section C (Resolution History) which may be long, implement a simple text flow: track `y` position, and when `y < bottomMargin`, call `pdfDoc.addPage()` and reset `y` to top of new page. Repeat the section header on continuation pages.

### Anti-Patterns to Avoid

- **Don't generate PDF on the client-side:** CSOS export must be server-generated for legal defensibility (audit trail, certification). Client-side generation would allow tampering. [CITED: ADVISORY-017 §14]
- **Don't use `window.print()`:** The existing CSOS export is an API route GET, not a page render. The route returns binary data, not HTML. `window.print()` is only appropriate when the document is rendered as a web page.
- **Don't embed file content in Section D:** ADVISORY-017 explicitly states "file names and upload dates (not content)." Including file content would massively inflate PDF size and expose PII.
- **Don't query DisputeMessage without DisputeMessageVersion:** GATE G2 required full version history for CSOS defensibility. Edited messages must show original content from `DisputeMessageVersion` in the export.

## Don't Hand-Roll

| Problem                         | Don't Build                        | Use Instead                                                  | Why                                                                                                                                                                          |
| ------------------------------- | ---------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF document generation         | Custom PDF writer, raw PostScript  | `pdf-lib` v1.17.1                                            | PDF spec is 1,300+ pages. Edge cases include: Unicode encoding, font subsetting, page sizing, metadata, cross-reader compatibility. pdf-lib handles all of this.             |
| Rate limiting                   | Custom DB-based rate limit counter | Existing `rateLimitByKey()` from `@api/server`               | Already implements sliding-window counting via Upstash Redis with graceful fallback. Adding a parallel DB-based counter adds complexity without benefit.                     |
| Text measurement for PDF layout | Manual character counting          | `font.widthOfTextAtSize()` / `font.heightAtSize()` (pdf-lib) | Proportional fonts have variable character widths. Accurate measurement required for multi-page text flow and word wrapping.                                                 |
| Font embedding for Unicode      | Custom font parsing                | `@pdf-lib/fontkit` + `StandardFonts.Helvetica`               | WinAnsi encoding only supports 218 Latin characters. For South African names/acronyms with diacritics, standard fonts suffice; custom fonts available via fontkit if needed. |
| Multipage text layout           | Manual page-breaking logic         | Simple `y` position tracker + `pdfDoc.addPage()`             | pdf-lib provides page management primitives. Build a straightforward `checkPageBreak(y, minY)` helper that adds a page when close to bottom margin.                          |

## Runtime State Inventory

> Phase 108 is not a rename/refactor/migration phase. This section is omitted per the research protocol.

## Common Pitfalls

### Pitfall 1: Setting `Content-Disposition` incorrectly prevents download

**What goes wrong:** Using `Content-Disposition: inline` opens PDF in browser tab instead of triggering download. Or omitting `Content-Disposition` altogether.
**Why it happens:** pdf-lib examples often omit download headers since they're designed for browser `iframe` rendering.
**How to avoid:** Always set `Content-Disposition: attachment; filename="csos-export-{refNumber}.pdf"`.
**Warning signs:** Browser opens PDF in new tab instead of downloading; file has random UUID name from URL.

### Pitfall 2: CSOSExportButton still parses response as JSON

**What goes wrong:** The existing button code does `const json = await res.json()` and creates a JSON blob. If the route starts returning PDF binary, `res.json()` will throw.
**Why it happens:** The button was built in Phase 105 when the route returned JSON. Phase 108 changes the response format.
**How to avoid:** Update CSOSExportButton to: `const blob = await res.blob()` → create object URL → trigger download. Handle 429/error statuses before calling `.blob()`.
**Warning signs:** `SyntaxError: Unexpected token '%'` in console when clicking export.

### Pitfall 3: Rate limiting bypassed when Redis is unavailable

**What goes wrong:** The existing `rateLimitByKey()` returns `null` (no limit) when Upstash Redis is not configured or unreachable. This means CSOS rate limiting would be silently bypassed in local dev or during Redis outages.
**Why it happens:** The rate limiter was designed with graceful degradation as a conscious choice — "fail open" for features where rate limiting is less critical than availability.
**How to avoid:** For CSOS exports specifically, consider adding a DB-based fallback counter (query `DisputeEvent` where `eventType = 'NOTE_ADDED'` and `metadata->>'action' = 'csos_export'` and `createdAt > today`) when Redis is unavailable. This is a decision gate — see Open Questions.
**Warning signs:** No Redis connection in dev environment; no 429 responses during testing; exports succeed beyond 3/day.

### Pitfall 4: Forgetting to query DisputeMessage and DisputeMessageVersion

**What goes wrong:** The existing route queries only `DisputeCase`, `DisputeEvent`, and `DisputeEvidence`. Section C of Form 2 requires mediation thread evidence, which lives in `DisputeMessage` and `DisputeMessageVersion`.
**Why it happens:** Phase 106 built the route before message version history (GATE G2 model) was implemented.
**How to avoid:** Add Drizzle queries for `disputeMessages` (WHERE `isInternal = false`, `deletedAt IS NULL`) and `disputeMessageVersions` (joined on messageId). Include version history for edited messages.
**Warning signs:** Section C only shows events but no mediation thread content; edited messages show only latest content without original.

### Pitfall 5: Truncating long text in PDF sections

**What goes wrong:** Dispute descriptions, mediation messages, and ruling text can exceed page height. Naively drawing long strings will overflow the page boundaries.
**Why it happens:** pdf-lib's `drawText()` does not auto-wrap or auto-paginate. It draws text at exact coordinates.
**How to avoid:** Implement word-wrap by splitting text at word boundaries using `font.widthOfTextAtSize()`, tracking available line width (`pageWidth - 2 * margin`). When near page bottom, call `pdfDoc.addPage()`.
**Warning signs:** Text runs off the right edge of page; text disappears below bottom margin; single message spans multiple pages without continuation markers.

## Code Examples

### PDF Creation with pdf-lib (Server-Side)

```typescript
// Source: pdf-lib npm registry documentation + Context7

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function buildCsosExportPdf(
  dispute: DisputeCaseData,
  events: DisputeEventData[],
  evidence: DisputeEvidenceData[],
  messages: DisputeMessageData[],
  tenant: { name: string; legalName?: string }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  pdfDoc.setTitle(`CSOS Export — ${dispute.referenceNumber}`);
  pdfDoc.setAuthor('NetComplex Dispute Resolution System');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setProducer('NetComplex Platform');

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  const contentWidth = width - 2 * margin;
  const fontSize = 11;
  const lineHeight = 16;
  let y = height - margin;

  // Helper: draw a section header
  function drawSectionHeader(title: string) {
    y -= lineHeight;
    page.drawText(title, { x: margin, y, size: 13, font: bold });
    y -= lineHeight;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }

  // Helper: simple word wrap
  function drawWrappedText(text: string, maxWidth: number, fontSize: number): void {
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && line) {
        page.drawText(line, { x: margin, y, size: fontSize, font });
        y -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, { x: margin, y, size: fontSize, font });
      y -= lineHeight;
    }
  }

  return pdfDoc.save();
}
```

### Binary PDF Response in Next.js Route Handler

```typescript
// Source: Next.js App Router documentation pattern

import { NextResponse } from 'next/server';
import { buildCsosExportPdf } from './build-csos-pdf';

// Inside GET handler, after data collection and audit logging:
const pdfBytes = await buildCsosExportPdf(exportData, events, evidence, messages, tenant);

// Log audit event (existing pattern from Phase 106)
await db.insert(disputeEvents).values({
  id: crypto.randomUUID(),
  tenantId,
  disputeId: id,
  actorId: authData.userId,
  eventType: 'NOTE_ADDED',
  metadata: { action: 'csos_export', exportedAt: new Date().toISOString() },
  createdAt: now(),
});

return new NextResponse(pdfBytes, {
  status: 200,
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="csos-export-${dispute.referenceNumber}.pdf"`,
    'Content-Length': pdfBytes.byteLength.toString(),
  },
});
```

### CSOSExportButton — Binary Download Update

```typescript
// Updated handleExport in CSOSExportButton.tsx
// Source: Web API Blob + URL.createObjectURL pattern [ASSUMED]

const handleExport = async () => {
  if (isDisabled) return;
  setExporting(true);
  const exportToast = toast.loading('Generating CSOS export...');

  try {
    const res = await fetch(`/api/disputes/${disputeId}/csos-export`);

    if (res.status === 429) {
      toast.dismiss(exportToast);
      toast.error('Export limit reached (3 per day). Try again tomorrow.');
      setExportCount(MAX_EXPORTS_PER_DAY);
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || 'Export failed');
    }

    // Binary PDF download (was: JSON blob)
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Extract filename from Content-Disposition or use fallback
    const disposition = res.headers.get('Content-Disposition');
    const filenameMatch = disposition?.match(/filename="?(.+?)"?$/);
    a.download = filenameMatch?.[1] ?? `csos-export-${disputeId}.pdf`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.dismiss(exportToast);
    setExportCount(prev => prev + 1);
    toast.success('CSOS export downloaded');
  } catch (err) {
    toast.dismiss(exportToast);
    toast.error(err instanceof Error ? err.message : 'Failed to export CSOS data');
  } finally {
    setExporting(false);
  }
};
```

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                                                                                  |
| --------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| V2 Authentication     | yes     | Better Auth session check via `getSessionAndRole()` already in route                                                              |
| V3 Session Management | yes     | Session validated server-side; no client-controlled auth                                                                          |
| V4 Access Control     | yes     | Owner OR BOARD/ADMIN check already in route. Complainant anonymity per Gate G3 (mask if `isConfidential && !mediationAcceptedAt`) |
| V5 Input Validation   | minimal | Route param `id` is a UUID string; no user-controlled content in PDF — all data from trusted DB                                   |
| V6 Cryptography       | no      | No cryptographic operations in PDF generation                                                                                     |
| V7 Logging            | yes     | NOTE_ADDED DisputeEvent with `{ action: 'csos_export' }` metadata already logged                                                  |

### Known Threat Patterns for Next.js PDF Generation

| Pattern                                                                       | STRIDE                 | Standard Mitigation                                                                                                                                                  |
| ----------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSOS export used as harassment (repeated exports to intimidate)               | Denial of Service      | Rate limit: 3/case/day via Upstash Redis `rateLimitByKey()`. Audit logged per export. [CITED: ADVISORY-017 §14 Risk R3]                                              |
| Confidential complainant identity leaked in PDF                               | Information Disclosure | Mask complainant name in Section A when `isConfidential && !mediationAcceptedAt`. Display "Complainant" or role-based identifier. [CITED: ADVISORY-017 §13, Gate G3] |
| PDF generation timeout on Vercel serverless (max 60s / 8s with `maxDuration`) | Denial of Service      | `maxDuration = 8` already set. pdf-lib is fast (~50ms for 5-page doc). If dispute has very large event/message history, consider pagination or truncation with note. |
| File inclusion in PDF (Section D only lists file names, not content)          | Information Disclosure | Section D draws from `DisputeEvidence.fileName` and `createdAt` only — never reads file content. No `fetch(fileUrl)` or `fs.readFile()`.                             |
| Deleted evidence appearing in export                                          | Tampering              | Evidence query includes `isNull(disputeEvidences.deletedAt)` — already implemented in route.                                                                         |
| Cross-tenant data leak                                                        | Information Disclosure | All queries include `eq(table.tenantId, tenantId)` from `withTenant()` — already implemented.                                                                        |

## Environment Availability

| Dependency                 | Required By                      | Available                              | Version            | Fallback                                           |
| -------------------------- | -------------------------------- | -------------------------------------- | ------------------ | -------------------------------------------------- |
| Node.js                    | pdf-lib runtime                  | ✓                                      | v22+               | —                                                  |
| pnpm                       | Package installation             | ✓                                      | (project standard) | —                                                  |
| Upstash Redis              | Rate limiting (`rateLimitByKey`) | ✓ (configured via `UPSTASH_REDIS_URL`) | —                  | DB-based fallback counter (see Open Questions Q1)  |
| Supabase PostgreSQL        | Dispute data queries             | ✓                                      | —                  | —                                                  |
| Standard Fonts (Helvetica) | pdf-lib PDF rendering            | ✓ (built into pdf-lib)                 | —                  | No external font files needed for basic Latin text |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:**

- Redis rate limiting: when unavailable, `rateLimitByKey()` returns `null` (no limit) — exports proceed without rate limiting. Consider DB-based fallback.

## State of the Art

| Old Approach                  | Current Approach                    | When Changed | Impact                                                                                         |
| ----------------------------- | ----------------------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| CSOS export returns JSON blob | CSOS export returns certified PDF   | Phase 108    | Legally defensible document; satisfies Form 2 requirements; binary response handling in button |
| No PDF generation in project  | pdf-lib programmatic PDF generation | Phase 108    | First server-side PDF feature; establishes pattern for future document generation              |

**Deprecated/outdated:**

- **JSON CSOS export:** The Phase 106 JSON export was always a stub. ADVISORY-017 requires a PDF. The JSON response is replaced entirely.
- **Client-side PDF generation (window.print approach):** Not applicable — the export is an API route, not a page render. The "zero-dependency PDF generator" pattern described in the May 2026 Dev.to article is for page-based documents, not API-driven exports.

## Assumptions Log

| #   | Claim                                                                                                              | Section                       | Risk if Wrong                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | @react-pdf/renderer has unresolved issues with Next.js App Router route handlers                                   | Standard Stack / Alternatives | Could use @react-pdf/renderer if it now works. However, pdf-lib is still the better choice for serverless (no React rendering overhead, smaller bundle). Risk: LOW.      |
| A2  | Standard fonts (Helvetica) suffice for CSOS export content (South African English, no non-Latin scripts)           | Standard Stack                | Would need @pdf-lib/fontkit with custom TTF if any dispute content uses non-Latin characters (isiZulu, isiXhosa diacritics). Risk: LOW — custom fonts are a trivial add. |
| A3  | Tenant name and `csos.schemeRegistration` setting are accessible in route handler                                  | PDF Page Layout               | Would need to add tenant settings query. Risk: LOW — tenant context is already available via `withTenant()`.                                                             |
| A4  | The existing `rateLimitByKey` from Phase 106 implements 3/case/day correctly via Upstash Redis                     | Rate Limiting                 | If Redis is down, rate limiting is silently bypassed. May need DB fallback for legal compliance. Risk: MEDIUM.                                                           |
| A5  | `next@14` App Router route handlers support binary response via `new NextResponse(Uint8Array)`                     | Binary Response Pattern       | If Next.js 14 has issues with binary response in route handlers, may need `Response` from Web API instead. Risk: LOW — NextResponse extends Response.                    |
| A6  | CSOSExportButton client-side rate limiting (local state counter) is sufficient alongside server-side rate limiting | CSOSExportButton              | Client-side counter resets on page refresh. Server-side is authoritative. The client counter is a UX convenience, not a security control. Risk: LOW.                     |

## Open Questions

1. **DB-based rate limiting fallback for CSOS exports**
   - What we know: The existing `rateLimitByKey()` uses Upstash Redis. When Redis is unavailable, it returns `null` (passes all requests). For CSOS exports, this means rate limiting could be silently bypassed in local dev or Redis outages.
   - What's unclear: Whether a DB-based fallback is required for legal defensibility, or if the Redis-only approach is acceptable. A DB fallback would query `DisputeEvent WHERE eventType = 'NOTE_ADDED' AND createdAt > today` to count today's exports.
   - Recommendation: **Implement DB fallback.** Query `DisputeEvent` for today's NOTE_ADDED events with `metadata->>'action' = 'csos_export'` when Redis is unavailable. This is consistent with the existing pattern of graceful degradation (the function already has a `return null` path — add DB counting to that path for CSOS specifically).

2. **Tenant `csos.schemeRegistration` setting**
   - What we know: ADVISORY-017 Section 16 Decision Gate G8 (Risk R8) and Section 20 mention tenant setting `csos.schemeRegistration` for the HOA's CSOS registration number. This must appear in the PDF header ("Scheme Registration:").
   - What's unclear: Whether this tenant setting has been created yet. The CONTEXT.md says "BD issue before go-live." [CITED: 108-CONTEXT.md Deferred Ideas]
   - Recommendation: **Query tenant settings for `csos.schemeRegistration` in the route handler.** If not set, show "Not registered" in the PDF header. Do not block export — the certification section is still valid without a scheme registration number.

3. **HOA logo/branding in PDF**
   - What we know: CONTEXT.md says branding is at the agent's discretion.
   - What's unclear: Whether the tenant has a logo uploaded, and whether to include it in the PDF header.
   - Recommendation: **Skip logo in Phase 108.** Legal documents benefit from minimal, clean formatting. Adding a logo requires querying tenant media, embedding images, and handling missing logos gracefully. This is scope creep for the CSOS export's legal sufficiency.

## Validation Architecture

### Test Framework

| Property           | Value                                                               |
| ------------------ | ------------------------------------------------------------------- |
| Framework          | vitest                                                              |
| Config file        | vitest.config.ts (project root)                                     |
| Quick run command  | `npx vitest run src/app/api/disputes/__tests__/csos-export.test.ts` |
| Full suite command | `npx vitest run`                                                    |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                                      | Test Type        | Automated Command                                                                     | File Exists?                          |
| ------- | ----------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| CSOS-01 | Route returns PDF binary with Content-Type: application/pdf                   | integration      | `npx vitest run src/app/api/disputes/__tests__/csos-export.test.ts -t "PDF"`          | ❌ Wave 0                             |
| CSOS-02 | PDF contains all 6 sections (A–F) per ADVISORY-017 §13                        | integration      | `npx vitest run src/app/api/disputes/__tests__/csos-export.test.ts -t "sections"`     | ❌ Wave 0                             |
| CSOS-03 | Section A masks complainant when `isConfidential && !mediationAcceptedAt`     | unit             | `npx vitest run src/app/api/disputes/__tests__/csos-export.test.ts -t "confidential"` | ❌ Wave 0 (needs PDF parsing in test) |
| CSOS-04 | Section E includes Section 38 statement when no ruling                        | integration      | `npx vitest run src/app/api/disputes/__tests__/csos-export.test.ts -t "section 38"`   | ❌ Wave 0                             |
| CSOS-05 | Rate limit: 429 when 3 exports/case/day exceeded                              | integration      | `npx vitest run src/app/api/disputes/__tests__/csos-export.test.ts -t "rate limit"`   | ✅ Exists (test 4)                    |
| CSOS-06 | Audit log: NOTE_ADDED DisputeEvent with `{ action: 'csos_export' }` metadata  | integration      | `npx vitest run src/app/api/disputes/__tests__/csos-export.test.ts -t "logs"`         | ✅ Exists (test 5)                    |
| CSOS-07 | CSOSExportButton downloads PDF file (not JSON)                                | unit (component) | `npx vitest run -- -t "CSOSExportButton"`                                             | ❌ Wave 0                             |
| CSOS-08 | PDF includes DisputeMessage history and DisputeMessageVersion originalContent | integration      | New test                                                                              | ❌ Wave 0                             |
| CSOS-09 | PDF respects soft-delete (excludes deletedAt IS NOT NULL records)             | integration      | `npx vitest run src/app/api/disputes/__tests__/csos-export.test.ts -t "deleted"`      | ❌ Wave 0                             |

### Sampling Rate

- **Per task commit:** `npx vitest run src/app/api/disputes/__tests__/csos-export.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual visual inspection of generated PDF (CSOS Form 2 compliance)

### Wave 0 Gaps

- [ ] `src/app/api/disputes/__tests__/csos-export.test.ts` — update for PDF binary response (currently tests JSON)
- [ ] `src/app/api/disputes/[id]/csos-export/build-csos-pdf.test.ts` — NEW: unit test pure PDF builder function
- [ ] `src/entities/dispute/ui/__tests__/CSOSExportButton.test.tsx` — NEW: test binary download behavior
- [ ] Framework install: `pnpm add -D pdf-parse` — for parsing PDF in tests to verify section content
- [ ] Framework install: `pnpm add pdf-lib @pdf-lib/fontkit` — production dependencies

## Sources

### Primary (HIGH confidence)

- [Context7: /hopding/pdf-lib] — API docs for PDFDocument, StandardFonts, drawText, addPage, serialize
- [npm registry: pdf-lib@1.17.1] — Verified package exists, 7.7M weekly downloads, MIT license
- [npm registry: @pdf-lib/fontkit@1.1.1] — Verified package exists, 924K weekly downloads
- `prisma/schema.prisma` (lines 2466–2661) — Dispute model definitions, enums, relations
- `src/db/schema/dispute-*.ts` — Drizzle ORM schema definitions (dispute-cases, dispute-events, dispute-evidences, dispute-messages, dispute-message-versions)
- `src/app/api/disputes/[id]/csos-export/route.ts` — Existing Phase 106 route handler (174 lines)
- `src/app/api/disputes/__tests__/csos-export.test.ts` — Existing tests (482 lines)
- `src/shared/api/rate-limit.ts` — Rate limiting implementation (Upstash Redis)
- `src/shared/api/api-response.ts` — Response helpers (apiSuccess, apiError, NextResponse patterns)
- `docs/advisories/ADVISORY-017.md` — CSOS legislative context, export structure, audit requirements
- `.planning/phases/108-csos-export-package/108-CONTEXT.md` — Phase decisions and constraints
- `src/entities/dispute/ui/CSOSExportButton.tsx` — Button component (props, download logic)
- `src/page-modules/disputes/ui/DisputeDetailPage.tsx` — Button composition (lines 142, 225)
- `src/entities/dispute/ui/DisputeActionsBar.tsx` — Button composition (line 200)

### Secondary (MEDIUM confidence)

- [WebSearch: Brave — "pdf-lib vs @react-pdf/renderer for generating PDFs server-side in Next.js on Vercel 2025"] — Comparison of PDF libraries for Next.js serverless
- [WebSearch: Brave — "Next.js App Router server-side PDF generation best practices 2026"] — Industry guidance, verified against multiple sources
- [WebSearch: pdf4.dev blog Mar 2026] — Managed API recommendation for Vercel; used as context for serverless constraints
- [GitHub: diegomura/react-pdf Discussion #2402] — Known issue: @react-pdf/renderer not working in Next.js App Router route handlers (noted but not relied upon for primary recommendation)

### Tertiary (LOW confidence)

- [WebSearch: Brave — "How I Built a Zero-Dependency PDF Generator in Next.js for a Legal SaaS" (dev.to May 2026)] — Interesting pattern but uses `window.print()` which is not applicable to API-driven export
- [Training data assumptions] — `next@14` Route Handler binary response patterns, `pdf-lib` API familiarity

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — pdf-lib verified via npm registry, Context7 docs, and GSD package-legitimacy check. Version confirmed.
- Architecture: HIGH — Existing route handler pattern is well-understood; data model is documented in both Prisma and Drizzle schemas.
- Pitfalls: MEDIUM — Pitfalls derived from pdf-lib API behavior (no native word wrap), known Next.js binary response patterns, and rate limiter behavior in the codebase. Some edge cases (very long dispute histories overflowing serverless timeouts) are estimated.
- Implementation patterns: HIGH — Code examples derived from pdf-lib official documentation (Context7/npm) and existing project codebase patterns.

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (30 days — stable stack, low churn in pdf-lib)

## Project Constraints (from AGENTS.md)

- **pnpm** package manager (not npm/yarn)
- **TypeScript strict mode** — no `any`
- **Next.js 14 App Router** — server components by default
- **FSD architecture** enforced via Steiger/ESLint
- **Drizzle ORM** for all database queries (via `src/lib/db.ts`)
- **No hardcoded sensitive information** — use environment variables
- **Pre-commit hooks** — linting, formatting, type checking
- **Prefer widgets over new pages** — CSOSExportButton is already embedded in existing pages
