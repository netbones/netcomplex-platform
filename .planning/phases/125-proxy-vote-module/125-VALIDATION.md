---
phase: 125
slug: proxy-vote-module
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-23
---

# Phase 125 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (configured at repo root — `vitest.config.ts`, `vitest.shared.ts`) |
| **Config file** | `vitest.shared.ts` (shared setup) + per-slice vitest config pattern |
| **Quick run command** | `npx vitest run --config vitest.shared.ts src/features/proxy-vote/` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds (new proxy-vote tests only) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --config vitest.shared.ts src/features/proxy-vote/`
- **After every plan wave:** Run full `pnpm test` to catch regressions in Events, Notifications, or Media subsystems
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 125-W0-01 | all | 0 | Schema | — | MeetingProxy model compiles with Drizzle | unit | `npx vitest run --config vitest.shared.ts src/features/proxy-vote/` | ❌ W0 | ⬜ pending |
| 125-W0-02 | all | 0 | Signature | — | InternalSignatureAdapter sign/verify contracts | unit | same | ❌ W0 | ⬜ pending |
| 125-W0-03 | all | 0 | Notifications | — | Notification insert via db.insert(notifications) | unit | same | ❌ W0 | ⬜ pending |
| 125-W0-04 | all | 0 | Document upload | — | uploadDocument() accepts PDF/JPG/PNG, rejects others | unit | same | ❌ W0 | ⬜ pending |
| 125-W0-05 | all | 0 | QR generation | — | qrcode.react renders with correct value | component | same | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/test/setup.ts` — shared fixtures (existing, `beforeAll`/`afterAll` with Prisma connection pool)
- [x] `vitest.shared.ts` — shared vitest config (existing)
- [ ] `src/features/proxy-vote/__tests__/schema.test.ts` — MeetingProxy model + enums compilation
- [ ] `src/features/proxy-vote/__tests__/signature-adapter.test.ts` — InternalSignatureAdapter unit tests
- [ ] `src/features/proxy-vote/__tests__/notifications.test.ts` — cross-user notification dispatch
- [ ] `src/features/proxy-vote/__tests__/upload.test.ts` — uploadDocument() type validation
- [ ] `src/features/proxy-vote/__tests__/qr.test.ts` — QR reference rendering + format

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Canvas signature → PNG export | Proxy Step 5 (draw) | Canvas rendering requires browser; jsdom cannot simulate drawing | Open proxy flow in browser, draw signature on canvas, confirm PNG stored in signatureEvidence.signatureDataUrl |
| QR code scannability at 44×44px | HOA Dashboard | Requires physical QR scanner or camera; automated QR decode validates value not real-world scan | Verify PV-YYYY-NNNN format in generated QR, scan with phone camera |
| react-signature-canvas component render | Proxy Step 5 | Third-party component render behavior in browser | Confirm SignaturePad renders with `border border-gray-300 rounded-lg` at minimum 44px height |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending