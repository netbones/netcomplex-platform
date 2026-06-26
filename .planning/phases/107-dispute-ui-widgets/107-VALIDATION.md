---
phase: 107
slug: dispute-ui-widgets
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-26
---

# Phase 107 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                          |
| ---------------------- | -------------------------------------------------------------- |
| **Framework**          | Vitest 4.1.2                                                   |
| **Config file**        | `vitest.config.ts` (project root)                              |
| **Quick run command**  | `pnpm vitest run src/features/dispute src/shared/lib/workflow` |
| **Full suite command** | `pnpm test:run`                                                |
| **Estimated runtime**  | ~30 seconds                                                    |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --reporter=verbose` on changed files only
- **After every plan wave:** Run `pnpm test:run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID   | Plan | Wave | Requirement | Threat Ref | Secure Behavior                                        | Test Type   | Automated Command                                                                           | File Exists | Status     |
| --------- | ---- | ---- | ----------- | ---------- | ------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------- | ----------- | ---------- |
| 107-01-01 | 01   | 1    | DISPUTE-06  | N/A        | N/A                                                    | unit        | `pnpm vitest run src/shared/lib/workflow/__tests__/useWorkflow.test.ts -t "forward-only"`   | ❌ W0       | ⬜ pending |
| 107-01-02 | 01   | 1    | DISPUTE-06  | N/A        | N/A                                                    | unit        | `pnpm vitest run src/shared/lib/__tests__/useAutoSave.test.ts`                              | ❌ W0       | ⬜ pending |
| 107-02-01 | 02   | 2    | DISPUTE-06  | N/A        | EmotionCheckIn emoji selection, soft gate              | component   | `pnpm vitest run src/features/dispute/ui/intake/__tests__/EmotionCheckIn.test.tsx`          | ❌ W0       | ⬜ pending |
| 107-02-02 | 02   | 2    | DISPUTE-06  | N/A        | SelfResolutionChecklist <2 boxes tip                   | component   | `pnpm vitest run src/features/dispute/ui/intake/__tests__/SelfResolutionChecklist.test.tsx` | ❌ W0       | ⬜ pending |
| 107-02-03 | 02   | 2    | DISPUTE-06  | N/A        | FrivolityScreen advisory, always allows proceed        | component   | `pnpm vitest run src/features/dispute/ui/intake/__tests__/FrivolityScreen.test.tsx`         | ❌ W0       | ⬜ pending |
| 107-02-04 | 02   | 2    | DISPUTE-06  | N/A        | DisputeForm Zod validation + API submission            | integration | `pnpm vitest run src/features/dispute/ui/intake/__tests__/DisputeForm.test.tsx`             | ❌ W0       | ⬜ pending |
| 107-03-01 | 03   | 3    | DISPUTE-07  | N/A        | my-disputes widget renders cards + CTA                 | integration | `pnpm vitest run src/widgets/dashboard/ui/__tests__/MyDisputesWidget.test.tsx`              | ❌ W0       | ⬜ pending |
| 107-03-02 | 03   | 3    | DISPUTE-07  | N/A        | admin-disputes widget renders moderation queue         | integration | `pnpm vitest run src/widgets/dashboard/ui/__tests__/AdminDisputesWidget.test.tsx`           | ❌ W0       | ⬜ pending |
| 107-03-03 | 03   | 3    | DISPUTE-07  | N/A        | Widget registration for my-disputes and admin-disputes | unit        | `pnpm vitest run src/widgets/dashboard/model/__tests__/widgets.test.ts -t "disputes"`       | ❌ W0       | ⬜ pending |
| 107-04-01 | 04   | 3    | DISPUTE-07  | N/A        | DisputeDetailPage renders header + 2-column layout     | integration | `pnpm vitest run src/page-modules/disputes/ui/__tests__/DisputeDetailPage.test.tsx`         | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/shared/lib/workflow/__tests__/useWorkflow.test.ts` — covers REQ-DISPUTE-06 workflow engine behavior
- [ ] `src/shared/lib/__tests__/useAutoSave.test.ts` — covers auto-save hook
- [ ] `src/features/dispute/ui/intake/__tests__/EmotionCheckIn.test.tsx` — covers emotion stage
- [ ] `src/features/dispute/ui/intake/__tests__/SelfResolutionChecklist.test.tsx` — covers checklist stage
- [ ] `src/features/dispute/ui/intake/__tests__/FrivolityScreen.test.tsx` — covers AI screen
- [ ] `src/features/dispute/ui/intake/__tests__/DisputeForm.test.tsx` — covers form submission
- [ ] `src/widgets/dashboard/ui/__tests__/MyDisputesWidget.test.tsx` — covers resident widget
- [ ] `src/widgets/dashboard/ui/__tests__/AdminDisputesWidget.test.tsx` — covers admin widget
- [ ] `src/page-modules/disputes/ui/__tests__/DisputeDetailPage.test.tsx` — covers detail page
- [ ] `src/widgets/dashboard/model/__tests__/widgets.test.ts` — add dispute widget registration tests
- [ ] `src/test/setup.ts` — verify localStorage mock is available for auto-save tests

---

## Manual-Only Verifications

None — all phase behaviors have automated verification planned.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
