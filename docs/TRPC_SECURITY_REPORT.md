# Security Report — 20 tRPC Router Files

**Found: 42 issues** — 7 critical, 15 high, 11 medium, 9 low.
**Status:** 16 fixed from tranche 2, 21 new from tranche 3 (b80f261f), 5 deferred.

---

## CRITICAL

### Tranche 2 (all fixed)

### 1. `notifications.ts:74–121` — Arbitrary cross-tenant/cross-user notification injection — ✅ FIXED

The `create` procedure accepts `tenantId` and `userId` from user input with zero validation against the session context.

### 2. `events.ts:349–352` — Missing `tenantId` in `cancelRegistration` DELETE WHERE clause — ✅ FIXED

No `eq(eventAttendees.tenantId, tenantId)` condition.

### 3. `maintenance.ts:362–366` — Missing `tenantId` on `updateRequest` write path — ✅ FIXED

Write WHERE clause had no tenant guard.

### 4. `surveys.ts:707–715` & `surveys.ts:915–923` — Hard DELETE instead of soft delete — ✅ FIXED

`db.delete(questions)` and `db.delete(surveySections)` replaced with `db.update({ deletedAt: now() })`.

---

### Tranche 3 (new)

### 5. `achievements.ts:320–328` & `395–421` — Cross-user data enumeration — 🔴 NEW

```typescript
// achievements.ts:320-328 — getAchievementProgress
.input(z.object({ achievementId: z.string(), userId: z.string().optional() }))
.query(async ({ input, ctx }) => {
  const targetUserId = input.userId ?? ctx.userId;
  // No authorization check — any user can view any user's progress
```

```typescript
// achievements.ts:395-421 — getUnlocked
.input(z.object({ userId: z.string().optional() }).optional())
.query(async ({ input, ctx }) => {
  const targetUserId = input?.userId ?? ctx.userId;
  // No authorization check — any user can view any user's unlocked achievements
```

- **Impact:** Any authenticated user can enumerate all other users' achievement progress and unlocked achievements. Leaks engagement data across the tenant.
- **Fix:** Remove `userId` from user-facing input or gate it behind admin/self-only check.

---

### 6. `identity.ts:1688–1702` — Cross-tenant data exposure in `getMySeat` — 🔴 NEW

```typescript
// identity.ts:1689-1699
const [solo] = await db
  .select()
  .from(soloSeats)
  .where(eq(soloSeats.userId, ctx.userId!)) // ← no tenantId
  .limit(1);

const [premium] = await db
  .select()
  .from(premiumSeats)
  .where(eq(premiumSeats.userId, ctx.userId!)) // ← no tenantId
  .limit(1);
```

- **Impact:** A user with seats in multiple tenants sees data from all tenants. If seat data contains platform addresses or linked properties, this leaks cross-tenant information.
- **Fix:** Add `eq(soloSeats.tenantId, ctx.tenantId!)` and `eq(premiumSeats.tenantId, ctx.tenantId!)` to both WHERE clauses.

---

### 7. `settings.ts:169–185` — Full tenant settings disclosure — 🔴 NEW

```typescript
// settings.ts:169-185 — getContactSettings
.query(async ({ ctx }) => {
  const rows = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
  return rows.reduce<Record<string, string>>((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
});
```

- **Impact:** Returns ALL tenant settings as a flat key-value map to any authenticated user. If settings contain webhook secrets, API keys, or internal configuration, they are fully exposed. The procedure is named "contact" settings but returns everything.
- **Fix:** Filter to only contact-related keys (e.g., prefix `contact.*`) or add a permission gate.

---

## HIGH

### Tranche 2

### 8. `marketplace.ts:455–461` — Public endpoint leaks provider email and phone — ✅ FIXED

### 9. `groups.ts:475–488` — `listMembers` returns user emails without authorization — ✅ FIXED

### 10. `chat.ts:160–222` — `createConversation` does not validate `participantIds` belong to tenant — ✅ FIXED

### 11. `chat.ts:273–325` — `findOrCreateConversation` uses raw SQL with insufficient input guards — ✅ FIXED

### 12. `resources.ts:212–248` — `createResource` uses `input.visibility` without enum validation — ✅ FIXED

### 13. `dwallet.ts:255–296` — `createPayout` has no rate limit — ⏸️ DEFERRED (needs rate-limit infrastructure)

### 14. `merits.ts:276–362` & `merits.ts:445–533` — `createMerit` and `awardMerit` code duplication — ✅ FIXED

---

### Tranche 3 (new)

### 15. `agents.ts:143` — Agent email exposed to all authenticated users — 🔴 NEW

```typescript
// agents.ts:140-144 — getMarketplaceActions (protectedProcedure)
agent: {
  id: users.id,
  name: users.name,
  email: users.email,   // ← PII exposed to any authenticated user
},
```

- **Impact:** Same PII leakage pattern as the previously-fixed `marketplace.ts:455-461`. Any authenticated user can scrape all verified agents' email addresses.
- **Fix:** Remove `email` from the projection, or gate behind admin/provider-only access.

---

### 16. `agents.ts:103` — Null reference crash in `listManagedProperties` — 🔴 NEW

```typescript
// agents.ts:103
accessExpiresAt: row.agentAccess.expiresAt.toISOString(),
```

- **Impact:** If `expiresAt` is null in the database, this throws `TypeError: Cannot read properties of null (reading 'toISOString')`, causing a 500 error for the agent.
- **Fix:** Use `row.agentAccess.expiresAt?.toISOString() ?? null` or default.

---

### 17. `content.ts:651–660` — Unbounded notification fanout in `createAnnouncement` — 🔴 NEW

```typescript
// content.ts:651-660
for (let i = 0; i < targetUsers.length; i += FANOUT_BATCH) {
  await db.insert(notifications).values(
    batch.map(user => ({
      id: crypto.randomUUID(),
      tenantId,
      userId: user.id,
      ...
    }))
  );
}
```

- **Impact:** For a tenant with 10K+ active users, this fires 20+ sequential INSERT batches inside a single tRPC request. Risks DB connection timeout, request timeout (>60s Vercel limit), and table lock contention.
- **Fix:** Add a `maxDuration` guard on the procedure, cap fanout to a reasonable maximum (e.g., 2000), or offload to a background job/queue.

---

### 18. `invitations.ts:271–347` — Public invitation accept endpoint — 🔴 NEW

```typescript
// invitations.ts:271 — acceptInvitation: publicProcedure
.mutation(async ({ input }) => {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, input.token))
```

- **Impact:** `publicProcedure` with no CSRF protection, no rate limiting, and no tenant validation. An attacker could enumerate invitation tokens or brute-force accept. Line 316 uses hardcoded `role === 'USER'` string comparison bypassing the permission model.
- **Fix:** Add CSRF token requirement, rate limiting, and use `hasPermission()` for role checks.

---

### 19. `achievements.ts:246` — Hard delete on achievement definitions — 🔴 NEW

```typescript
// achievements.ts:246
await db.delete(achievementDefinitions).where(eq(achievementDefinitions.id, input.id));
```

- **Impact:** Irreversible data loss. Unlike the rest of the system which uses soft-delete (`deletedAt = now()`), this permanently removes achievement definitions. Breaks referential integrity for existing `userAchievementProgresses` records.
- **Fix:** Change to `db.update(achievementDefinitions).set({ deletedAt: now() })`.

---

### 20. `identity.ts:1606–1615` — Hard delete on albums — 🔴 NEW

```typescript
// identity.ts:1606-1615 — deleteAlbum
await db
  .delete(albums)
  .where(
    and(
      eq(albums.id, input.id),
      eq(albums.tenantId, ctx.tenantId!),
      eq(albums.userId, ctx.userId!),
      isNull(albums.deletedAt)
    )
  );
```

- **Impact:** Irreversible data loss. The WHERE clause checks `isNull(albums.deletedAt)`, confirming soft-delete is the intended pattern, but the operation is a hard delete.
- **Fix:** Change to `db.update(albums).set({ deletedAt: now() })`.

---

### 21. `settings.ts:153–155` — Hard delete on settings — 🔴 NEW

```typescript
// settings.ts:153-155
await db.delete(settings).where(and(eq(settings.tenantId, tenantId), eq(settings.key, input.key)));
```

- **Impact:** Permanent setting removal with no audit trail beyond the audit log. If a setting is accidentally deleted, there is no recovery.
- **Fix:** Either use soft-delete, or at minimum store the old value in the audit log details (it already does this, but recovery still requires manual re-insertion).

---

### 22. `content.ts:852–904` — `JSON.parse()` crash in `getCampaignPage` — 🔴 NEW

```typescript
// content.ts:857-870
const campaignConfig = {
  linkLabel: settingsMap.campaignLinkLabel
    ? JSON.parse(settingsMap.campaignLinkLabel)  // ← can throw
    : DEFAULT_CAMPAIGN_CONFIG.linkLabel,
  pageTitle: settingsMap.campaignPageTitle
    ? JSON.parse(settingsMap.campaignPageTitle)  // ← can throw
    : DEFAULT_CAMPAIGN_CONFIG.pageTitle,
  ...
};
```

- **Impact:** Malformed JSON in the settings table causes a 500 error on the campaign page with potentially leaked error details. No try-catch wrapping.
- **Fix:** Wrap each `JSON.parse()` in try-catch and fall back to defaults on parse failure.

---

## MEDIUM

### Tranche 2

### 23. `notifications.ts:171–183` — `markRead` "mark all" can affect unlimited records — ✅ FIXED

### 24. `content.ts:164–165` — Boolean filtering via string comparison — ✅ FIXED

### 25. `surveys.ts:369–441` — `submitResponse` allows arbitrary answers payload — ✅ FIXED

### 26. `maintenance.ts:404–414` — Internal notes visible in error path — ⏸️ DEFERRED (needs schema change)

### 27. `content.ts:224–262` — `createContent` has no group membership validation — ✅ FIXED

### 28. Widespread — Missing rate limiting on sensitive mutations — ⏸️ DEFERRED (needs rate-limit infrastructure)

---

### Tranche 3 (new)

### 29. `invitations.ts:81–82, 197, 199, 204` — `as any` type casts on enum columns — 🔴 NEW

```typescript
// invitations.ts:82
conditions.push(eq(invitations.status, input.status as any));

// invitations.ts:197
residencyType: input.residencyType as any,
// invitations.ts:199
role: input.role as any,
// invitations.ts:204
status: 'PENDING' as any,
```

- **Impact:** Type-system evasion masks potential schema mismatches. If the enum values in the database change, these casts silently allow invalid values to be inserted.
- **Fix:** Use proper enum types or Zod-refined strings that match the database enum.

---

### 30. `invitations.ts:210–220` — Silent email failure — 🔴 NEW

```typescript
// invitations.ts:210-220
void sendEmail({...}).catch(() => {});
```

- **Impact:** All email delivery failures are silently swallowed. Users never receive their invitations, and no error is logged or surfaced. No audit trail exists for failed deliveries.
- **Fix:** Log the error with the component logger and return a partial-success response indicating that the invitation was created but email delivery failed.

---

### 31. `invitations.ts:201` — Hardcoded placeholder organization ID — 🔴 NEW

```typescript
// invitations.ts:201
organizationId: input.organizationId || ctx.organizationId || 'placeholder-org-id',
```

- **Impact:** Fallback `'placeholder-org-id'` will be written to the database when no real organization context exists. This creates orphan records and violates referential integrity if the column has a foreign key constraint.
- **Fix:** Make `organizationId` required from context or throw an error when it's missing instead of using a placeholder.

---

### 32. `achievements.ts:150–162` — No duplicate key check on create — 🔴 NEW

```typescript
// achievements.ts:150-162 — createAchievement
const [created] = await db
  .insert(achievementDefinitions)
  .values({ id, key: input.key, ... })
  .returning();
// No check for existing key
```

- **Impact:** Duplicate achievement keys cause unique constraint violations (if the column has a unique index) or silently create duplicate records.
- **Fix:** Add a pre-insert check for existing `key` value.

---

### 33. `surveys/external.ts:38` — Unbounded answers payload — 🔴 NEW

```typescript
// surveys/external.ts:38
answers: z.record(z.unknown()),
```

- **Impact:** Same issue as the previously-fixed internal surveys #14. An attacker can submit megabytes of data as `answers`, causing storage bloat and performance degradation.
- **Fix:** Add `.refine()` for size checking or key validation against the external survey's questions.

---

### 34. `content.ts:556–610` — Authorization mismatch on `listAnnouncements` — 🔴 NEW

```typescript
// content.ts:555 — publicProcedure
// content.ts:557 — meta says protect: true
.meta({
  openapi: { method: 'GET', path: '/announcements', protect: true, tags: ['content'] },
})
```

- **Impact:** The procedure is `publicProcedure` but the OpenAPI metadata says `protect: true`. OpenAPI-generated clients may incorrectly assume authentication is required. Runtime behavior is publicly accessible.
- **Fix:** Either change to `protectedProcedure` if announcements should require auth, or change `protect` to `false` in the meta.

---

### 35. `content.ts:621–632` — Soft-deleted resource reference not blocked — 🔴 NEW

```typescript
// content.ts:621-632
const [resource] = await db
  .select({ id: resources.id })
  .from(resources)
  .where(and(eq(resources.id, input.resourceId), eq(resources.tenantId, tenantId)))
  // ← missing isNull(resources.deletedAt)
  .limit(1);
```

- **Impact:** An announcement can reference a soft-deleted resource, creating a dangling reference that users cannot resolve.
- **Fix:** Add `isNull(resources.deletedAt)` to the WHERE clause.

---

### 36. `marketplace/checkout.ts:99–190` — Public webhook endpoint without guards — 🔴 NEW

```typescript
// checkout.ts:99 — handleWebhook: publicProcedure
.mutation(async ({ input }) => {
  const { body, signature } = input;
  ...
```

- **Impact:** This webhook endpoint is publicly accessible. While Paystack signature verification protects against forged payloads, there is no IP allowlisting, no rate limiting, and no `maxDuration` guard. A DDoS on this endpoint could exhaust serverless function concurrency.
- **Fix:** Add rate limiting, `maxDuration` on the procedure, and IP allowlisting at the infrastructure level (e.g., Vercel Firewall).

---

### 37. `marketplace/premium.ts` — Widespread raw SQL usage — 🔴 NEW

```typescript
// premium.ts:164, 194, 219, 243, 250 — all use db.execute(sql`...`)
```

- **Impact:** While all raw SQL uses parameterized `sql` tags (safe from injection), raw SQL bypasses Drizzle's type safety, schema awareness, and migration tracking. Changes to the database schema won't cause TypeScript errors in these queries.
- **Fix:** Migrate to Drizzle query builder where possible (`db.select().from().where()`).

---

## LOW

### Tranche 2

### 38. `index.ts:1–38` — No global rate limiter or request timeout configured — ⏸️ DEFERRED

### 39. `chat.ts:38–81` — Enormous `.output()` schema — ⏸️ DEFERRED

### 40. `content.ts:143–148` — `getContent` locale parameter has no validation — ✅ FIXED

### 41. `dwallet.ts:40` — `CreatePayoutInput` uses raw number without decimal validation — ✅ FIXED

---

### Tranche 3 (new)

### 42. `identity.ts:1390–1408` — Stub `getTags`/`setTags` — 🔴 NEW

```typescript
// identity.ts:1390-1392 — getTags
.query(async () => {
  return { tags: [] };  // ← stub, always empty
});

// identity.ts:1394-1408 — setTags
.mutation(async ({ input }) => {
  return { tags: input.tags };  // ← no-op, accepts input, writes nothing
});
```

- **Impact:** `setTags` accepts arbitrary string arrays and returns them as if stored. If a frontend renders these tags without sanitization, it creates a stored-XSS-like vector where user-provided strings flow through a "write" endpoint and back to the UI.
- **Fix:** Implement actual DB persistence or remove the stub until it's ready.

---

### 43. `identity.ts:1813` — `z.any()` in output schema — 🔴 NEW

```typescript
// identity.ts:1813
.output(z.object({ books: z.array(z.any()) }))
```

- **Impact:** Weakens type safety. If the `books` column type changes, this won't catch it at build time.
- **Fix:** Define a proper schema for the book type.

---

### 44. `identity.ts:1800–1834` — Hardcoded role comparison — 🔴 NEW

```typescript
// identity.ts:1817
const isOwnerOrAdmin = ctx.userId === input.userId || ctx.role === 'ADMIN';
```

- **Impact:** Bypasses the centralized permission model (`hasPermission()`). If roles are renamed or the permission model changes, this check silently breaks.
- **Fix:** Use `hasPermission(ctx.role, 'admin')`.

---

### 45. `agents.ts:19–60` — Hardcoded fake activity data — 🔴 NEW

```typescript
// agents.ts:39-59
activities: [
  { id: '1', type: 'communication', description: 'Sent monthly status report',
    propertyId: 'prop-1', propertyUnit: '101', agentName: 'John Agent', ... },
  { id: '2', type: 'maintenance', description: 'Scheduled HVAC inspection', ... },
]
```

- **Impact:** Returns fabricated data that looks real. Consumers (frontend, API clients) cannot distinguish between real and fake data. Will cause confusion when real data is finally connected.
- **Fix:** Return an empty array with a clear message that activity tracking is not yet implemented, or connect to the real data source.

---

### 46. `marketplace/premium.ts:236` — Collision-prone platform address — 🔴 NEW

```typescript
// premium.ts:235-236
const platformAddress = `${(user.name || '').toLowerCase().replace(/\s+/g, '.')}@sorialia.org`;
```

- **Impact:** Two users with the same name (e.g., "John Smith") produce the same `john.smith@sorialia.org`. `assertAddressUnique` on line 238 catches the second insertion, but the error message may confuse users.
- **Fix:** Append a random suffix or use the user ID in the address.

---

### 47. `marketplace/checkout.ts:134` — Unvalidated reference format — 🔴 NEW

```typescript
// checkout.ts:134
const bookingId = reference.replace('svc-', '');
```

- **Impact:** If a Paystack reference doesn't start with `svc-` for any reason, this incorrectly strips characters from the middle of the reference string.
- **Fix:** Validate the reference format first: `if (!reference.startsWith('svc-')) return { status: 'ignored' };`

---

## Summary

| Severity  | Count  | Fixed  | Deferred | New (Tranche 3) | Key Themes                                                                            |
| --------- | ------ | ------ | -------- | --------------- | ------------------------------------------------------------------------------------- |
| CRITICAL  | 7      | 4      | 0        | 3               | Cross-user data enumeration, cross-tenant seat exposure, full settings disclosure     |
| HIGH      | 15     | 6      | 1        | 8               | PII leakage, null crashes, unbounded fanout, hard deletes, public webhook, JSON crash |
| MEDIUM    | 11     | 4      | 2        | 5               | `as any` casts, silent failures, placeholder IDs, raw SQL, missing `notDeleted()`     |
| LOW       | 9      | 2      | 2        | 5               | Stub procedures, `z.any()` schemas, hardcoded roles, fake data, collision-prone IDs   |
| **Total** | **42** | **16** | **5**    | **21**          |                                                                                       |

---

## Top Immediate Fixes (Tranche 3)

1. **`identity.ts:1688-1702`** — Add `tenantId` filter to `getMySeat` seat queries.
2. **`settings.ts:169-185`** — Filter `getContactSettings` to contact-only keys or add admin gate.
3. **`achievements.ts:320-328, 395-421`** — Remove `userId` from user-facing input or gate behind self/admin check.
4. **`achievements.ts:246` / `identity.ts:1606` / `settings.ts:153`** — Replace hard `db.delete()` with soft-delete `db.update({ deletedAt: now() })`.
5. **`agents.ts:143`** — Remove `email` from `getMarketplaceActions` public projection.
6. **`agents.ts:103`** — Null-safe `expiresAt?.toISOString()`.
7. **`content.ts:852-904`** — Wrap `JSON.parse()` in try-catch with defaults.
8. **`content.ts:651-660`** — Cap announcement notification fanout or add `maxDuration`.
