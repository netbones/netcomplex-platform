---
phase: 50
slug: service-marketplace
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-27
---

# Phase 50 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                      |
| ---------------------- | ------------------------------------------ |
| **Framework**          | Vitest (project standard)                  |
| **Config file**        | `vitest.config.ts`                         |
| **Quick run command**  | `npx vitest run src/entities/marketplace/` |
| **Full suite command** | `npx vitest run`                           |
| **Estimated runtime**  | ~30 seconds                                |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose` (scoped to changed files)
- **After every plan wave:** Run `npx vitest run` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement  | Threat Ref | Secure Behavior                                                               | Test Type        | Automated Command                                                                                        | File Exists | Status     |
| -------- | ---- | ---- | ------------ | ---------- | ----------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- | ----------- | ---------- |
| 50-01-01 | 01   | 1    | 50-NOTIFY-01 | T-50-01    | Inquiry triggers notification with category=MARKETPLACE                       | unit             | `npx vitest run src/entities/marketplace/__tests__/notification-triggers.test.ts -t "inquiry"`           | ❌ W0       | ⬜ pending |
| 50-01-02 | 01   | 1    | 50-NOTIFY-02 | T-50-02    | Booking confirmed notification to both parties with payload                   | unit             | `npx vitest run src/entities/marketplace/__tests__/notification-triggers.test.ts -t "booking confirmed"` | ❌ W0       | ⬜ pending |
| 50-01-03 | 01   | 1    | 50-NOTIFY-03 | —          | Email template renders service image, provider name, booking date/time        | unit             | `npx vitest run src/entities/marketplace/__tests__/email-templates.test.ts`                              | ❌ W0       | ⬜ pending |
| 50-02-01 | 02   | 2    | 50-PAY-01    | T-50-04    | Checkout initializes Paystack payment with platform fee                       | integration      | `npx vitest run src/app/api/marketplace/__tests__/checkout.test.ts -t "paystack initialize"`             | ❌ W0       | ⬜ pending |
| 50-02-02 | 02   | 2    | 50-PAY-02    | —          | PayPal returns configuration_required when flag is false                      | integration      | `npx vitest run src/app/api/marketplace/__tests__/checkout.test.ts -t "paypal gated"`                    | ❌ W0       | ⬜ pending |
| 50-02-03 | 02   | 2    | 50-PAY-03    | T-50-07    | Platform fee appears as line item on checkout summary                         | unit             | `npx vitest run src/entities/marketplace/__tests__/checkout-summary.test.tsx`                            | ❌ W0       | ⬜ pending |
| 50-03-01 | 03   | 3    | 50-BOOK-01   | T-50-05    | ServiceBooking created with PENDING_CONFIRMATION status                       | integration      | `npx vitest run src/app/api/marketplace/__tests__/bookings.test.ts -t "create booking"`                  | ❌ W0       | ⬜ pending |
| 50-03-02 | 03   | 3    | 50-BOOK-02   | —          | Date picker greys out dates with no availability                              | unit             | `npx vitest run src/entities/marketplace/__tests__/date-picker.test.tsx`                                 | ❌ W0       | ⬜ pending |
| 50-03-03 | 03   | 3    | 50-BOOK-03   | —          | Time-slot grid shows available slots for selected date                        | unit             | `npx vitest run src/entities/marketplace/__tests__/time-slot-grid.test.tsx`                              | ❌ W0       | ⬜ pending |
| 50-04-01 | 04   | 4    | 50-MOB-01    | —          | Swipe left reveals "Book" action with green indicator                         | component        | `npx vitest run src/entities/marketplace/__tests__/swipe-card.test.tsx`                                  | ❌ W0       | ⬜ pending |
| 50-04-02 | 04   | 4    | 50-MOB-02    | —          | Bottom sheet opens with date picker → time-slots → confirmation (3 steps max) | component        | `npx vitest run src/entities/marketplace/__tests__/bottom-sheet.test.tsx`                                | ❌ W0       | ⬜ pending |
| 50-04-03 | 04   | 4    | 50-MOB-03    | —          | All interactive elements have minimum 44x44px touch targets                   | component / a11y | Manual check + axe-core audit                                                                            | ❌ W0       | ⬜ pending |
| 50-04-04 | 04   | 4    | 50-MOB-04    | —          | Pull-to-refresh triggers on service listings page                             | component / e2e  | Playwright test on mobile viewport                                                                       | ❌ W0       | ⬜ pending |
| 50-DB-01 | 01   | 1    | 50-DB-01     | —          | ServiceBooking table exists separate from facility Booking                    | schema           | `npx vitest run src/db/__tests__/schema.test.ts -t "ServiceBooking"`                                     | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/entities/marketplace/__tests__/notification-triggers.test.ts` — all 7 lifecycle notification triggers
- [ ] `src/entities/marketplace/__tests__/email-templates.test.ts` — marketplace Resend template rendering
- [ ] `src/app/api/marketplace/__tests__/checkout.test.ts` — checkout API with Paystack mock
- [ ] `src/app/api/marketplace/__tests__/bookings.test.ts` — ServiceBooking CRUD
- [ ] `src/entities/marketplace/__tests__/date-picker.test.tsx` — date picker component
- [ ] `src/entities/marketplace/__tests__/time-slot-grid.test.tsx` — time slot grid
- [ ] `src/entities/marketplace/__tests__/bottom-sheet.test.tsx` — bottom sheet flow
- [ ] `src/entities/marketplace/__tests__/swipe-card.test.tsx` — swipe card component
- [ ] `src/entities/marketplace/__tests__/checkout-summary.test.tsx` — checkout summary with platform fee
- [ ] `src/features/marketplace/__tests__/marketplace-listings.test.tsx` — marketplace listings page with responsive grid
- [ ] `src/db/__tests__/schema.test.ts` — schema verification (ServiceBooking table)

---

## Manual-Only Verifications

| Behavior             | Requirement | Why Manual                                           | Test Instructions                                                           |
| -------------------- | ----------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Mobile touch targets | 50-MOB-03   | axe-core audit requires browser rendering            | Run axe-core in browser devtools on service listing page at mobile viewport |
| Pull-to-refresh UX   | 50-MOB-04   | Gesture-based interaction requires real touch events | Open /dashboard/services on mobile device, pull down on listing grid        |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
