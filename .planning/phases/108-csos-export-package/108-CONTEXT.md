# Phase 108: CSOS Export Package - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning
**Source:** ADVISORY-017.md Phase 6

<domain>
## Phase Boundary

Implement the CSOS (Community Schemes Ombud Service) export package — a certified PDF document that satisfies Form 2 requirements under the Community Schemes Ombud Service Act, No. 9 of 2011. This is the final gate before legal escalation. The export must produce a court-ready document with all 6 required sections, rate-limiting, and audit logging.

Depends on: Phase 106 (Dispute API Routes — the csos-export route is defined there).
</domain>

<decisions>
## Implementation Decisions

### CSOS Export PDF (§13)

6 mandatory sections:

- **Section A — Parties:** Complainant + Respondent (by role, not full name if confidential)
- **Section B — Dispute Summary:** Category, filed date, description, desired outcome
- **Section C — Internal Resolution History:** Chronological DisputeEvent list, mediation offered/accepted/outcome
- **Section D — Evidence on Record:** File names and upload dates (not content)
- **Section E — Ruling / Outcome:** If ruled: description, date, issuing officer. If unresolved: CSOS eligibility statement citing Section 38 of the Act.
- **Section F — Certification:** "This record is certified as a true and accurate account of the internal dispute resolution process conducted by [Tenant name]." Generated timestamp.

### Rate Limiting

- 3 exports per case per day
- Each export logged as DisputeEvent (NOTE_ADDED, metadata: { action: 'csos_export' })
- Purpose: prevent harassment via repeated exports

### Audit Trail

- DisputeEvent is append-only — full history in export
- DisputeMessageVersion preserves original content for edited messages
- All CSOS exports permanently logged

### Legal Context

- Section 38: Any person may apply to CSOS if internal resolution fails
- Section 39: CSOS may refer to conciliation before adjudication
- Regulation 4: Applications must include statement of internal resolution attempt
- Form 2: Requires case reference, dates, parties, prior attempts
- CSOS fees: Disputes up to R50,000 — fee schedule per Regulation 9

### PDF Generation

- Reuse existing PDF infrastructure (ProviderInvoice.pdfUrl pattern)
- Populate from DisputeCase + DisputeEvent + DisputeEvidence + DisputeMessage records
- Header: "COMMUNITY SCHEME DISPUTE RECORD" with reference number and scheme registration

### the agent's Discretion

- PDF generation library (match existing infrastructure)
- Exact formatting (font, layout, branding — use existing templates)
- Whether to include HOA logo/branding
- Certification signature block design
  </decisions>

<canonical_refs>

## Canonical References

- `docs/advisories/ADVISORY-017.md` — §5 (CSOS Legislative Context), §13 (Export Package Structure), §14 (Audit Retention)
- `.planning/phases/106-dispute-api-routes-intake-screen/` — CSOS export route handler (prerequisite)
- `src/shared/api/provider-billing.ts` — PDF generation pattern (ProviderInvoice.pdfUrl)
  </canonical_refs>

<deferred>
## Deferred Ideas

- CSOS Form 2 legal review by HOA attorney (pre go-live, manual)
- Tenant setting: `csos.schemeRegistration` (BD issue before go-live)
- Automated CSOS deadline reminders (30-day filing windows — future Notification module)
- Multi-language export (future i18n pass)
  </deferred>

---

_Phase: 108-csos-export-package_
_Context gathered: 2026-06-25 from ADVISORY-017.md_
