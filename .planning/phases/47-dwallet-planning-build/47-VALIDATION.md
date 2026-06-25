---
phase: 47
slug: dwallet-planning-build
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-25
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                               |
| ---------------------- | ----------------------------------- |
| **Framework**          | Vitest (existing project standard)  |
| **Config file**        | `vitest.config.ts` (existing)       |
| **Quick run command**  | `pnpm vitest run src/test/dwallet/` |
| **Full suite command** | `pnpm test`                         |
| **Estimated runtime**  | ~5 seconds                          |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/test/dwallet/` (must pass)
- **After every plan wave:** Run `pnpm test` (full suite)
- **Before `/gsd-verify-work`:** `pnpm typecheck && pnpm lint && pnpm test` all green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Threat Ref | Secure Behavior                                          | Test Type | Automated Command                                                                                                      | File Exists                                   | Status     |
| -------- | ---- | ---- | ----------- | ---------- | -------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------- | ---------- |
| 47-01-01 | 01   | 1    | DWALLET-A   | T-47-01    | Prisma validate + prisma generate pass                   | unit      | `npx prisma validate && npx prisma generate && npx tsc --noEmit`                                                       | ❌ W0                                         | ⬜ pending |
| 47-01-02 | 01   | 1    | DWALLET-A   | T-47-01    | Drizzle schemas compile, all 10 tables present           | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-01-03 | 01   | 1    | DWALLET-A   | T-47-01    | Seed entries exist, modules/seeds compile                | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-02-01 | 02   | 1    | DWALLET-C   | —          | Entity FSD structure created                             | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-02-02 | 02   | 1    | DWALLET-C   | —          | useWallet hook + getOrCreateWallet compile               | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-02-03 | 02   | 1    | DWALLET-C   | —          | Barrel exports all symbols                               | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-03-01 | 03   | 2    | DWALLET-B1  | T-47-02    | 5 core resident routes compile, auth-guarded             | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-03-02 | 03   | 2    | DWALLET-B1  | T-47-02    | 4 action routes compile, envelope pattern                | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-03-03 | 03   | 2    | DWALLET-B1  | T-47-02    | Consent, payout, ledger tests pass                       | unit      | `pnpm vitest run src/test/dwallet/consent.test.ts src/test/dwallet/payout.test.ts src/test/dwallet/ledger.test.ts`     | ❌ W0                                         | ⬜ pending |
| 47-04-01 | 04   | 2    | DWALLET-B2  | T-47-03    | Admin stats + batch routes compile, admin-guarded        | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-04-02 | 04   | 2    | DWALLET-B2  | T-47-03    | Payout + streams routes compile                          | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-04-03 | 04   | 2    | DWALLET-B2  | T-47-03    | Batch math, immutable, isolation tests pass              | unit      | `pnpm vitest run src/test/dwallet/batch.test.ts src/test/dwallet/immutable.test.ts src/test/dwallet/isolation.test.ts` | ❌ W0                                         | ⬜ pending |
| 47-05-01 | 05   | 2    | DWALLET-E   | —          | FeatureKey + mappings compile                            | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-05-02 | 05   | 2    | DWALLET-E   | —          | FeatureRegistry + WIDGET_REGISTRY compile                | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-05-03 | 05   | 2    | DWALLET-E   | —          | Page flags compile, all existing tests pass              | unit      | `npx vitest run src/test/feature-gate-client.test.tsx`                                                                 | ✅ exists                                     | ⬜ pending |
| 47-06-01 | 06   | 3    | DWALLET-D   | —          | DWalletSummaryWidget compiles                            | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-06-02 | 06   | 3    | DWALLET-D   | —          | DWalletAdminWidget compiles, no PII exposed              | unit      | `npx tsc --noEmit && grep -c "individual.*balance\|individual.*consent" --include="\*.tsx"                             | xargs -I{} sh -c '[ {} -eq 0 ] && echo PASS'` | ❌ W0      | ⬜ pending |
| 47-06-03 | 06   | 3    | DWALLET-D   | —          | Widgets registered in widgets.ts, widget store valid     | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-07-01 | 07   | 4    | DWALLET-F   | —          | Wallet page compiles with 5 tabs                         | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-07-02 | 07   | 4    | DWALLET-F   | —          | Navigation entries compile                               | unit      | `npx tsc --noEmit`                                                                                                     | ❌ W0                                         | ⬜ pending |
| 47-07-03 | 07   | 4    | DWALLET-F   | —          | Integration verification + UBIQUITOUS_LANGUAGE.md update | unit      | `npx tsc --noEmit && npx vitest run src/test/navigation-config.test.ts`                                                | ✅ exists                                     | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/test/dwallet/consent.test.ts` — consent creation, latest-row semantics
- [ ] `src/test/dwallet/payout.test.ts` — minimum threshold rejection, status flow
- [ ] `src/test/dwallet/batch.test.ts` — distribution math, atomic rollback
- [ ] `src/test/dwallet/ledger.test.ts` — balance consistency invariant
- [ ] `src/test/dwallet/immutable.test.ts` — WalletTransaction immutability
- [ ] `src/test/dwallet/isolation.test.ts` — tenantId filter enforcement
- [ ] `src/test/dwallet/fixtures.ts` — mock wallet, transactions, consents

---

## Manual-Only Verifications

| Behavior                                       | Requirement | Why Manual              | Test Instructions                                                                                             |
| ---------------------------------------------- | ----------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Admin widget never exposes individual balances | DWALLET-D   | Visual review required  | Review DWalletAdminWidget source — grep for balance, individual, consent references                           |
| dWallet nav entries behind feature flag        | DWALLET-F   | Requires env config     | Set dWallet flag OFF → entries hidden; flag ON → entries visible                                              |
| Pino audit on consent change                   | DWALLET-B1  | Log output verification | Toggle consent, check server logs for `{ event: 'consent_change', userId, streamKey, granted, tenantId, ip }` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
