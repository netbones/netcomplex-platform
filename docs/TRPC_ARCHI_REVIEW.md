# Review Summary

Comprehensive review of 20 tRPC router files (~13,600 lines). The architecture is solid overall with good entity-layer separation, consistent tenant-scoping, and proper soft-delete patterns.
**Status:** 5 critical/high from trance 2 fixed. 13 new issues found in tranche 3 (b80f261f). Remaining deferred/noted.

**Tranche 3 added:** 5 new routers (achievements, agents, invitations, settings, surveys/external), 4 marketplace sub-routers (checkout, premium, service-bookings, urgency), and expanded content (+announcements/campaign) and identity (+suspensions/albums/seats/dashboard).

---

## Issues Found

### CRITICAL (Tranche 2 — all fixed)

| File:Line                | Description                                                                               | Status   |
| ------------------------ | ----------------------------------------------------------------------------------------- | -------- |
| `dwallet.ts:263-279`     | `createPayout` validates `balanceNum < 50` but never checks `input.amount <= balanceNum`. | ✅ FIXED |
| `notifications.ts:74-99` | `notification.create` accepts arbitrary `tenantId` and `userId` from request body.        | ✅ FIXED |
| `chat.ts:111-155`        | `listConversations` has severe N+1 query pattern (41 roundtrips for 20 conversations).    | ✅ FIXED |

### CRITICAL (Tranche 3 — new)

| File:Line                         | Description                                                                                       | Status |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| `achievements.ts:320-328,395-421` | `getAchievementProgress` / `getUnlocked` accept arbitrary `userId` — cross-user data enumeration. | 🔴 NEW |
| `achievements.ts:246`             | `deleteAchievement` uses hard `db.delete()` — should be soft-delete like rest of system.          | 🔴 NEW |
| `identity.ts:1606-1615`           | `deleteAlbum` uses hard `db.delete()` — should be soft-delete.                                    | 🔴 NEW |
| `identity.ts:1394-1408`           | `setTags` is a no-op stub — accepts input, returns it, writes nothing to DB.                      | 🔴 NEW |

---

### HIGH (Tranche 2)

| File:Line                        | Description                                                                                  | Status                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `chat.ts:490-501`                | `deleteMessage` silently succeeds when the message doesn't exist — no existence check.       | ✅ FIXED                                           |
| `content.ts:420-452`             | `toggleLike` creates a like record without verifying the content exists.                     | ✅ FIXED                                           |
| `dwallet.ts:80-98`               | `getWalletSummary` iterates over streams calling `db.select()` per stream (N+1).             | ✅ FIXED                                           |
| `resources.ts:238`               | `createResource` sets `authorId: ctx.role === 'ADMIN' ? null : ctx.userId` — inverts author. | ✅ FIXED                                           |
| `resources.ts:179-189`           | Visibility check uses hardcoded role string comparison instead of `hasPermission()`.         | ⏸️ DEFERRED (reverted; role-check is correct here) |
| `merits.ts:276-362` vs `445-533` | `createMerit` and `awardMerit` are virtually identical (~60 lines duplicated).               | ✅ FIXED                                           |
| `surveys.ts:468-566`             | `getSurveyResults` loads ALL responses into memory, OOM risk with 5K+ responses.             | ✅ FIXED (pagination added)                        |
| `events.ts:138-139`              | `listEvents` enriches results by casting to `Array<Record<string, unknown>>`.                | ⏸️ DEFERRED                                        |
| `chat.ts:376`                    | Raw SQL template literal — `!` non-null assertion on `or()` is unsafe.                       | ✅ FIXED                                           |
| `chat.ts:604`                    | `extractCount` helper typed as `number` but Drizzle `count()` may return string.             | ✅ FIXED                                           |

### HIGH (Tranche 3 — new)

| File:Line                | Description                                                                                                      | Status |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------ |
| `agents.ts:19-60`        | `getActivity` returns hardcoded placeholder data (`prop-1`, `John Agent`) — not connected to any DB table.       | 🔴 NEW |
| `agents.ts:143`          | `getMarketplaceActions` exposes agent `email` to all authenticated users — PII leakage.                          | 🔴 NEW |
| `agents.ts:103`          | `listManagedProperties` calls `.toISOString()` on `expiresAt` which may be null — crashes.                       | 🔴 NEW |
| `identity.ts:1688-1702`  | `getMySeat` queries `soloSeats` + `premiumSeats` with no `tenantId` filter — cross-tenant data exposure.         | 🔴 NEW |
| `settings.ts:169-185`    | `getContactSettings` returns ALL tenant settings (not just contact) to any authenticated user.                   | 🔴 NEW |
| `content.ts:852-904`     | `getCampaignPage` calls `JSON.parse()` on settings values without try-catch — crash-on-bad-data.                 | 🔴 NEW |
| `content.ts:651-660`     | `createAnnouncement` notification fanout has no upper bound — OOM risk with 10K+ users.                          | 🔴 NEW |
| `invitations.ts:271-347` | `acceptInvitation` uses `publicProcedure` + hardcoded `role === 'USER'` comparison instead of `hasPermission()`. | 🔴 NEW |

---

### MEDIUM (Tranche 2)

| File:Line                | Description                                                                                      | Status                    |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------- |
| `notifications.ts:34-71` | Naming inconsistency: `list`/`create`/`markRead`/`delete` vs `listX`/`createX` in other routers. | ⏸️ DEFERRED               |
| `bookings.ts:43-48`      | `CreateBookingInput` accepts date/time as strings with `.min(1)` but no ISO 8601 validation.     | ✅ FIXED                  |
| `content.ts:47-48`       | `ListContentInput` uses `published: z.string().optional()` for boolean filter.                   | ✅ FIXED                  |
| `content.ts:85`          | `UpdateContentInput.title` is `z.union([z.string(), LocaleRecord])` — handler sniffs type.       | ⏸️ DEFERRED (intentional) |
| `resources.ts:123-128`   | Uses `as never` casts for visibility/category filters — type-system evasion.                     | ✅ FIXED                  |
| `resources.ts:66`        | `fileSize: input.fileSize \|\| null` treats `0` as null.                                         | ✅ FIXED                  |
| `maintenance.ts:169-206` | `trackRequestChanges` uses `String(val)` — objects produce `"[object Object]"`.                  | ⏸️ DEFERRED               |
| `groups.ts:289-302`      | `createGroup` inserts owner but doesn't add them as a `groupMember`.                             | ✅ FIXED                  |
| `dwallet.ts:271-278`     | `createPayout` stores amount as `.toString()` — inconsistent with `Number()` usage elsewhere.    | ✅ FIXED                  |
| `marketplace.ts:1-1655`  | Monolithic 1,655-line router — 23 procedures across 6 sub-domains.                               | ✅ FIXED                  |
| `chat.ts:801`            | Router 801 lines; `getUnreadCounts` alone is 135 lines.                                          | ✅ FIXED                  |
| `surveys.ts:988`         | Router 988 lines covering 4 sub-domains.                                                         | ✅ FIXED                  |
| `maintenance.ts:922`     | Router 922 lines covering 5 sub-domains.                                                         | ✅ FIXED                  |
| `dwallet.ts:97`          | `dataConsents.grantedAt?.toISOString()` — may throw if column stores strings.                    | ✅ FIXED                  |
| `dwallet.ts:41`          | `CreatePayoutInput` hardcodes R50 minimum — should come from tenant config.                      | ⏸️ DEFERRED               |
| `content.ts:108-118`     | `requireContentPermission` duplicated in `events.ts:112-116`.                                    | ✅ FIXED                  |
| multiple files           | `ctx.userId!` non-null assertions everywhere — middleware should narrow the type.                | ⏸️ DEFERRED               |

### MEDIUM (Tranche 3 — new)

| File:Line                          | Description                                                                                         | Status |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| `invitations.ts:81-82,197,199,204` | Multiple `as any` casts for enum columns (`status`, `residencyType`, `role`) — type-system evasion. | 🔴 NEW |
| `invitations.ts:201`               | `organizationId` falls back to hardcoded `'placeholder-org-id'`.                                    | 🔴 NEW |
| `invitations.ts:210-220`           | `sendEmail().catch(() => {})` silently swallows all email delivery failures.                        | 🔴 NEW |
| `settings.ts:153-155`              | `deleteSetting` uses hard `db.delete()` — no soft delete.                                           | 🔴 NEW |
| `settings.ts:110`                  | `id` derived from `${tenantId}_${input.key}` — collision-prone; no uniqueness guarantee.            | 🔴 NEW |
| `achievements.ts:150-162`          | `createAchievement` doesn't check for duplicate `key` before insert.                                | 🔴 NEW |
| `content.ts:556-610`               | `listAnnouncements` is `publicProcedure` but OpenAPI meta says `protect: true`.                     | 🔴 NEW |
| `content.ts:621-632`               | `createAnnouncement` validates `resourceId` exists but misses `notDeleted()` check.                 | 🔴 NEW |
| `marketplace/premium.ts:164,194`   | Uses raw SQL (`db.execute()`) instead of Drizzle query builder — inconsistent pattern.              | 🔴 NEW |
| `identity.ts:1739-1796`            | `getDashboardStats` runs 4 sequential `count()` queries — 4 roundtrips for a single widget.         | 🔴 NEW |

---

### LOW (Tranche 2)

| File:Line                | Description                                                                              | Status                         |
| ------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------ |
| `index.ts:1-38`          | Clean barrel export. No missing or incorrect imports.                                    | ✅                             |
| `notifications.ts:12-28` | `notificationSchema` uses `z.any().nullable()` for `payload` — should use `z.unknown()`. | ✅ FIXED                       |
| `merits.ts:42-48`        | `DEFAULT_TIER_THRESHOLDS` declared with `eslint-disable-next-line` — dead code.          | ✅ FIXED                       |
| `bookings.ts:116-119`    | Special-case string `date === 'today'` not documented in Zod schema.                     | ✅ FIXED                       |
| `content.ts:46-54`       | `CategoryEnum` duplicated between `content.ts` and `CreateContentInput`.                 | ✅ (stale — used once, reused) |
| `marketplace.ts:22-46`   | `SERVICE_CATEGORIES` hardcoded — should be tenant-configurable for multi-tenant.         | ⏸️ DEFERRED                    |
| `chat.ts:39`             | `listConversations` uses `.input(z.void())` but defines verbose `.output()`.             | ⏸️ DEFERRED                    |
| `events.ts:30`           | `ListEventsInput` has `upcoming: z.string().optional()` — string for boolean.            | ✅ FIXED                       |

### LOW (Tranche 3 — new)

| File:Line                     | Description                                                                                            | Status |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| `surveys/external.ts:38`      | `answers: z.record(z.unknown())` with no size limit — repeats previously-fixed internal surveys issue. | 🔴 NEW |
| `identity.ts:1390-1392`       | `getTags` returns hardcoded `{ tags: [] }` — stub with no implementation.                              | 🔴 NEW |
| `identity.ts:1800-1834`       | `listUserBooks` uses `ctx.role === 'ADMIN'` hardcoded role string comparison.                          | 🔴 NEW |
| `identity.ts:1813`            | `listUserBooks` output uses `z.any()` — weakens type safety.                                           | 🔴 NEW |
| `marketplace/checkout.ts:134` | `reference.replace('svc-', '')` — assumes reference prefix with no validation.                         | 🔴 NEW |
| `marketplace/premium.ts:236`  | Platform address derived from user name — collisions likely with common names.                         | 🔴 NEW |

---

## Routers Added in Tranche 3

| Router                                 | Lines | Procedures | OpenAPI | Split? |
| -------------------------------------- | ----- | ---------- | ------- | ------ |
| `achievements.ts`                      | 422   | 7          | ✅      | No     |
| `agents.ts`                            | 205   | 4          | ✅      | No     |
| `invitations.ts`                       | 505   | 7          | ✅      | No     |
| `settings.ts`                          | 186   | 5          | ✅      | No     |
| `marketplace/checkout.ts`              | 191   | 2          | ✅      | Yes    |
| `marketplace/premium.ts`               | 283   | 4          | ✅      | Yes    |
| `marketplace/service-bookings.ts`      | 307   | 4          | ✅      | Yes    |
| `marketplace/urgency.ts`               | 81    | 1          | ✅      | Yes    |
| `surveys/external.ts`                  | 69    | 2          | ❌      | Yes    |
| `content.ts` (expanded, announcements) | +531  | +5         | ✅      | N/A    |
| `identity.ts` (expanded)               | +583  | +10        | ✅      | N/A    |

---

## Consistency Patterns Summary

| Aspect              | Observation                                                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant validation   | ✅ Consistent — every procedure checks `ctx.tenantId`. Exception: `identity.ts:1688-1702` (`getMySeat`) missing tenantId filter.                                                                                                               |
| Soft-delete pattern | ⚠️ Regression — `achievements.ts:246`, `identity.ts:1606`, `settings.ts:153` use hard `db.delete()` instead of `set({ deletedAt: now() })`.                                                                                                    |
| Input schemas       | ⚠️ Inconsistent — some use `.optional().default()`, some inline defaults, some `as any` casts (invitations).                                                                                                                                   |
| Response shapes     | ⚠️ Inconsistent — some return `{ items, total, page }`, others `{ listings, pagination }`, others flat arrays, others direct entities.                                                                                                         |
| Error codes         | ✅ Consistent — `TRPCError` with appropriate codes (FORBIDDEN, NOT_FOUND, BAD_REQUEST, CONFLICT, PRECONDITION_FAILED).                                                                                                                         |
| Revalidation        | ⚠️ Inconsistent — 5 different revalidation helpers (`revalidateDashboard`, `revalidateContent`, `revalidateAdminChanges`, `revalidateDirectory`, `revalidateConversations`) used ad-hoc. Tranche 3 ads `revalidateDashboard` in announcements. |
| OpenAPI meta        | ⚠️ Some routers have `.meta({ openapi: ... })` (resources, events, groups, marketplace, surveys, notifications, merits, achievements, agents, invitations, settings, identity), surveys/external lacks OpenAPI meta tags.                      |
| Permission model    | ⚠️ Mix of `hasPermission(ctx.role, 'permission')` and direct role string comparisons (`role === 'ADMIN'`, `role === 'USER'`). Tranche 3 introduces `canPublishAnnouncements()` (good), but identity.ts still has raw comparisons.              |
| Raw SQL usage       | ⚠️ `marketplace/premium.ts` uses raw `db.execute()` in 4 places instead of Drizzle query builder — inconsistent with the rest of the codebase.                                                                                                 |
| Stub procedures     | ⚠️ `agents.ts:getActivity` returns hardcoded fake data. `identity.ts:getTags` returns `{ tags: [] }`. `identity.ts:setTags` is a no-op. These are scaffolding that will mislead consumers.                                                     |

---

## N+1 Query Summary

| Router           | Procedure           | Severity | Status                                                       |
| ---------------- | ------------------- | -------- | ------------------------------------------------------------ |
| `chat.ts`        | `listConversations` | CRITICAL | ✅ FIXED — batch queries with `inArray` + `selectDistinctOn` |
| `chat.ts`        | `getUnreadCounts`   | HIGH     | ⏸️ DEFERRED                                                  |
| `dwallet.ts`     | `getWalletSummary`  | HIGH     | ✅ FIXED — `selectDistinctOn` with `inArray`                 |
| `dwallet.ts`     | `listConsents`      | HIGH     | ✅ FIXED — same pattern                                      |
| `maintenance.ts` | `getRequest`        | MEDIUM   | ⏸️ DEFERRED                                                  |
| `groups.ts`      | `getGroup`          | MEDIUM   | ⏸️ DEFERRED                                                  |
| `identity.ts`    | `getDashboardStats` | MEDIUM   | 🔴 NEW — 4 sequential count() queries                        |
