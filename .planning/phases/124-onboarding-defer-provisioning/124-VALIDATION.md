---
phase: 124
slug: onboarding-defer-provisioning
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-09
---

# Phase 124 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                    |
| ---------------------- | -------------------------------------------------------- |
| **Framework**          | {vitest / jest — detect from package.json during Wave 0} |
| **Config file**        | {path or "none — Wave 0 installs"}                       |
| **Quick run command**  | `{quick command}`                                        |
| **Full suite command** | `{full command}`                                         |
| **Estimated runtime**  | ~{N} seconds                                             |

---

## Sampling Rate

- **After every task commit:** Run `{quick run command}`
- **After every plan wave:** Run `{full suite command}`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** {N} seconds

---

## Per-Task Verification Map

| Task ID   | Plan | Wave | Requirement | Threat Ref   | Secure Behavior                     | Test Type | Automated Command | File Exists | Status     |
| --------- | ---- | ---- | ----------- | ------------ | ----------------------------------- | --------- | ----------------- | ----------- | ---------- |
| {N}-01-01 | 01   | 1    | TENANT-01   | T-124-01 / — | {expected secure behavior or "N/A"} | unit      | `{command}`       | ✅ / ❌ W0  | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

_Populated by gsd-planner from PLAN.md tasks. Critical coverage targets from research (§ Validation Architecture): nullable-migration reversibility, conditional-hook null vs. invited-user branch, `tenantId = NULL` Postgres never-matches guard, email-delivery-failure surfacing, cross-subdomain cookie scope._

---

## Wave 0 Requirements

- [ ] `{tests/test_file}` — stubs for TENANT-01..06
- [ ] `{shared fixtures}` — null-tenant user factory, verified-session helper
- [ ] `{framework install}` — if no framework detected

_If none: "Existing infrastructure covers all phase requirements."_

---

## Manual-Only Verifications

| Behavior                                                        | Requirement | Why Manual                                                                                                   | Test Instructions                                                                              |
| --------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Cross-subdomain cookie reaches `slug.netbones.co.za`            | TENANT-02   | Requires real deployment + subdomain; cookie `Domain` attribute verified at runtime (research open question) | Sign up + verify on `app.netbones.co.za`, confirm session cookie present on a tenant subdomain |
| Verification-email delivery failure is surfaced (not swallowed) | TENANT-02   | Requires forcing a send failure against the real mail transport                                              | Trigger send failure, confirm non-201 / `emailQueued:false` reaches client                     |

_If none: "All phase behaviors have automated verification."_

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < {N}s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
