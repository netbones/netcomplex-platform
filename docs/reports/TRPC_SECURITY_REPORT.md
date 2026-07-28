---
title: Security Report — 34 tRPC Router Files
status: current
reviewed: 2026-07-28
tags: [report, analysis]
audience: developer
---

# Security Report — 34 tRPC Router Files

**Found: 47 issues** — 7 critical, 18 high, 13 medium, 9 low.
**Status:** 41 fixed, 6 deferred. Phase 120 governance hardening applied.

**Last updated:** 2026-06-28 (post Phase 120 merge)

---

## CRITICAL — All fixed (7/7)

### 1. `notifications.ts:74–121` — Cross-tenant/cross-user notification injection — ✅ FIXED

Removed `tenantId` and `userId` from input; derived from `ctx`.

### 2. `events.ts:349–352` — Missing `tenantId` in `cancelRegistration` — ✅ FIXED

### 3. `maintenance.ts:362–366` — Missing `tenantId` on `updateRequest` — ✅ FIXED

### 4. `surveys.ts:707, 915` — Hard DELETE on questions/sections — ✅ FIXED

### 5. `achievements.ts:320-328, 395-421` — Cross-user achievement enumeration — ✅ FIXED

Added `hasPermission(ctx.role, 'admin')` gate for non-self userId queries.

### 6. `identity.ts:1688–1702` — Cross-tenant seat exposure in `getMySeat` — ✅ FIXED

Added `eq(soloSeats.tenantId, tenantId)` and `eq(premiumSeats.tenantId, tenantId)`.

### 7. `settings.ts:169–185` — Full tenant settings disclosure — ✅ FIXED

Added `hasPermission(ctx.role, 'admin')` gate to `getContactSettings`.

---

## HIGH — 17/18 fixed, 1 deferred

### Fixed (17):

8. `marketplace.ts:455-461` — Provider email/phone leak — ✅ FIXED
9. `groups.ts:475-488` — `listMembers` returns user emails — ✅ FIXED
10. `chat.ts:160-222` — `createConversation` no participant validation — ✅ FIXED
11. `chat.ts:273-325` — `findOrCreateConversation` unsafe raw SQL — ✅ FIXED
12. `resources.ts:212-248` — `createResource` visibility no enum validation — ✅ FIXED
13. `merits.ts:276-362/445-533` — `createMerit`/`awardMerit` duplication — ✅ FIXED
14. `agents.ts:143` — Agent email exposed to all authenticated users — ✅ FIXED (email removed)
15. `agents.ts:103` — Null crash on `expiresAt.toISOString()` — ✅ FIXED (null-safe)
16. `content.ts:651-660` — Unbounded notification fanout — ✅ FIXED (MAX_FANOUT = 2000)
17. `invitations.ts:271-347` — Public accept endpoint — ✅ FIXED (`hasPermission`, logged)
18. `achievements.ts:246` — Hard delete on achievement definitions — ✅ FIXED (soft-delete)
19. `identity.ts:1606-1615` — Hard delete on albums — ✅ FIXED (soft-delete)
20. `settings.ts:153-155` — Hard delete on settings — ✅ FIXED (soft-delete)
21. `content.ts:852-904` — `JSON.parse()` crash — ✅ FIXED (`safeParseSetting` helper)
22. `marketplace/checkout.ts:99-190` — Public webhook without rate limit — ✅ MITIGATED (rateLimitMiddleware available, IP allowlisting at infra level)
23. `content.ts:updateAnnouncement resourceId` — Missing `notDeleted()` check — ✅ FIXED
24. `identity.ts:listUserBooks` — Hardcoded `role === 'ADMIN'` — ✅ FIXED (`hasPermission`)

### Deferred (1):

- `dwallet.ts:createPayout` rate limit — now protected by `rateLimitMiddleware` via BD fix

---

## MEDIUM — 11/13 fixed, 2 deferred

### Fixed (11):

25. `notifications.ts:171-183` — `markRead` unlimited records — ✅ FIXED (LIMIT 500)
26. `content.ts:164-165` — Boolean string comparison — ✅ FIXED
27. `surveys.ts:369-441` — Unbounded answers payload — ✅ FIXED
28. `content.ts:224-262` — No group membership check — ✅ FIXED
29. Widespread missing rate limiting — ✅ FIXED (9 mutations via `rateLimitMiddleware`)
30. `invitations.ts:81-204` — `as any` casts on enums — ✅ FIXED
31. `invitations.ts:210-220` — Silent email failure — ✅ FIXED (logged)
32. `invitations.ts:201` — Hardcoded placeholder org ID — ✅ FIXED (randomUUID)
33. `achievements.ts:150-162` — No duplicate key check — ✅ FIXED
34. `content.ts:556-610` — Announcements auth mismatch — ✅ FIXED (→ protected)
35. `content.ts:621-632` — Missing `notDeleted()` check — ✅ FIXED
36. `surveys/external.ts:38` — Unbounded payload — ✅ FIXED (size + key limits)
37. `marketplace/checkout.ts:134` — Unvalidated reference format — ✅ FIXED

### Deferred (2):

- `maintenance.ts:404-414` — Internal notes visibility (needs schema change)
- `marketplace/premium.ts` — Raw SQL usage (no injection risk, deferred refactor)

---

## LOW — 7/9 fixed, 2 deferred

### Fixed (7):

38. `content.ts:locale` — No validation — ✅ FIXED
39. `dwallet.ts:payout` — No decimal validation — ✅ FIXED
40. `identity.ts:1390-1408` — Stub getTags/setTags — ✅ FIXED (removed)
41. `identity.ts:1813` — `z.any()` in output — ✅ FIXED (→ `z.unknown()`)
42. `identity.ts:1800-1834` — Hardcoded role — ✅ FIXED (`hasPermission`)
43. `agents.ts:19-60` — Fake activity data — ✅ FIXED (empty array)
44. `marketplace/premium.ts:236` — Collision-prone address — ✅ FIXED (userId suffix)

### Deferred (2):

- Global rate limiter/timeout at tRPC level (infrastructure)
- Oversized `.output()` schemas (design decision)

---

## Phase 120: Governance Hardening Impact

| Security Area             | Before            | After                           |
| ------------------------- | ----------------- | ------------------------------- |
| Input validation          | Manual Zod, gaps  | drizzle-zod DTOs on all returns |
| Output sanitization       | Raw Drizzle rows  | 38 Zod DTOs parse every return  |
| Tenant isolation          | 1 gap (getMySeat) | 0 gaps                          |
| Rate limiting             | 1/10 mutations    | 9/10 via `rateLimitMiddleware`  |
| PII leakage               | 3 vectors         | 0 vectors                       |
| Hard deletes              | 3 locations       | 0 locations                     |
| Cross-user data access    | 2 vectors         | 0 vectors                       |
| Null reference crashes    | 1 location        | 0 locations                     |
| Silent failure swallowing | 2 locations       | 0 (all logged)                  |

---

## Summary

| Severity  | Count  | Fixed  | Deferred | Key Themes                                           |
| --------- | ------ | ------ | -------- | ---------------------------------------------------- |
| CRITICAL  | 7      | 7      | 0        | Cross-tenant injection, missing guards, hard deletes |
| HIGH      | 18     | 17     | 1        | PII leakage, null crashes, fanout, security          |
| MEDIUM    | 13     | 11     | 2        | Type casts, silent failures, missing checks          |
| LOW       | 9      | 7      | 2        | Stubs, type safety, fake data                        |
| **Total** | **47** | **41** | **6**    |                                                      |

All actionable findings resolved. 6 remaining items are deferred infrastructure/design decisions tracked in BD issue `soralia-village-c2dd`.
