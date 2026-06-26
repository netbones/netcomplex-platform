---
phase: 108-csos-export-package
plan: 01
subsystem: api
tags: [pdf-lib, csos, export, pdf, rate-limit, drizzle]

# Dependency graph
requires:
  - phase: 106-dispute-api-routes-intake-screen
    provides: 'Existing route handler (JSON), rate limiting, access control, audit logging'
provides:
  - 'CSOS Export PDF Builder (buildCsosExportPdf) — pure function data → Uint8Array'
  - 'Updated route handler returning binary PDF with Content-Type: application/pdf'
  - 'DisputeMessage and DisputeMessageVersion queries for Section C mediation thread'
  - 'DB-based rate limiting fallback when Redis unavailable'
  - 'Integration and unit tests for PDF export (16 tests total)'
affects: [108-02-csos-export-button]

# Tech tracking
tech-stack:
  added: [pdf-lib@1.17.1, @pdf-lib/fontkit@1.1.1, pdf-parse@2.4.5]
  patterns:
    - 'Server-side PDF generation with pdf-lib: pure function pattern (data → Uint8Array)'
    - 'Binary response in Next.js route handler: new NextResponse(pdfBytes, { headers: { Content-Type: application/pdf } })'
    - 'DB-based rate limit fallback: query disputeEvents for today''s csos_export count when Redis unavailable'

key-files:
  created:
    - src/app/api/disputes/[id]/csos-export/build-csos-pdf.ts
    - src/app/api/disputes/__tests__/build-csos-pdf.test.ts
  modified:
    - src/app/api/disputes/[id]/csos-export/route.ts
    - src/app/api/disputes/__tests__/csos-export.test.ts
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Used pdf-parse v2 API (PDFParse class) instead of v1 default export — v1 unavailable on npm"
  - "Replaced → with -> in status transitions (WinAnsi encoding limitation with StandardFonts)"
  - "DB rate limit fallback runs whenever rateLimitByKey returns null (covers both Redis-down and within-limit cases)"

patterns-established:
  - "PDF Builder Module: Pure function buildCsosExportPdf(data) → Uint8Array with drawSectionHeader, drawWrappedText, checkPageBreak helpers"
  - "Integration test mock: isCountQuery detection via columns parameter in db.select(), dbExportCount mock flag"

requirements-completed: [DISPUTE-08]

# Metrics
duration: 15 min
completed: 2026-06-26
---

# Phase 108 Plan 01: CSOS Export PDF Package Summary

**Upgraded CSOS export route from JSON to certified PDF with pdf-lib, including message/version queries, DB rate limit fallback, and binary response**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-26T15:53:29Z
- **Completed:** 2026-06-26T16:08:57Z
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files modified:** 6

## Accomplishments

- Created `buildCsosExportPdf()` — pure function generating 6-section CSOS Form 2 PDF with word wrap, multi-page support, and confidential masking
- Upgraded route handler to return binary PDF with `Content-Type: application/pdf` and `Content-Disposition: attachment` headers
- Added DisputeMessage and DisputeMessageVersion queries for Section C mediation thread evidence (Gate G2 compliance)
- Implemented DB-based rate limiting fallback that queries today's `csos_export` NOTE_ADDED events when Redis is unavailable
- Changed audit metadata from `{ exportType: 'CSOS' }` to `{ action: 'csos_export' }` for consistency with DB fallback query

## Task Commits

Each task was committed atomically (TDD RED/GREEN cycle):

1. **Task 1 (RED):** `test(108-01): add failing tests for CSOS PDF builder` — `0a216977`
2. **Task 1 (GREEN):** `feat(108-01): implement CSOS PDF builder with all 6 sections` — `52ca0fa7`
3. **Task 2 (RED):** `test(108-01): update integration tests for binary PDF response` — `bbcf4f01`
4. **Task 2 (GREEN):** `feat(108-01): upgrade route handler to binary PDF response with message queries and DB rate limit fallback` — `6f6da8e9`

## Files Created/Modified

- `package.json` — Added pdf-lib, @pdf-lib/fontkit (deps), pdf-parse (devDep)
- `pnpm-lock.yaml` — Updated lockfile
- `src/app/api/disputes/[id]/csos-export/build-csos-pdf.ts` — PDF builder: 333 lines, exports `buildCsosExportPdf()` and `CsosExportData` interface
- `src/app/api/disputes/__tests__/build-csos-pdf.test.ts` — Unit tests: 8 tests covering all sections, masking, Section 38, multi-page
- `src/app/api/disputes/[id]/csos-export/route.ts` — Updated route handler: binary PDF response, message/version queries, DB rate limit fallback
- `src/app/api/disputes/__tests__/csos-export.test.ts` — Updated integration tests: 8 tests verifying PDF headers, Content-Disposition, audit metadata, DB fallback

## Decisions Made

- Used pdf-parse v2 API (`PDFParse` class) — v1 default export is no longer available on npm. Adapted test helpers to instantiate `new PDFParse({ data: Buffer.from(pdfBytes) })` and call `getText()`.
- Replaced `→` with `->` in event status transitions — StandardFonts (Helvetica) only supports WinAnsi encoding (218 characters). The arrow `→` (U+2192) is not in WinAnsi; replaced with ASCII fallback.
- DB rate limit fallback always runs when `rateLimitByKey()` returns null — no way to distinguish "Redis unavailable" from "within limits" with current rate limiter API. Both cases trigger the DB count query (acceptable overhead for rare CSOS exports).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pdf-parse v2 API incompatibility with plan's expected import pattern**

- **Found during:** Task 1 (PDF builder tests)
- **Issue:** Plan assumed `import pdfParse from 'pdf-parse'` with default export. pdf-parse@2.4.5 uses ESM-only named export `PDFParse` class.
- **Fix:** Changed test helper to use `import { PDFParse } from 'pdf-parse'` and `new PDFParse({ data: Buffer.from(pdfBytes) })` with `getText()` method.
- **Files modified:** src/app/api/disputes/**tests**/build-csos-pdf.test.ts
- **Committed in:** `0a216977` (Task 1 RED commit)

**2. [Rule 1 - Bug] WinAnsi encoding error with `→` character**

- **Found during:** Task 1 (PDF builder implementation)
- **Issue:** StandardFonts.Helvetica only supports WinAnsi (218 characters). The arrow `→` (U+2192) caused `WinAnsi cannot encode "→"` error.
- **Fix:** Replaced `→` with ASCII `->` in event status transition display.
- **Files modified:** src/app/api/disputes/[id]/csos-export/build-csos-pdf.ts
- **Committed in:** `52ca0fa7` (Task 1 GREEN commit)

**3. [Rule 1 - Bug] Section 38 statement overflowed page with drawLine**

- **Found during:** Task 1 (PDF builder tests)
- **Issue:** The Section 38 statement (long text) was drawn with `drawLine()` which doesn't word wrap. Text overflowed page boundary and was truncated.
- **Fix:** Changed Section 38 statement from `drawLine()` to `drawWrappedText()` for proper multi-line rendering.
- **Files modified:** src/app/api/disputes/[id]/csos-export/build-csos-pdf.ts
- **Committed in:** `52ca0fa7` (Task 1 GREEN commit)

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All auto-fixes necessary for correct PDF generation. No scope creep. pdf-parse v2 API change is a library version evolution — no alternative v1 package available on npm.

## Issues Encountered

- pdf-parse v1 no longer published on npm; v2 API uses class-based `PDFParse` instead of simple `pdfParse(buffer)` function. Adapted tests accordingly.
- StandardFonts.Helvetica encoding is WinAnsi-only; no Unicode support. Per plan/research, this is sufficient for South African English content. If future disputes need non-Latin characters, @pdf-lib/fontkit with custom TTF fonts can be added.

## Next Phase Readiness

- Ready for Plan 108-02: Update CSOSExportButton to handle binary PDF download (blob → object URL → download)
- All server-side changes complete and tested: PDF generation, rate limiting (Redis + DB fallback), message/version queries, audit logging

---

_Phase: 108-csos-export-package_
_Plan: 01_
_Completed: 2026-06-26_
