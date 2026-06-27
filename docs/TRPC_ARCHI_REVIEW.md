# Review Summary

Comprehensive review of 14 tRPC router files (~8,500 lines). The architecture is solid overall with good entity-layer separation, consistent tenant-scoping, and proper soft-delete patterns.
**Status:** 5 critical/high fixed, remaining deferred/noted.

---

## Issues Found

### CRITICAL

| File:Line                | Description                                                                               | Status   |
| ------------------------ | ----------------------------------------------------------------------------------------- | -------- |
| `dwallet.ts:263-279`     | `createPayout` validates `balanceNum < 50` but never checks `input.amount <= balanceNum`. | ✅ FIXED |
| `notifications.ts:74-99` | `notification.create` accepts arbitrary `tenantId` and `userId` from request body.        | ✅ FIXED |
| `chat.ts:111-155`        | `listConversations` has severe N+1 query pattern (41 roundtrips for 20 conversations).    | ✅ FIXED |

---

### HIGH

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

---

### MEDIUM

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

---

### LOW

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

---

## Consistency Patterns Summary

| Aspect              | Observation                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant validation   | ✅ Consistent — every procedure checks `ctx.tenantId`                                                                                                                                           |
| Soft-delete pattern | ✅ Consistent — `set({ deletedAt: now() })` used throughout                                                                                                                                     |
| Input schemas       | ⚠️ Inconsistent — some use `.optional().default()`, some inline defaults                                                                                                                        |
| Response shapes     | ⚠️ Inconsistent — some return `{ items, total, page }`, others `{ listings, pagination }`, others flat arrays                                                                                   |
| Error codes         | ✅ Consistent — `TRPCError` with appropriate codes (FORBIDDEN, NOT_FOUND, BAD_REQUEST, CONFLICT)                                                                                                |
| Revalidation        | ⚠️ Inconsistent — 5 different revalidation helpers (`revalidateDashboard`, `revalidateContent`, `revalidateAdminChanges`, `revalidateDirectory`, `revalidateConversations`) used ad-hoc         |
| OpenAPI meta        | ⚠️ Some routers have `.meta({ openapi: ... })` (resources, events, groups, marketplace, surveys, notifications, merits), others don't (chat, content, maintenance, bookings, dwallet, disputes) |
| Permission model    | ⚠️ Mix of `hasPermission(ctx.role, 'permission')` and direct role string comparisons (`role === 'BOARD'`)                                                                                       |

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
