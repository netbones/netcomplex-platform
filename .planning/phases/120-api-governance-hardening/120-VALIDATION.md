---
phase: 120
slug: api-governance-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-30
---

# Phase 120 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                              |
| ---------------------- | -------------------------------------------------- |
| **Framework**          | Vitest (project standard)                          |
| **Config file**        | `vitest.config.ts` (project root)                  |
| **Quick run command**  | `pnpm vitest run src/test/api/ --reporter=verbose` |
| **Full suite command** | `pnpm tsc --noEmit && pnpm lint && pnpm test`      |
| **Estimated runtime**  | ~45 seconds                                        |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/test/api/`
- **After every plan wave:** Run `pnpm tsc --noEmit && pnpm lint && pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID   | Plan | Wave | Requirement | Threat Ref | Secure Behavior                                                      | Test Type   | Automated Command                                       | File Exists | Status     |
| --------- | ---- | ---- | ----------- | ---------- | -------------------------------------------------------------------- | ----------- | ------------------------------------------------------- | ----------- | ---------- |
| 120-01-01 | 01   | 1    | GOV-01      | T-SPOOF-01 | Envelope wraps all tRPC success responses with {success, data, meta} | unit        | `pnpm vitest run src/test/api/trpc-envelope.test.ts`    | ❌ W0       | ⬜ pending |
| 120-01-02 | 01   | 1    | GOV-02      | T-INFO-01  | errorFormatter rewrites native codes to canonical codes              | unit        | `pnpm vitest run src/test/api/trpc-error-codes.test.ts` | ❌ W0       | ⬜ pending |
| 120-01-03 | 01   | 1    | GOV-04      | T-SPOOF-02 | tenantProcedure rejects missing tenantId                             | unit        | `pnpm vitest run src/test/api/trpc-procedures.test.ts`  | ❌ W0       | ⬜ pending |
| 120-01-04 | 01   | 1    | GOV-05      | T-ELEV-01  | privilegedProcedure enforces role + suspension                       | unit        | `pnpm vitest run src/test/api/trpc-procedures.test.ts`  | ❌ W0       | ⬜ pending |
| 120-01-05 | 01   | 1    | GOV-06      | T-ELEV-01  | Suspension check in privilegedProcedure middleware                   | unit        | `pnpm vitest run src/test/api/trpc-procedures.test.ts`  | ❌ W0       | ⬜ pending |
| 120-02-xx | 02   | 2    | GOV-03      | T-INFO-02  | All DTOs derived from drizzle-zod createSelectSchema                 | unit        | `pnpm vitest run src/test/api/trpc-dto-mapping.test.ts` | ❌ W0       | ⬜ pending |
| 120-03-xx | 03   | 3    | GOV-01      | T-DOS-01   | Routers return envelope-wrapped responses via toEnvelope()           | unit        | `pnpm vitest run src/test/api/trpc-envelope.test.ts`    | ❌ W0       | ⬜ pending |
| 120-04-xx | 04   | 4    | GOV-07      | —          | JSDoc tags on all procedures                                         | lint        | `pnpm lint`                                             | —           | ⬜ pending |
| 120-04-xx | 04   | 4    | GOV-08      | —          | OpenAPI meta on external procedures                                  | integration | `pnpm redocly lint`                                     | —           | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/test/api/trpc-envelope.test.ts` — stubs for GOV-01 (envelope shape on success responses)
- [ ] `src/test/api/trpc-error-codes.test.ts` — stubs for GOV-02 (errorFormatter rewrites codes)
- [ ] `src/test/api/trpc-procedures.test.ts` — stubs for GOV-04/05/06 (procedure tier enforcement, suspension)
- [ ] `src/test/api/trpc-dto-mapping.test.ts` — stubs for GOV-03 (DTO validation on responses)
- [ ] ESLint rule for `@public`/`@tenant`/`@privileged` JSDoc tags — needed for GOV-07 enforcement
- [ ] Test infrastructure for tRPC procedure testing — `createCallerFactory` pattern setup

---

## Manual-Only Verifications

| Behavior                                                   | Requirement | Why Manual                                           | Test Instructions                                                                              |
| ---------------------------------------------------------- | ----------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 3 random procedures per wave return correct envelope shape | GOV-01      | Cross-router sampling is expensive to automate fully | Pick 3 procedures, inspect response via tRPC panel or curl, verify {success, data, meta} shape |
| Cross-tenant access returns zero rows                      | GOV-04      | Requires multi-tenant test data setup                | Create users in two tenants, call tenant-scoped procedures, verify isolation                   |
| Suspended user cannot access privileged procedures         | GOV-05      | Requires session manipulation                        | Suspend a user, call privileged procedure, verify FORBIDDEN with canonical code                |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
