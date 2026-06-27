# Security Report — 14 tRPC Router Files

**Found: 21 issues** — 4 critical, 7 high, 6 medium, 4 low.
**Status:** 16 fixed, 5 deferred.

---

## CRITICAL

### 1. `notifications.ts:74–121` — Arbitrary cross-tenant/cross-user notification injection — ✅ FIXED

The `create` procedure accepts `tenantId` and `userId` from user input with zero validation against the session context. Any authenticated user can inject notifications into any tenant for any user.

```typescript
// notifications.ts:84-99
.input(
  z.object({
    tenantId: z.string(), // ← attacker-controlled
    userId: z.string(),   // ← attacker-controlled
    title: z.string().min(1),
    message: z.string().min(1),
    ...
  })
)
.mutation(async ({ input }) => {  // ← ctx is not even destructured!
  await db.insert(notifications).values({
    tenantId: input.tenantId,  // ← written verbatim
    userId: input.userId,      // ← written verbatim
    ...
  });
});
```

- **Impact:** Phishing/spam campaigns targeting any user across any tenant. Attacker can impersonate system notifications.
- **Fix:** Remove `tenantId` and `userId` from the input schema. Derive both from `ctx`. Gate the procedure behind an admin-like permission or restrict it to system-initiated calls only.

---

### 2. `events.ts:349–352` — Missing `tenantId` in `cancelRegistration` DELETE WHERE clause — ✅ FIXED

```typescript
// events.ts:349-352
const [deleted] = await db
  .delete(eventAttendees)
  .where(and(eq(eventAttendees.eventId, input.id), eq(eventAttendees.userId, ctx.userId)))
  .returning();
```

No `eq(eventAttendees.tenantId, tenantId)` condition. Since RLS is dormant per ADR-019, a user in tenant A could cancel a registration in tenant B if they know (or guess) the event ID.

- **Fix:** Add `eq(eventAttendees.tenantId, ctx.tenantId!)` to the WHERE clause.

---

### 3. `maintenance.ts:362–366` — Missing `tenantId` on `updateRequest` write path — ✅ FIXED

```typescript
// maintenance.ts:362-366
const [updated] = await db
  .update(maintenanceRequests)
  .set(updateData)
  .where(eq(maintenanceRequests.id, input.id)) // ← no tenantId
  .returning();
```

While `getTenantRequest` validates tenantId earlier (line 328), the write itself has no tenant guard. Without RLS active, a TOCTOU race or a future code change that weakens the earlier check creates a direct cross-tenant write path.

- **Fix:** Change to `.where(and(eq(maintenanceRequests.id, input.id), eq(maintenanceRequests.tenantId, tenantId)))`.

The same pattern repeats in `maintenance.ts` at lines: 387, 637, 670, 763, 796, 883, 918 and `resources.ts:317, 359` and `groups.ts:529, 573` and `marketplace.ts:697`.

---

### 4. `surveys.ts:707–715` & `surveys.ts:915–923` — Hard DELETE instead of soft delete — ✅ FIXED

```typescript
// surveys.ts:707-708
const [deleted] = await db
  .delete(questions)  // ← HARD DELETE
  .where(...)
```

Every other router uses soft-delete (`deletedAt = now()`). Hard deletes on `questions` and `surveySections` cause irreversible data loss and break referential integrity with responses (which still references deleted question IDs).

- **Fix:** Change to `db.update(questions).set({ deletedAt: now() })`.

---

## HIGH

### 5. `marketplace.ts:455–461` — Public endpoint leaks provider email and phone — ✅ FIXED

```typescript
// marketplace.ts:455-461 (getListing — publicProcedure)
provider: {
  id: users.id,
  name: users.name,
  email: users.email,   // ← exposed to unauthenticated users
  avatar: users.avatar,
  phone: users.phone,   // ← exposed to unauthenticated users
},
```

Any unauthenticated visitor can scrape all service providers' email addresses and phone numbers without rate limiting.

- **Fix:** Remove `email` and `phone` from the public projection, or restrict this procedure to `protectedProcedure`. Alternatively, only expose them when a user has submitted a legitimate inquiry.

---

### 6. `groups.ts:475–488` — `listMembers` returns user emails without authorization — ✅ FIXED

```typescript
// groups.ts:479
.select({ id: users.id, name: users.name, image: users.image, email: users.email })
```

Any authenticated user can list members of ANY group and harvest all their email addresses. No membership check, no group privacy check.

- **Fix:** Either remove `email` from the projection or gate the endpoint behind a role check (e.g., only group members, board, or admin).

---

### 7. `chat.ts:160–222` — `createConversation` does not validate `participantIds` belong to tenant — ✅ FIXED

```typescript
// chat.ts:166
participantIds: z.array(z.string()),
// chat.ts:213-222
const allParticipantIds = [...new Set([ctx.userId!, ...input.participantIds])];
await db.insert(conversationParticipants).values(
  allParticipantIds.map(userId => ({
    id: crypto.randomUUID(),
    tenantId,  // ← tenantId from ctx
    conversationId,
    userId,    // ← unvalidated userId
    joinedAt: ts,
  }))
);
```

A user can add any `userId` from any tenant as a participant. While the conversation itself is tenant-scoped, this pollutes the `ConversationParticipant` table with cross-tenant user references.

- **Fix:** Verify each `participantId` exists in the current tenant before inserting: `SELECT id FROM user WHERE id IN (...) AND tenantId = $tenantId`.

---

### 8. `chat.ts:273–325` — `findOrCreateConversation` uses raw SQL with insufficient input guards — ✅ FIXED

```typescript
// chat.ts:287
AND cp."userId" IN ${sql`${input.participantIds}`}
```

While Drizzle's `sql` template tag is parameterized and safe against SQL injection, the `participantIds` array is passed directly without length or content validation beyond `z.array(z.string()).length(2)`. A malformed UUID string could cause Postgres errors that leak schema information.

- **Fix:** Add `.uuid()` refinement to the Zod schema: `z.array(z.string().uuid()).length(2)`.

---

### 9. `resources.ts:212–248` — `createResource` uses `input.visibility` without enum validation — ✅ FIXED

```typescript
// resources.ts:72
visibility: z.string().default('ALL_RESIDENTS'),
```

The `visibility` field is typed as `z.string()` with no enum constraint. An attacker could set it to an arbitrary value, bypassing the `buildVisibilityFilter` logic entirely (which checks for specific string values like `'ALL_RESIDENTS'`, `'OWNERS_ONLY'`, etc.).

- **Fix:** Change to `z.enum(['ALL_RESIDENTS', 'OWNERS_ONLY', 'COMMITTEE_ONLY', 'BOARD_ONLY'])`.

---

### 10. `dwallet.ts:255–296` — `createPayout` has no rate limit — ⏸️ DEFERRED (needs rate-limit infrastructure)

```typescript
// dwallet.ts:255 — createPayout
createPayout: protectedProcedure.input(CreatePayoutInput).mutation(...)
```

No rate limiting exists on payout creation. A malicious user could script repeated payout requests, potentially triggering excessive admin review load or automated banking workflows.

- **Fix:** Add `rateLimitByUser(ctx.userId!, { windowMs: 300_000, maxRequests: 1 })` before the payout insertion.

---

### 11. `merits.ts:276–362` & `merits.ts:445–533` — `createMerit` and `awardMerit` are nearly identical code duplication — ✅ FIXED

Both procedures contain the exact same 60+ lines of logic for point calculation, expiry, standing recalculation, notification, and audit logging. This duplication increases the attack surface and risk of divergence bugs.

- **Fix:** Extract the shared logic into a single `createMeritRecord()` helper and call it from both procedures.

---

## MEDIUM

### 12. `notifications.ts:171–183` — `markRead` "mark all" can affect unlimited records — ✅ FIXED

```typescript
// notifications.ts:171-183
// Mark all unread as read
await db
  .update(notifications)
  .set({ read: true, readAt: now })
  .where(
    and(
      isNull(notifications.deletedAt),
      eq(notifications.userId, ctx.userId!),
      eq(notifications.tenantId, ctx.tenantId!),
      eq(notifications.read, false)
    )
  );
```

No LIMIT clause. A user with millions of unread notifications could trigger a massive UPDATE that holds locks.

- **Fix:** Add a reasonable LIMIT or cap (e.g., 500) with a warning response if more exist.

---

### 13. `content.ts:164–165` — Boolean filtering via string comparison — ✅ FIXED

```typescript
// content.ts:164-165
if (input.published !== undefined) {
  conditions.push(eq(contents.published, input.published === 'true'));
}
```

The `published` input is a string (`z.string().optional()`), then compared with `=== 'true'`. Any value other than the literal string `'true'` is treated as `false`, including nonsensical values like `'banana'`. This silently produces incorrect results.

- **Fix:** Change the input schema to `z.coerce.boolean().optional()` or `z.enum(['true', 'false']).optional()`.

---

### 14. `surveys.ts:369–441` — `submitResponse` allows arbitrary answers payload — ✅ FIXED

```typescript
// surveys.ts:53-55
answers: z.record(z.unknown()),
```

The `answers` blob is stored directly with `input.answers` (line 435) with no size limit, no key validation against existing questions, and no type validation per question type. A user could inject megabytes of data into the JSONB column, causing storage bloat.

- **Fix:** Add `.refine()` to validate keys match existing question IDs, or at minimum add a size check.

---

### 15. `maintenance.ts:404–414` — Internal notes visible in error path via `isInternal` filtering — ⏸️ DEFERRED (needs schema change)

```typescript
// maintenance.ts:412-414
if (!hasPermission(ctx.role, 'requests')) {
  conditions.push(eq(requestNotes.isInternal, false));
}
```

While `isInternal` notes are correctly filtered for residents, the `listNotes` query returns the full `content` field of notes visible to the user. If an internal note ID is accidentally leaked (e.g., via logs or timing), there's no secondary enforcement at the content level.

- **Fix:** Consider a separate `internalNotes` table that never joins with the public note query, or apply `isInternal` filtering in the SELECT as an additional guard.

---

### 16. `content.ts:224–262` — `createContent` has no ownership assignment validation — ✅ FIXED

```typescript
// content.ts:239
authorId: ctx.userId!,
```

While the author is forced to the current user (good), there's no check that the user can ONLY create content for themself. Anyone with `content` or `contentOwn` permission can create content as themselves, which is fine—but `groupId: input.groupId` (line 240) is accepted without verifying the user is a member of that group.

- **Fix:** Add a group membership check before allowing content creation under a specific group.

---

### 17. Widespread — Missing rate limiting on sensitive mutations — ⏸️ DEFERRED (needs rate-limit infrastructure)

Only `disputes.ts:325` (`addDisputeMessage`) implements rate limiting. The following procedures lack any rate limiting:

| Procedure                   | Risk               |
| --------------------------- | ------------------ |
| `chat.sendMessage`          | Message spam       |
| `content.createContent`     | Content flooding   |
| `marketplace.createListing` | Listing spam       |
| `marketplace.createReview`  | Review bombing     |
| `notifications.create`      | Notification spam  |
| `surveys.submitResponse`    | Response flooding  |
| `events.registerForEvent`   | Registration abuse |
| `bookings.createBooking`    | Booking abuse      |
| `dwallet.createPayout`      | Payout abuse       |

- **Fix:** Add `rateLimitByUser()` calls to all mutation procedures, especially those exposed via OpenAPI.

---

## LOW

### 18. `index.ts:1–38` — No global rate limiter or request timeout configured at tRPC level — ⏸️ DEFERRED (needs rate-limit infrastructure)

No `maxDuration`, no global rate limiting middleware, and no request body size limits are configured on the tRPC router.

- **Fix:** Add a tRPC middleware that enforces `maxDuration` and global rate limits.

---

### 19. `chat.ts:38–81` — `listConversations.output` is enormous and will never be validated at runtime — ⏸️ DEFERRED

The `.output()` schema is 44 lines of nested Zod objects. tRPC output validation is typically disabled in production for performance. If enabled, every conversation list response is fully validated, burning CPU.

- **Fix:** Remove `.output()` schemas from query procedures (they add no security value—input validation is what matters). Keep them only for documentation purposes as JSDoc comments.

---

### 20. `content.ts:143–148` — `getContent` locale parameter has no validation against supported languages — ✅ FIXED

```typescript
// content.ts:146
locale: z.string().optional(),
```

The `locale` parameter accepts any string value. The `resolveLocale` function (line 156) may handle it gracefully, but the input should be constrained.

- **Fix:** Change to `z.enum(supportedLanguages).optional()` or `z.string().refine(val => supportedLanguages.includes(val))`.

---

### 21. `dwallet.ts:40` — `CreatePayoutInput` uses raw number without decimal validation — ✅ FIXED

```typescript
// dwallet.ts:39-41
amount: z.number().positive().min(50, 'Minimum payout is R50'),
```

The amount is later converted to string (line 279: `input.amount.toString()`). A floating-point number like `50.00000000000001` could produce an unexpected string representation.

- **Fix:** Add `.multipleOf(0.01)` to enforce valid currency amounts, or use `z.string().regex(/^\d+\.\d{2}$/)` and parse explicitly.

---

## Summary

| Severity  | Count  | Fixed  | Deferred | Key Themes                                                          |
| --------- | ------ | ------ | -------- | ------------------------------------------------------------------- |
| CRITICAL  | 4      | 4      | 0        | Cross-tenant injection, missing tenantId guards, hard deletes       |
| HIGH      | 7      | 6      | 1        | PII leakage, participant validation, visibility bypass, rate limits |
| MEDIUM    | 6      | 4      | 2        | Unbounded updates, oversized payloads, group ownership              |
| LOW       | 4      | 2      | 2        | Global limits, output schemas, locale validation, float precision   |
| **Total** | **21** | **16** | **5**    |                                                                     |

### Top 3 Immediate Fixes (all applied)

1. **`notifications.create`** — ✅ Removed `tenantId`/`userId` from input; derive from `ctx`.
2. **`events.cancelRegistration`** — ✅ Added `tenantId` to DELETE WHERE clause.
3. **`surveys.removeQuestion` / `removeSection`** — ✅ Replaced `db.delete()` with `db.update({ deletedAt: now() })`.
