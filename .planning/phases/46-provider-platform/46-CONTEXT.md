---
phase: 46-provider-platform
type: feature
status: planned
created: 2026-06-04
restructured: 2026-06-19
planned: 2026-06-21
milestone: M5b
compliance: privacy-law-compliant
---

# Phase 46: Provider Platform

**Goal:** Ship the Provider Platform cluster — provider analytics, provider dashboard, third-party provider registration, and provider billing & subscription. These 4 features enable the provider economy for the Soralia Village anchor tenant launch.

**Status:** Planned (3 plans + 1 admin plan created on 2026-06-21)

**BD sources (4):**

- `kia` — Provider analytics
- `9e8` — Provider dashboard
- `69c` — Third-party provider registration
- `4fh` — Provider billing & subscription

**Auto-closed (orphan FSD migration events, triaged 2026-06-18):**

- `p81.1` — Orphan FSD migration state-change event (no actionable description)
- `rbs.1` — Orphan FSD migration state-change event (no actionable description)

**Restructuring note (2026-06-19):** The original Bucket C Triage (8 features promoted to Phase 49, 2 orphans auto-closed) was restructured. The Provider Platform cluster (4 items) stays in Phase 46. The Service Marketplace cluster (4 items: gtm, cp8, qx7, 4vk) moved to Phase 50. Phase 49 was deleted from the ROADMAP.

**NEW REQUIREMENTS ADDED (2026-06-21):**

1. **Tenant-configurable registration mode:** Platform admin can set whether provider registration is OPEN or INVITATION_ONLY per tenant.
2. **Legal adherence step:** Provider registration includes mandatory legal terms acceptance (Terms of Service, Privacy Policy, Code of Conduct). Acceptance is tracked with version and timestamp.
3. **Due diligence workflow:** All provider registrations trigger a verification workflow. Admin approves or rejects after reviewing identity, service history, and references.
4. **Verified/unverified status system:** Providers have status PENDING, PROBATION, VERIFIED, or SUSPENDED. Status affects feature access.
5. **Probation period with community credits:** Providers on probation accrue community credits through response time, service quality, review ratings, compliance, and engagement. Credits determine progression to verified status.
6. **Credit-based verification:** Providers must reach a credit threshold to become verified. Admin can override or adjust credits.
7. **Payment gateways:** Platform supports Paystack (ZAR, South African market) and PayPal (international, multiple currencies).
8. **Platform fee processing:** Platform collects a transaction fee on all payments according to the SaaS License Agreement (Section 4.7). Fee varies by subscription tier.
9. **Revenue tracking:** All transactions tracked with platform fee, processor fee, and net amount to provider.

**Dependencies:** None (independent of Community Merits, i18n, OTP, dWallet). Can execute in parallel with Phase 45 and 47.

**Acceptance:** Via PLAN.md files (46-01–46-04), verified by gsd-plan-checker

**Plans:**

- `46-01-PLAN.md` — Provider Dashboard Space & Analytics (kia + 9e8)
- `46-02-PLAN.md` — Provider Registration with Legal Adherence & Verification (69c)
- `46-03-PLAN.md` — Provider Billing, Subscription & Community Credits (4fh)
- `46-04-PLAN.md` — Admin Provider Moderation, Due Diligence & Analytics

**Compliance:** All legal acceptance and verification steps are privacy law compliant (GDPR, POPIA).

**Naming advisory (2026-06-21):** The `CommunityMerit` table in 46-03-PLAN.md was renamed to `ProviderMerit` to eliminate confusion with Phase 45's "Community Merits" resident-standing system (`BehaviorRecord`). Provider merit events are about provider trust scoring — not resident behavior tracking. See `docs/advisories/ADVISORY-012.md` for corrections to the Phase 45 BehaviorRecord implementation.

**Future platform rewards convergence risk:** `BehaviorRecord` (Phase 45, resident standing) and `ProviderMerit` (Phase 46, provider scoring) are two independent scoring/reputation subsystems with different data models. If the future platform rewards system (not yet scheduled) is expected to unify resident and provider reputation into a single `PlatformReward` model, these two tables should share a common scoring contract to minimize migration cost. Tracked as BD issue: TBD.
