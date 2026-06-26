---
phase: 106
slug: dispute-api-routes-intake-screen
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-26
---

# Phase 106 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                            |
| ---------------------- | ------------------------------------------------ |
| **Framework**          | vitest 4.1.2                                     |
| **Config file**        | `vitest.config.ts`                               |
| **Quick run command**  | `npx vitest run src/app/api/disputes/__tests__/` |
| **Full suite command** | `npx vitest run`                                 |
| **Estimated runtime**  | ~30 seconds                                      |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/app/api/disputes/__tests__/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID   | Plan | Wave | Requirement | Threat Ref | Secure Behavior                                                                                         | Test Type   | Automated Command                                                        | File Exists | Status     |
| --------- | ---- | ---- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ | ----------- | ---------- |
| 106-01-01 | 01   | 1    | DISPUTE-03  | T-106-01   | POST /api/disputes creates DRAFT with coolingOffEndsAt timestamp                                        | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "create draft"`       | ❌ W0       | ⬜ pending |
| 106-01-02 | 01   | 1    | DISPUTE-03  | T-106-02   | POST /api/disputes/[id]/submit rejects 423 before cooling-off expiry                                    | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "cooling-off"`        | ❌ W0       | ⬜ pending |
| 106-01-03 | 01   | 1    | DISPUTE-03  | T-106-03   | GET /api/disputes lists user's disputes with pagination and access control                              | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "list disputes"`      | ❌ W0       | ⬜ pending |
| 106-01-04 | 01   | 1    | DISPUTE-03  | T-106-04   | GET /api/disputes/[id] returns single dispute with role-based access                                    | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "get dispute"`        | ❌ W0       | ⬜ pending |
| 106-01-05 | 01   | 1    | DISPUTE-03  | T-106-05   | PATCH /api/disputes/[id] updates allowed fields with validation                                         | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "update"`             | ❌ W0       | ⬜ pending |
| 106-02-01 | 02   | 2    | DISPUTE-04  | T-106-06   | POST /api/disputes/[id]/messages enforces isInternal visibility rules                                   | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "message visibility"` | ❌ W0       | ⬜ pending |
| 106-02-02 | 02   | 2    | DISPUTE-04  | T-106-07   | POST /api/disputes/[id]/evidence uploads file via S3, stores metadata                                   | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "evidence upload"`    | ❌ W0       | ⬜ pending |
| 106-02-03 | 02   | 2    | DISPUTE-04  | T-106-08   | POST /api/disputes/[id]/assign restricts to BOARD/ADMIN roles                                           | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "assign moderator"`   | ❌ W0       | ⬜ pending |
| 106-02-04 | 02   | 2    | DISPUTE-04  | T-106-09   | POST /api/disputes/[id]/ruling restricts to BOARD/ADMIN, validates ruling fields                        | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "ruling"`             | ❌ W0       | ⬜ pending |
| 106-03-01 | 03   | 3    | DISPUTE-05  | T-106-10   | POST /api/disputes/intake-screen returns toneScore, likelyFrivolous, suggestedCategory, deEscalationTip | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "intake screen"`      | ❌ W0       | ⬜ pending |
| 106-03-02 | 03   | 3    | DISPUTE-05  | T-106-11   | POST /api/disputes/intake-screen returns 503 when AI unavailable (graceful degradation)                 | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "AI unavailable"`     | ❌ W0       | ⬜ pending |
| 106-03-03 | 03   | 3    | DISPUTE-05  | T-106-12   | GET /api/disputes/[id]/csos-export returns JSON event log with rate limiting                            | integration | `npx vitest run src/app/api/disputes/__tests__/ -t "csos export"`        | ❌ W0       | ⬜ pending |
| 106-04-01 | 04   | 4    | —           | T-106-13   | All routes reject unauthenticated requests (no session)                                                 | unit        | `npx vitest run src/app/api/disputes/__tests__/ -t "unauthorized"`       | ❌ W0       | ⬜ pending |
| 106-04-02 | 04   | 4    | —           | T-106-14   | All routes enforce tenant isolation via `withTenant()` wrapper                                          | unit        | `npx vitest run src/app/api/disputes/__tests__/ -t "tenant isolation"`   | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/app/api/disputes/__tests__/` — entire directory does not exist (needs test setup with mocked `@api/server`, `@entities/tenant/server`)
- [ ] `src/app/api/disputes/__tests__/helpers.ts` — shared test fixtures: mock users (RESIDENT, BOARD, ADMIN), mock disputes, mock AI responses
- [ ] Test mock infrastructure: follow `src/test/api/bookings.test.ts` pattern — mock `@api/server`, `@entities/tenant/server`, `checkQuota`, `recordUsage`

---

## Manual-Only Verifications

| Behavior                      | Requirement | Why Manual                              | Test Instructions                                                           |
| ----------------------------- | ----------- | --------------------------------------- | --------------------------------------------------------------------------- |
| Ruling PDF layout correctness | DISPUTE-04  | Visual formatting requires human review | Generate sample ruling PDF, verify layout matches ADVISORY-017 §13 sections |
| CSOS export PDF formatting    | DISPUTE-05  | PDF layout requires human review        | Export CSOS for test dispute, verify 6 required sections present            |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
