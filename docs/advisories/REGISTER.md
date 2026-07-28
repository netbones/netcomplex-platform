# Advisory Register

Canonical advisory index. Numbers are allocated sequentially.
Check this register before assigning a new advisory number to avoid collisions.

| #   | File                                           | Title                                                                        | Status                                  |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| 1   | ADVISORY-001.md                                | ADVISORY.md                                                                  | —                                       |
| 2   | ADVISORY-002.md                                | ADVISORY_TRPC_LOADING.md                                                     | —                                       |
| 3   | ADVISORY-003.md                                | npm Supply Chain Poisoning                                                   | Active                                  |
| 4   | ADVISORY-004.md                                | Deprecate Local `listings.json` in Favour of Neon DB                         | Active                                  |
| 5   | ADVISORY-005.md                                | Migrating from v10 to v11                                                    | —                                       |
| 6   | ADVISORY-006.md                                | Balancing FSD Lint Rules with Practical Concerns                             | —                                       |
| 7   | ADVISORY-007.md                                | —                                                                            | —                                       |
| 8   | ADVISORY-008.md                                | Server-Only Module Isolation in FSD Barrels                                  | Approved — Pending Execution            |
| 9   | ADVISORY-009.md                                | Steiger Config Bugs and `no-public-api-sidestep` Remediation                 | Approved — Pending Execution            |
| 10  | ADVISORY-010.md                                | Supabase Connection Timeout — Better Auth Session Lookups Failing            | P0 — Active                             |
| 11  | ADVISORY-011.md                                | Confirmed Root Cause — DATABASE_URL / DIRECT_URL Precedence Bug in `db.ts`   | P0 — Resolved                           |
| 12  | ADVISORY-012.md                                | Community Merits — Pre-Execution Corrections                                 | Blocking                                |
| 13  | ADVISORY-013.md                                | Achievements System                                                          | —                                       |
| 14  | ADVISORY-014.md                                | Better Auth Admin Plugin & User Impersonation                                | Phase 1 — Agent Ready                   |
| 15  | ADVISORY-015.md                                | USER Role Lifecycle, Provider Admission, and Address System Hardening        | Awaiting DavDev approval                |
| 16  | ADVISORY-016.md                                | Client-Aware Gate System                                                     | Pending agent execution                 |
| 17  | ADVISORY-017.md                                | Dispute Resolution System                                                    | GATES RESOLVED — Awaiting GSD execution |
| 17a | ADVISORY-017-SUPPLEMENTAL.md                   | AI Provider Module                                                           | GATES RESOLVED                          |
| 17b | ADVISORY-017-SUPPLEMENTAL-2.md                 | Platform AI Token Pool                                                       | GATES RESOLVED                          |
| 17c | ADVISORY-017-SUPPLEMENTAL-B.md                 | Platform AI Pool — Tier-Based Token Metering                                 | DRAFT                                   |
| 17d | ADVISORY-017-SUPPLEMENTAL-2-ADDENDUM.md        | ADVISORY-017-SUPPLEMENTAL-2-ADDENDUM                                         | AUTHORITATIVE                           |
| 18  | ADVISORY-018.md                                | Multi-Tenant Domain Routing — Platform vs Tenant Plane Separation            | Approved — Pending Execution            |
| 19  | ADVISORY-019.md                                | Mobile Monorepo Architecture                                                 | APPROVED FOR PLANNING                   |
| 20  | ADVISORY-020.md                                | Phase 46.2 Address Registry — Pre-Execution Corrections                      | Required before execution               |
| 21  | ADVISORY-021.md                                | Education Portal Data Model — Bursary, BursaryField, and Resource Extensions | —                                       |
| 22  | ADVISORY-022.md                                | ADVISORY-22.md — Architectural Guidance                                      | Architectural Guidance                  |
| 23  | ADVISORY-023.md                                | ADVISORY-023.md — Architectural Guidance                                     | Architectural Guidance                  |
| 24  | ADVISORY-024.md                                | Resolve DTO Duplication (COMMUNIQUE-08)                                      | ✅ Executed                             |
| 25  | ADVISORY-025.md                                | Resolve G4 Blocker: DTO Client-Bundle Gating (COMMUNIQUE-09)                 | ✅ Executed                             |
| 26  | ADVISORY-026.md                                | Eliminate Hardcoded Soralia Village Branding                                 | Draft                                   |
| 26a | ADVISORY-026-INVENTORY.md                      | Phase 0 Discovery Inventory                                                  | Awaiting decision gates                 |
| 27  | ADVISORY-027.md                                | Response to COMMUNIQUE-10: Seat / Invoice / Payment Model Duplication        | Awaiting decision gates                 |
| 28  | ADVISORY-028.md                                | ADVISORY.md — Architectural Recommendation                                   | Architectural Recommendation            |
| 29  | ADVISORY-029.md                                | Maintenance Teams — Multi-Member Teams & In-House Provider Lifecycle         | Draft                                   |
| 30  | ADVISORY-030.md                                | Onboarding Refactor: Defer Tenant Provisioning                               | Advisory — blocked                      |
| 31  | ADVISORY-031.md                                | Onboarding Refactor: Defer Tenant Provisioning                               | Advisory — blocked                      |
| 32  | ADVISORY-032-tenant-resolution-rls-fallback.md | Tenant-Resolution Header-Propagation Failure + RLS Fail-Open Fallback        | —                                       |
| 33  | ADVISORY-033.md                                | ADVISORY.md                                                                  | Advisory                                |
| 34  | ADVISORY-034-platform-identity-layer.md        | Introduce a Platform Identity Layer                                          | Proposed                                |
| 34a | ADVISORY-034-SUPPLEMENTAL-1.md                 | SignatureProvider / CredentialType Overlap (MeetingProxy)                    | Proposed                                |
| 35  | ADVISORY-35.md                                 | Comment System — Threaded Comments, Voting & Moderation                      | All 4 phases complete — shipped         |
| 36  | ADVISORY-036.md                                | Useful Patterns from Tamagui Takeout                                         | Guidance                                |

## Special / Non-Numeric

| File                              | Title                             | Status   |
| --------------------------------- | --------------------------------- | -------- |
| ADVISORY-SPECIAL-TIME-TRACKING.md | Time & Cost Attribution Framework | Advisory |

## Conventions

- Numbers are zero-padded to 3 digits in filenames (`ADVISORY-034-*.md`).
- Supplements use the same number with a suffix: `ADVISORY-034-SUPPLEMENTAL-1.md`.
- Before creating a new advisory, scan this register for the next available number.
- Check for title/status naming drift: the `#` heading inside the file should match the register title.
