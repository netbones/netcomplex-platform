---
title: Review Summary
status: current
reviewed: 2026-07-28
tags: [report, analysis]
audience: developer
---

# Review Summary

Comprehensive review of 34 tRPC router files across 20 domains. Architecture is now governance-hardened: all procedures return envelope-wrapped responses, mapped through drizzle-zod DTOs.

**Status:** All security + architecture findings fixed or deferred. Phase 120 governance hardening complete (merge `b6524055`).

**Changes since last review:**

- Tranche 3 security fixes (22 fixes across 3 BD issue batches — commits `641aac9a`, `9f3cb596`, `292b6fa7`)
- 4 BD issues closed: N+1 queries, ctx narrowing, tenant-configurable defaults, rate-limit middleware
- Phase 120: envelope + DTO + procedure tiers on all 34 routers (commits `b7ef24e9`..`afea5e1a`)

---

## Issues Found

### CRITICAL — All fixed

| File:Line                         | Description                                                                                      | Status   |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| `dwallet.ts:263-279`              | `createPayout` validates `balanceNum < 50` but never checks `input.amount <= balanceNum`         | ✅ FIXED |
| `notifications.ts:74-99`          | `notification.create` accepts arbitrary `tenantId` and `userId` from request body                | ✅ FIXED |
| `chat.ts:111-155`                 | `listConversations` has severe N+1 query pattern                                                 | ✅ FIXED |
| `achievements.ts:320-328,395-421` | `getAchievementProgress` / `getUnlocked` accept arbitrary `userId` — cross-user data enumeration | ✅ FIXED |
| `achievements.ts:246`             | `deleteAchievement` uses hard `db.delete()` — changed to soft-delete                             | ✅ FIXED |
| `identity.ts:1606-1615`           | `deleteAlbum` uses hard `db.delete()` — changed to soft-delete                                   | ✅ FIXED |
| `identity.ts:1394-1408`           | `setTags` is a no-op stub — removed                                                              | ✅ FIXED |

---

### HIGH — All fixed

| File:Line                        | Description                                                                                 | Status                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `chat.ts:490-501`                | `deleteMessage` silently succeeds when the message doesn't exist                            | ✅ FIXED                                       |
| `content.ts:420-452`             | `toggleLike` creates a like record without verifying the content exists                     | ✅ FIXED                                       |
| `dwallet.ts:80-98`               | `getWalletSummary` iterates over streams calling `db.select()` per stream (N+1)             | ✅ FIXED                                       |
| `resources.ts:238`               | `createResource` sets `authorId: ctx.role === 'ADMIN' ? null : ctx.userId` — inverts author | ✅ FIXED                                       |
| `resources.ts:179-189`           | Visibility check uses hardcoded role string comparison instead of `hasPermission()`         | ⏸️ DEFERRED (role-check is correct here)       |
| `merits.ts:276-362` vs `445-533` | `createMerit` and `awardMerit` are virtually identical (~60 lines duplicated)               | ✅ FIXED                                       |
| `surveys.ts:468-566`             | `getSurveyResults` loads ALL responses into memory                                          | ✅ FIXED (pagination added)                    |
| `events.ts:138-139`              | `listEvents` enriches results by casting to `Array<Record<string, unknown>>`                | ⏸️ DEFERRED                                    |
| `chat.ts:376`                    | Raw SQL template literal — `!` non-null assertion on `or()` is unsafe                       | ✅ FIXED                                       |
| `chat.ts:604`                    | `extractCount` helper typed as `number` but Drizzle `count()` may return string             | ✅ FIXED                                       |
| `agents.ts:19-60`                | `getActivity` returns hardcoded placeholder data                                            | ✅ FIXED (returns `{ activities: [] }`)        |
| `agents.ts:143`                  | `getMarketplaceActions` exposes agent `email` to all authenticated users — PII leakage      | ✅ FIXED                                       |
| `agents.ts:103`                  | `listManagedProperties` calls `.toISOString()` on `expiresAt` which may be null             | ✅ FIXED (null-safe `?.toISOString() ?? null`) |
| `identity.ts:1688-1702`          | `getMySeat` queries with no `tenantId` filter — cross-tenant data exposure                  | ✅ FIXED                                       |
| `settings.ts:169-185`            | `getContactSettings` returns ALL tenant settings to any authenticated user                  | ✅ FIXED (admin gate added)                    |
| `content.ts:852-904`             | `getCampaignPage` calls `JSON.parse()` without try-catch                                    | ✅ FIXED (`safeParseSetting` helper)           |
| `content.ts:651-660`             | `createAnnouncement` notification fanout has no upper bound                                 | ✅ FIXED (MAX_FANOUT = 2000)                   |
| `invitations.ts:271-347`         | `acceptInvitation` uses `publicProcedure` + hardcoded `role === 'USER'`                     | ✅ FIXED (`hasPermission` + logged)            |

---

### MEDIUM — Mostly fixed

| File:Line                          | Description                                                                                 | Status                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------ |
| `notifications.ts:34-71`           | Naming inconsistency: `list`/`create`/`markRead`/`delete` vs `listX`/`createX`              | ⏸️ DEFERRED              |
| `bookings.ts:43-48`                | `CreateBookingInput` accepts date/time as strings with `.min(1)` but no ISO 8601 validation | ✅ FIXED                 |
| `content.ts:47-48`                 | `ListContentInput` uses `published: z.string().optional()` for boolean filter               | ✅ FIXED                 |
| `content.ts:85`                    | `UpdateContentInput.title` is `z.union([z.string(), LocaleRecord])` — intentional           | ⏸️ DEFERRED              |
| `resources.ts:123-128`             | Uses `as never` casts for visibility/category filters — type-system evasion                 | ✅ FIXED                 |
| `resources.ts:66`                  | `fileSize: input.fileSize \|\| null` treats `0` as null                                     | ✅ FIXED                 |
| `maintenance.ts:169-206`           | `trackRequestChanges` uses `String(val)` — objects produce `"[object Object]"`              | ⏸️ DEFERRED              |
| `groups.ts:289-302`                | `createGroup` inserts owner but doesn't add them as a `groupMember`                         | ✅ FIXED                 |
| `dwallet.ts:271-278`               | `createPayout` stores amount as `.toString()` — inconsistent with `Number()`                | ✅ FIXED                 |
| `marketplace`                      | Monolithic 1,655-line router — 23 procedures across 6 sub-domains                           | ✅ FIXED (9 sub-routers) |
| `chat.ts:801`                      | Router 801 lines; `getUnreadCounts` alone is 135 lines                                      | ✅ FIXED (3 sub-routers) |
| `surveys.ts`                       | Router 988 lines covering 4 sub-domains                                                     | ✅ FIXED (5 sub-routers) |
| `maintenance.ts`                   | Router 922 lines covering 5 sub-domains                                                     | ✅ FIXED (5 sub-routers) |
| `dwallet.ts:97`                    | `dataConsents.grantedAt?.toISOString()` — may throw if column stores strings                | ✅ FIXED                 |
| `dwallet.ts:41`                    | `CreatePayoutInput` hardcodes R50 minimum — now reads from tenant settings                  | ✅ FIXED                 |
| `content.ts:108-118`               | `requireContentPermission` duplicated in `events.ts:112-116`                                | ✅ FIXED                 |
| multiple files                     | `ctx.userId!` non-null assertions everywhere                                                | ✅ FIXED (124 removed)   |
| `invitations.ts:81-82,197,199,204` | Multiple `as any` casts for enum columns                                                    | ✅ FIXED                 |
| `invitations.ts:201`               | `organizationId` falls back to hardcoded `'placeholder-org-id'`                             | ✅ FIXED                 |
| `invitations.ts:210-220`           | `sendEmail().catch(() => {})` silently swallows failures                                    | ✅ FIXED (logged)        |
| `settings.ts:153-155`              | `deleteSetting` uses hard `db.delete()`                                                     | ✅ FIXED (soft-delete)   |
| `achievements.ts:150-162`          | `createAchievement` doesn't check for duplicate `key`                                       | ✅ FIXED                 |
| `content.ts:556-610`               | `listAnnouncements` was `publicProcedure` but meta said `protect: true`                     | ✅ FIXED (→ protected)   |
| `content.ts:621-632`               | `createAnnouncement` validates `resourceId` but misses `notDeleted()` check                 | ✅ FIXED                 |
| `marketplace/premium.ts`           | Uses raw SQL (`db.execute()`) instead of Drizzle query builder                              | ⏸️ DEFERRED              |
| `identity.ts:1739-1796`            | `getDashboardStats` runs 4 sequential `count()` queries                                     | ✅ FIXED (→ Promise.all) |

---

### LOW — Mostly fixed

| File:Line                     | Description                                                                  | Status      |
| ----------------------------- | ---------------------------------------------------------------------------- | ----------- |
| `index.ts:1-38`               | Clean barrel export                                                          | ✅          |
| `notifications.ts:12-28`      | `notificationSchema` uses `z.any().nullable()` for `payload`                 | ✅ FIXED    |
| `merits.ts:42-48`             | `DEFAULT_TIER_THRESHOLDS` dead code                                          | ✅ FIXED    |
| `bookings.ts:116-119`         | Special-case string `date === 'today'` not documented in Zod schema          | ✅ FIXED    |
| `content.ts:46-54`            | `CategoryEnum` duplicated between files                                      | ✅          |
| `marketplace.ts:22-46`        | `SERVICE_CATEGORIES` hardcoded                                               | ⏸️ DEFERRED |
| `chat.ts:39`                  | `listConversations` verbose `.output()`                                      | ⏸️ DEFERRED |
| `events.ts:30`                | `ListEventsInput` has `upcoming: z.string().optional()` — string for boolean | ✅ FIXED    |
| `surveys/external.ts:38`      | `answers: z.record(z.unknown())` with no size limit                          | ✅ FIXED    |
| `identity.ts:1390-1392`       | `getTags` stub — removed                                                     | ✅ FIXED    |
| `identity.ts:1800-1834`       | `listUserBooks` uses hardcoded role comparison                               | ✅ FIXED    |
| `identity.ts:1813`            | `listUserBooks` output uses `z.any()` → `z.unknown()`                        | ✅ FIXED    |
| `marketplace/checkout.ts:134` | `reference.replace('svc-', '')` no validation                                | ✅ FIXED    |
| `marketplace/premium.ts:236`  | Platform address collision-prone                                             | ✅ FIXED    |

---

## Phase 120: Governance Compliance Status

| Governance Rule                | Before Phase 120                             | After Phase 120                                                      |
| ------------------------------ | -------------------------------------------- | -------------------------------------------------------------------- |
| Response envelope (Rule 4)     | Raw data returned from all routers           | `toEnvelope(dto.parse(row))` on all 34 routers                       |
| Canonical error codes (Rule 5) | tRPC native codes only                       | `tRPCCodeToCanonical()` mapper available; REST layer fully compliant |
| DTO mapping (Rule 6)           | Raw Drizzle `InferSelectModel` rows returned | 38 drizzle-zod DTOs, all returns parsed through schemas              |
| Procedure tiers                | `publicProcedure`, `protectedProcedure` only | + `tenantProcedure`, `privilegedProcedure`, `agentProcedure`         |
| OpenAPI completeness           | External surveys missing meta                | All procedures have `.meta({ openapi })` tags                        |
| Rate limiting                  | 1/10 mutations rate-limited                  | 9/10 (all except system notifications) → rateLimitMiddleware         |
| ctx type narrowing             | 124 `ctx.userId!` assertions                 | 0 non-null assertions                                                |

---

## N+1 Query Summary

| Router           | Procedure           | Severity | Status                                                       |
| ---------------- | ------------------- | -------- | ------------------------------------------------------------ |
| `chat.ts`        | `listConversations` | CRITICAL | ✅ FIXED — batch queries with `inArray` + `selectDistinctOn` |
| `chat.ts`        | `getUnreadCounts`   | HIGH     | ✅ FIXED — already properly batched                          |
| `dwallet.ts`     | `getWalletSummary`  | HIGH     | ✅ FIXED — `selectDistinctOn` with `inArray`                 |
| `dwallet.ts`     | `listConsents`      | HIGH     | ✅ FIXED — same pattern                                      |
| `maintenance.ts` | `getRequest`        | MEDIUM   | ✅ FIXED — `Promise.all` batching                            |
| `groups.ts`      | `getGroup`          | MEDIUM   | ✅ FIXED — `Promise.all` batching                            |
| `identity.ts`    | `getDashboardStats` | MEDIUM   | ✅ FIXED — 4 sequential → `Promise.all`                      |

---

## Consistency Patterns Summary

| Aspect              | Observation                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| Tenant validation   | ✅ Consistent — every procedure checks `ctx.tenantId`                         |
| Soft-delete pattern | ✅ Consistent — hard deletes replaced with `set({ deletedAt: now() })`        |
| Input schemas       | ✅ Improved — `as any` casts removed, enum validation strengthened            |
| Response shapes     | ✅ Standardized — all returns use `toEnvelope(...)` with DTO parsing          |
| Error codes         | ✅ Consistent — `TRPCError` with appropriate codes                            |
| Revalidation        | ⚠️ 5 different revalidation helpers used ad-hoc                               |
| OpenAPI meta        | ✅ Complete — all routers have `.meta({ openapi: ... })`                      |
| Permission model    | ✅ Improved — `hasPermission()` used; `canPublishAnnouncements()` added       |
| Raw SQL usage       | ⚠️ `marketplace/premium.ts` still uses raw `db.execute()` (deferred)          |
| DTO layer           | ✅ New — 38 drizzle-zod DTOs in `src/server/dto/`                             |
| Procedure tiers     | ✅ Expanded — `tenantProcedure`, `privilegedProcedure`, `rateLimitMiddleware` |
