---
phase: '04'
slug: content-i18n
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-01
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                    |
| ---------------------- | ---------------------------------------- |
| **Framework**          | Vitest (existing project infrastructure) |
| **Config file**        | `vitest.config.ts` (existing)            |
| **Quick run command**  | `npx vitest run --reporter=verbose`      |
| **Full suite command** | `npx vitest run`                         |
| **Estimated runtime**  | ~30 seconds                              |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement     | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status     |
| -------- | ---- | ---- | --------------- | ---------- | --------------- | --------- | ----------------- | ----------- | ---------- |
| 04-01-01 | 01   | 1    | CONTENT-I18N-01 | —          | N/A             | unit      | `npx vitest run`  | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

_Detailed per-task verification map populated during planning (Step 8)._

---

## Wave 0 Requirements

- [ ] Verify existing `transformContentForLocale` tests pass — confirm API layer coverage before frontend work
- [ ] Add Vitest integration test verifying `fetch('/api/content?locale=af')` returns Afrikaans-resolved content
- [ ] Add Vitest unit test for locale parameter propagation in content-fetching hooks

---

## Manual-Only Verifications

| Behavior                            | Requirement     | Why Manual                                | Test Instructions                                                                           |
| ----------------------------------- | --------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| Locale switching on frontend        | CONTENT-I18N-03 | Visual confirmation of UI language change | Switch locale via UI, verify content cards and detail pages re-fetch with new locale        |
| Content card rendering across pages | CONTENT-I18N-01 | Visual layout verification                | Visit news listing, dashboard widgets, resident/unit profiles with multiple locales enabled |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
