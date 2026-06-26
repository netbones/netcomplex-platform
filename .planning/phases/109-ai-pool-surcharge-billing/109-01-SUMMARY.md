---
phase: 109-ai-pool-surcharge-billing
plan: 01
subsystem: billing
tags: [ai-pool, surcharge, pdf-lib, cron, invoice-pdf, billing-events, postgres, drizzle]

# Dependency graph
requires:
  - phase: 104-ai-pool
    provides: Tenant tier quota, overage policy (SURCHARGE/HARD_STOP/THROTTLE), getTierQuota()
  - phase: 46.1-platform-saas-billing-foundation
    provides: TenantInvoice model, BillingEvent model, recordBillingEvent(), tenant-billing infrastructure
  - phase: 108-csos-export-package
    provides: build-csos-pdf.ts pattern (shared pdf-utils extraction source)
provides:
  - Pure buildOverageInvoicePdf() function (OverageInvoiceData → Uint8Array PDF)
  - Shared pdf-utils module (A4 constants, PdfContext, stateful/pure helpers)
  - Cron rollover surcharge generation: AI_OVERAGE_CHARGED events + TenantInvoice records
  - ensureOverageInvoiceRecord() idempotent invoice helper
  - PDF download route: GET /api/admin/platform/billing/invoices/[id]/pdf
affects:
  - tenant-billing
  - ai-pool-cron
  - admin-billing-portal

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Shared PDF utilities module (@shared/api/pdf-utils) for multi-PDF-builder reuse'
    - 'Idempotent ensure-record pattern for AI overage invoices (check invoiceNumber before insert)'
    - 'Cron route dual-phase: settle usage → generate surcharges'
    - 'PDF download route dual-auth: platform admin OR tenant scoped'

key-files:
  created:
    - src/shared/api/pdf-utils.ts — Shared PDF primitives (A4, PdfContext, draw helpers)
    - src/shared/api/ai/build-overage-invoice-pdf.ts — Pure PDF generator for surcharge invoices
    - src/shared/api/__tests__/pdf-utils.test.ts — 7 unit tests for pdf-utils
    - src/shared/api/ai/__tests__/build-overage-invoice-pdf.test.ts — 7 unit tests for PDF generator
    - src/app/api/cron/__tests__/ai-pool-rollover.test.ts — 5 unit tests for cron route
    - src/app/api/admin/platform/billing/invoices/[id]/pdf/route.ts — PDF download route
  modified:
    - src/app/api/disputes/[id]/csos-export/build-csos-pdf.ts — Refactored to use shared pdf-utils
    - src/app/api/cron/ai-pool-rollover/route.ts — Enhanced with surcharge generation logic
    - src/shared/api/tenant-billing.ts — Added ensureOverageInvoiceRecord() + VAT calculation
    - src/shared/api/server/index.ts — Re-exported ensureOverageInvoiceRecord from barrel

key-decisions:
  - 'ZAR 0.38 per 1,000 tokens surcharge rate ($0.02 USD at ~19 ZAR/USD, agent discretion per CONTEXT.md)'
  - '15% VAT applied to overage cost (South Africa standard rate per Phase 46.1 billing foundation)'
  - 'subscriptionId made required (string, not nullable) in ensureOverageInvoiceRecord — schema NOT NULL constraint'
  - 'Subscription query filters ACTIVE/PENDING/TRIALING with inArray — prevents CANCELLED/EXPIRED matches'
  - 'PDF download route uses invoiceNumber as path parameter — predictable, no extra lookup needed'
  - 'No rate limiting on PDF download route (DoS risk accepted per threat model T-109-05)'

patterns-established:
  - 'Shared pdf-utils: createPdfContext() factory + stateful helpers (newPage, checkPageBreak, drawLine) for all PDF builders'
  - 'PDF builder pure function pattern: typed input interface → async function returning Uint8Array'
  - 'Cron surcharge: iterate SETTLED rows → check overage > 0 → load quota → filter SURCHARGE policy → create events + invoices'
  - 'Invoice PDF route: dual auth gate (platform admin OR tenant-scoped) → lookup by invoiceNumber → load usage/quota/tenant → generate'

requirements-completed:
  - BILL-SURCHARGE-01
  - BILL-SURCHARGE-02

# Metrics
duration: 33 min
completed: 2026-06-26
---

# Phase 109 Plan 01: AI Pool Surcharge Billing Summary

**End-to-end surcharge invoice pipeline: shared PDF module → pure PDF generator → cron integration (billing events + invoice records) → downloadable binary PDFs**

## Performance

- **Duration:** 33 min
- **Started:** 2026-06-26T17:01:36Z
- **Completed:** 2026-06-26T17:34:23Z
- **Tasks:** 4
- **Files modified:** 10

## Accomplishments

- Extracted shared `pdf-utils.ts` module from `build-csos-pdf.ts` (A4 constants, `PdfContext`, stateful/pure helpers) — reused by both CSOS and overage invoice builders
- Created `buildOverageInvoicePdf()` pure function with 7 unit tests covering valid input, content assertions (tenant name, billing month, cost, invoice number), zero-cost edge case, and large-value formatting
- Enhanced cron rollover to detect ENTERPRISE tenants with SURCHARGE overage > 0 tokens → creates `AI_OVERAGE_CHARGED` billing events + idempotent `TenantInvoice` records; skips HARD_STOP/THROTTLE tenants
- Created PDF download route at `GET /api/admin/platform/billing/invoices/[id]/pdf` with dual auth (platform admin or tenant-scoped), returns binary PDF with `Content-Disposition: attachment`

## Task Commits

Each task was committed atomically:

1. **Task 0: Extract shared pdf-utils from build-csos-pdf.ts** — `31883483` (refactor)
2. **Task 1: buildOverageInvoicePdf() — TDD RED** — `a6ebb7d7` (test)
3. **Task 1: buildOverageInvoicePdf() — TDD GREEN** — `5e49004e` (feat)
4. **Task 2: Wire cron rollover surcharge** — `cec03025` (feat)
5. **Task 3: PDF download route** — `8df4f4b4` (feat)

**Plan metadata:** to be committed via `gsd-tools query commit`

_Note: Task 1 followed TDD: RED (failing tests) → GREEN (implementation). No refactor commit was needed — the implementation was clean on first pass._

## Files Created/Modified

- `src/shared/api/pdf-utils.ts` — Shared PDF primitives (A4 constants, `PdfContext`, `createPdfContext`, `newPage`, `checkPageBreak`, `drawSectionHeader`, `drawLine`, `drawWrappedText`, `fmtDate`, `fmtDateOnly`)
- `src/shared/api/__tests__/pdf-utils.test.ts` — 7 tests: context creation, date formatting, drawing, page breaks
- `src/shared/api/ai/build-overage-invoice-pdf.ts` — Pure function: `OverageInvoiceData → Uint8Array` PDF with Header/Account/Usage/Charge/Footer sections
- `src/shared/api/ai/__tests__/build-overage-invoice-pdf.test.ts` — 7 tests: valid output, content assertions, zero-cost, large values
- `src/app/api/cron/ai-pool-rollover/route.ts` — Enhanced: settles usage → iterates overage tenants → creates `AI_OVERAGE_CHARGED` events + invoices
- `src/app/api/cron/__tests__/ai-pool-rollover.test.ts` — 5 tests: auth 401, no-op, SURCHARGE path, HARD_STOP skip, bad secret
- `src/shared/api/tenant-billing.ts` — Added `ensureOverageInvoiceRecord()` (idempotent, VAT-calculating invoice creation)
- `src/shared/api/server/index.ts` — Re-exported `ensureOverageInvoiceRecord`
- `src/app/api/disputes/[id]/csos-export/build-csos-pdf.ts` — Refactored to import shared pdf-utils (constants + helpers)
- `src/app/api/admin/platform/billing/invoices/[id]/pdf/route.ts` — PDF download route with dual auth

## Decisions Made

- **Surcharge rate:** ZAR 0.38 per 1,000 tokens ($0.02 USD at ~19 ZAR/USD). Agent discretion per CONTEXT.md — South Africa-based tenant using ZAR billing.
- **VAT:** 15% applied (South Africa standard rate, already established in Phase 46.1 billing foundation).
- **subscriptionId type:** Tightened from `string | null` to `string` in `ensureOverageInvoiceRecord` — the `tenantInvoices.subscriptionId` column is NOT NULL, so the fallback `''` was a latent bug waiting to surface.
- **Subscription query:** Changed from brittle `ORDER BY status` (alphabetical coincidence) to explicit `inArray(['ACTIVE', 'PENDING', 'TRIALING'])` filter.
- **PDF route ID semantics:** The `[id]` parameter is the invoice number (e.g., `INV-AI-2026-05-abc12345`), matching the `pdfUrl` set at cron time. This makes URLs predictable without a separate invoice ID lookup.
- **No rate limiting on download route:** DoS risk accepted per threat model T-109-05 — PDF generation is fast (~100ms), route is auth-gated, and invoices are generated at cron time, not per-request.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed nullable subscriptionId in ensureOverageInvoiceRecord**

- **Found during:** Task 2 (cron rollover implementation)
- **Issue:** `ensureOverageInvoiceRecord` accepted `subscriptionId: string | null` with `?? ''` fallback. The `tenantInvoices.subscriptionId` column is NOT NULL — passing an empty string would create a semantic foreign key violation.
- **Fix:** Changed parameter type to `subscriptionId: string` (required). The cron route always resolves a subscription before calling this function.
- **Files modified:** `src/shared/api/tenant-billing.ts`
- **Committed in:** `cec03025` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed subscription query to filter valid statuses**

- **Found during:** Task 2 (cron rollover code review)
- **Issue:** Subscription query used `orderBy(tenantSubscriptions.status)` with no status filter — could return CANCELLED or EXPIRED subscriptions that happened to sort before ACTIVE alphabetically. CANCELLED (C) < ACTIVE (A) is false, so this was unlikely but semantically incorrect.
- **Fix:** Added `inArray(tenantSubscriptions.status, ['ACTIVE', 'PENDING', 'TRIALING'])` to explicitly filter for billable subscription states.
- **Files modified:** `src/app/api/cron/ai-pool-rollover/route.ts`
- **Committed in:** `cec03025` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

None — implementation proceeded smoothly. The shared pdf-utils extraction was clean. The cron route + ensureOverageInvoiceRecord integration matched the plan's design. No database migrations were needed — all tables reused from Phase 46.1 and Phase 104.

## User Setup Required

None — no external service configuration required.

## Threat Flags

| Flag                             | File                                                            | Description                                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| threat_flag: auth-bypass-surface | `src/app/api/admin/platform/billing/invoices/[id]/pdf/route.ts` | Dual auth path (platform admin OR tenant scoped) — tenant-scoped fallback must correctly verify invoice.tenantId matches withTenant() result |
| threat_flag: cron-secret-reuse   | `src/app/api/cron/ai-pool-rollover/route.ts`                    | CRON_SECRET header validation — compromise allows unauthorized billing event creation (mitigated per T-109-01)                               |

## Verification Results

All 27 tests pass across 4 test suites:

| Test Suite                          | Tests | Status |
| ----------------------------------- | ----- | ------ |
| `pdf-utils.test.ts`                 | 7     | PASS   |
| `build-overage-invoice-pdf.test.ts` | 7     | PASS   |
| `ai-pool-rollover.test.ts`          | 5     | PASS   |
| `build-csos-pdf.test.ts`            | 8     | PASS   |

Grep gates:

- `fontkit` not found in pdf-utils or build-overage-invoice-pdf ✅
- `AI_OVERAGE_CHARGED` appears 1 time in cron route ✅

## Self-Check: PASSED

- All 4 task commits verified in git log
- All 10 files confirmed created/modified
- 27/27 tests passing
- Grep gates passing
- No new dependencies required (pdf-lib v1.17.1, pdf-parse v2.4.5 already installed)

## Next Phase Readiness

- Phase 109 is complete (single plan). The AI pool surcharge billing pipeline is fully wired: cron → invoice records → downloadable PDFs.
- Ready for Phase 103 (Tenant Gallery & Album Sharing) — next queued phase per STATE.md.
- No blockers or concerns. All threat mitigations are in place (T-109-01 through T-109-06).

---

_Phase: 109-ai-pool-surcharge-billing_
_Completed: 2026-06-26_
