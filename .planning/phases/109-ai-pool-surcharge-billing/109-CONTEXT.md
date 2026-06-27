# Phase 109: AI Pool Surcharge Billing - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning
**Source:** BD soralia-village-fjyw

<domain>
## Phase Boundary

Wire the ENTERPRISE `SURCHARGE` overage policy (from Phase 104) into the billing pipeline (from Phase 46.1). When an ENTERPRISE tenant exceeds their monthly AI pool quota, generate a surcharge invoice as a PDF and push it into the existing billing infrastructure.

Depends on: Phase 104 (AI pool models, SURCHARGE policy, quota tracking), Phase 46.1 (billing foundation, invoices, tenant portal), Phase 108 (PDF generation pattern — build-csos-pdf.ts).
</domain>

<decisions>
## Implementation Decisions

### Surcharge Calculation

- Read `AiPoolUsage` from Phase 104 — total tokens consumed this month
- Compare against tier quota from Phase 104 seed data (ENTERPRISE = 500k/month)
- Calculate overage: `(tokens_used - quota) * cost_per_token`

### Invoice PDF Generation

- Reuse the `build-csos-pdf` pattern from Phase 108 (pdf-lib v1.17.1)
- Generate AI pool overage invoice PDF with: tenant name, billing period, quota, usage, overage, cost, line items
- Store PDF URL via the existing Phase 46.1 invoice infrastructure

### Monthly Cron

- Reuse the Phase 104 cron rollover pattern (monthly)
- At month-end rollover: calculate overage for each ENTERPRISE tenant, generate surcharge invoice, reset usage counter

### Billing Integration

- Create invoice record in the Phase 46.1 billing tables
- Surface in tenant billing portal
- Trigger email notification for new surcharge invoice

### PDF Pattern

- Follow `build-csos-pdf.ts` architecture: pure function `buildOverageInvoicePdf(tenant, usage, billing) → Uint8Array`
- Content-Disposition + binary response from route
- Reuse pdf-lib StandardFonts.Helvetica (no fontkit needed)

### Agent's Discretion

- Surcharge cost-per-token rate (default: $0.02 per 1k tokens)
- Invoice PDF layout/styling
- Whether to create a dedicated API route or integrate into the existing billing route
  </decisions>

<canonical_refs>

## Canonical References

- `docs/advisories/ADVISORY-017-SUPPLEMENTAL-2.md` — AI pool design
- `src/app/api/disputes/[id]/csos-export/build-csos-pdf.ts` — PDF generation pattern (Phase 108)
- `src/shared/api/provider-billing.ts` — billing patterns
- `.planning/phases/104-ai-provider-infrastructure-translate-migration/` — AI pool models, quotas, overage policies
- `.planning/phases/46.1-platform-saas-billing-foundation/` — billing tables, invoice records, tenant portal
  </canonical_refs>

<deferred>
## Deferred Ideas

- Non-ENTERPRISE overage billing (THROTTLE = allow but log, HARD_STOP = block)
- Real-time overage alerts (future Notification module)
- Custom surcharge rates per tenant
- Multi-currency support
  </deferred>

---

_Phase: 109-ai-pool-surcharge-billing_
_Context gathered: 2026-06-26 from BD soralia-village-fjyw_
