Good, all four updated plans read. Here's the full diff against the previous version and any remaining issues.

---

## What's Been Fixed

All five issues from the first review are resolved:

**Property field fix (Plan 02)** — `property.name`/`address` replaced with `street`/`unit`. The formatter now correctly builds `propertyAddress` as `` `${street} ${unit}` ``. `propertyName` is gone. The `DelegationListItem` type in Plan 04 still declares `propertyName: string | null` — that field no longer exists in the API response. This is a **new mismatch** introduced by the fix — the type needs to drop `propertyName` or the API needs to put something there.

**Block and audit routes (Plan 04)** — Both `src/app/api/delegations/[id]/block/route.ts` and `src/app/api/delegations/[id]/audit/route.ts` are now in `files_modified` and fully implemented in Task 1. Clean.

**Discovery grep (Plan 03)** — The pre-execution discovery section is now explicit, with the grep command and a note about where the known callsites live. Good addition.

**ES256 upgrade (Plan 01)** — `credentialType` defaults to `jwt_es256` in the schema. T-111-03 in the threat model now correctly says "ES256 asymmetric keypair." The `must_haves` truths still say "JWT credentials" generically — fine, that's accurate.

**DelegationAction indexes** — Still not present. `@@index([delegationId])` and `@@index([tenantId])` are missing from the `DelegationAction` model. The audit endpoint queries `where: { delegationId: params.id }` and the `logDelegationAction` utility writes by `tenantId` — both will do sequential scans without these. Still the same gap as before.

---

## New Issues in These Versions

**1. `DelegationListItem.propertyName` type mismatch (Plan 04, Medium)**

As noted above: Plan 02's GET response no longer includes `propertyName` (it was removed when `property.name` was fixed), but Plan 04's `DelegationListItem` interface still declares it. The widget references `delegation.propertyName` in `PendingDelegationCard`. This will typecheck as `string | null` but always be `undefined` at runtime, showing blank where the property address should appear.

Fix: Remove `propertyName` from `DelegationListItem` and update the widget references to use `propertyAddress` instead.

**2. Unblock logic is semantically broken (Plan 04, Medium)**

The block endpoint's unblock path is:

```typescript
// Unblock: restore CONTACT_OCCUPANTS if it was part of the original grant
// We'd need the original scope — for now, re-add if it's missing
if (!currentPermissions.includes('CONTACT_OCCUPANTS')) {
  newPermissions = [...currentPermissions, 'CONTACT_OCCUPANTS'];
}
```

The comment acknowledges the problem: unblocking unconditionally re-adds `CONTACT_OCCUPANTS` even if the original delegation never granted it. A resident could unblock to _escalate_ an agent's scope beyond what the owner delegated. This is a security issue — T-111-19 claims "agent cannot widen scope via unblock beyond original grant" but the implementation contradicts that.

The fix requires persisting the original granted permissions separately from the current effective permissions. The cleanest approach is adding an `originalPermissions AgentPermission[]` field to `AgentAccess` (set at creation, never mutated), and using that as the ceiling during unblock. This is a schema change that needs to flow back into Plan 01.

**3. `credentialType: "jwt_es256"` default but signing still uses `BETTER_AUTH_SECRET` (Plan 01, High)**

The schema now defaults to `jwt_es256` and the threat model says ES256, but the `signAgentToken` call in the route handler still passes the same structure that would use `BETTER_AUTH_SECRET` (HS256) unless the implementation in `agent-token.ts` has been updated. The plan doesn't show the updated implementation of `signAgentToken` — Task 3 (which is in the truncated section) presumably contains it.

This is a critical consistency check: if `signAgentToken` still signs with HS256 but `credentialType` says `jwt_es256`, the verifier abstraction is lying about what algorithm was used. The agent must verify that `agent-token.ts` actually generates ES256 tokens using an asymmetric keypair, and that the corresponding public key env var (`AGENT_TOKEN_PUBLIC_KEY` or equivalent) is documented in `.env.example`.

**4. Widget not registered in `widgets.ts` or any Space (Plan 04, unchanged from before)**

The `DelegationWidget` is still not registered in the widget registry (`widgets.ts`). The success criteria says it "renders on resident dashboard" but there's no mechanism to put it there without a registry entry and a Space assignment. This needs either a Task 4 that adds the registry entry, or explicit documentation that registration is deferred and the widget is for direct page embedding only in Phase 111.

**5. `DelegationAction` missing `@@index` (Plan 01, unchanged)**

Still present from the first review. The audit endpoint at Plan 04 queries `DelegationAction` by `delegationId` — without an index, this is a sequential scan of the entire table. Given audit logs grow unbounded, this will degrade. Add to Plan 01's schema task:

```prisma
model DelegationAction {
  ...
  @@index([delegationId])
  @@index([tenantId])
}
```

---

## Summary Table

| Issue                                      | Plan | Severity        | Status                                                       |
| ------------------------------------------ | ---- | --------------- | ------------------------------------------------------------ |
| `property.name`/`address` field fix        | 02   | ✅ Fixed        | —                                                            |
| Block + audit routes missing               | 04   | ✅ Fixed        | —                                                            |
| Discovery grep for `resolvePageAccess`     | 03   | ✅ Fixed        | —                                                            |
| ES256 + `credentialType` field             | 01   | ✅ Fixed        | —                                                            |
| `DelegationListItem.propertyName` mismatch | 04   | 🔴 New          | Type declares field that API no longer returns               |
| Unblock escalation bug                     | 04   | 🔴 New          | Can restore `CONTACT_OCCUPANTS` beyond original grant        |
| ES256 implementation vs default mismatch   | 01   | 🟡 Unverifiable | Truncated — agent must confirm `signAgentToken` uses ES256   |
| `DelegationAction` missing indexes         | 01   | 🟡 Unchanged    | Audit queries will table-scan                                |
| Widget not registered in registry          | 04   | 🟡 Unchanged    | Widget unreachable from dashboard without explicit embedding |

The two new issues (propertyName mismatch and the unblock escalation) are the ones to resolve before execution. The escalation bug in particular touches security, and the fix requires a schema change back in Plan 01 — worth a quick decision on whether to handle it now or accept the simplified model with a code comment flagging it as a known limitation for Phase 112.
