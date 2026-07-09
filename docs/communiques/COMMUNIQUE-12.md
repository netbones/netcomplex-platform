# COMMUNIQUE-12 — Phase 124 Discovery: `tenantId: null` Is Currently Impossible (G1 Scope Expansion)

**To:** Architecture Advisors
**From:** Phase 124 discovery (defer-provisioning refactor)
**Date:** 2026-07-09
**Status:** Findings — Blocking surprise surfaced, awaiting G1 re-sizing sign-off
**References:**

- [ADVISORY-031](../advisories/ADVISORY-031.md) — Onboarding Refactor: Defer Tenant Provisioning (Option C); formal response to this communique in §10 (supersedes the ADVISORY-030 draft)
- [Phase 124 CONTEXT](../../.planning/phases/124-onboarding-defer-provisioning/124-CONTEXT.md) — Discovery Findings (2026-07-08)
- BD issue `soralia-village-bawf` (P1, GSD-escalated)

---

## 0. Purpose

ADVISORY-031 (Option C — "defer, don't reserve") assumes a verified user can sit at
`tenantId = null` **indefinitely** as a first-class, durable state — this is the load-bearing
premise of the entire refactor. Decision Gate **G1** treats "`tenantId: null` as durable state"
as a design choice to ratify.

Discovery against the live code shows it is **not** merely a design choice: `tenantId: null`
is **currently impossible**. Three independent enforcement layers actively prevent it. G1 is
therefore not a decision gate but a **migration + consumer-audit work item**, and this
materially re-sizes Phases 1 and 3.

---

## 1. The Finding — Three Layers Conspire Against Null

A null `tenantId` cannot exist today because it is blocked at three levels, each of which
must be undone:

| #   | Layer                             | Location                                                                                                                          | What it does                                                                                                  |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | **DB NOT NULL**                   | `src/db/schema/users.ts:6` — `tenantId: text('tenantId').notNull()`; Prisma `prisma/schema/schema.prisma:98` — `tenantId String`  | The column itself rejects null at the database.                                                               |
| 2   | **Required additionalField**      | `src/shared/api/auth.ts:148-153` — `required: true`, `defaultValue: tenantConfig.defaultSlug`, `input: true`                      | Better Auth treats `tenantId` as a mandatory field with a platform-slug default.                              |
| 3   | **Force-defaulting databaseHook** | `src/shared/api/auth.ts:243-260` — `user.create.before` returns `tenantId: tenant?.id ?? rawTenantId ?? tenantConfig.defaultSlug` | Even if layers 1–2 were relaxed, the create hook silently coerces every new user to the platform tenant slug. |

Net effect: **every** user is stamped with a tenant at creation. There is no code path,
today, that produces a verified identity with no tenant. Option C's "durable null" landing
state does not exist in the schema, the auth config, or the write path.

---

## 2. What G1 Actually Requires

To make `tenantId: null` a real, durable state, G1 must deliver — in order:

1. **Nullable-column migration** — Prisma `tenantId String` → `String?`, then regenerate the
   Drizzle schema (`users.ts` `.notNull()` dropped). This is a schema migration, not a config
   flag.
2. **`required: false`** on the `tenantId` additionalField (`auth.ts:148-153`) and removal of
   the `defaultValue: tenantConfig.defaultSlug`.
3. **Remove the hook fallback** — the `?? tenantConfig.defaultSlug` (and likely the whole
   `user.create.before` tenant-stamping) in `auth.ts:243-260`, so a signup with no tenant
   stays null rather than being coerced to the platform slug.
4. **Consumer audit** — every reader/writer that assumes `tenantId` is non-null must be found
   and hardened for the null case. The Drizzle/Prisma column is referenced across a large
   surface (hundreds of `.tenantId` references in `src/`), so this is a non-trivial sweep, not
   a spot fix. Key suspects: `withTenant()` resolution, session shaping, any `WHERE tenantId =`
   query, dashboard tenant guards, and RLS GUC assumptions.

Only step 1 is a migration; steps 2–4 are code changes, and step 4 is the unbounded one.

---

## 3. Impact on Phase Sizing

- **Phase 1 (identity-only sign-up):** ADVISORY-031 framed Phase 1 as "use standard Better Auth
  sign-up, don't touch tenant." That is only true **after** layers 2–3 are removed. As written,
  standard sign-up still force-stamps `defaultSlug`. Phase 1 now carries the auth-config half of
  G1 (steps 2–3) or must explicitly declare it depends on G1 landing first.
- **Phase 3 (post-verification null landing):** This phase is **hard-blocked** on G1. Its entire
  premise — a `/home` platform-plane landing for a `tenantId = null` user — cannot be built or
  tested until the nullable migration (step 1) and the consumer audit (step 4) are complete. The
  audit, not the migration, is the schedule risk: a missed non-null assumption is a production
  crash for exactly the new "verified, no community yet" cohort Option C introduces.

Recommendation: **re-classify G1 from "decision gate" to "migration work item"** and budget the
consumer audit as its own sub-task with an explicit inventory pass before Phase 3 planning. The
"defer, don't reserve" direction (G0) is unaffected and remains correct — this finding only
changes the cost of realizing it.

---

## 4. Open Questions for Advisors

1. **Migration placement** — Should the nullable-column migration + auth-config change ship as a
   standalone pre-req (its own phase/plan) ahead of Phase 1, or fold into Phase 1's first plan?
2. **Hook removal vs. relaxation** — Do we remove `user.create.before` tenant-stamping entirely,
   or keep it as a conditional (stamp only when a tenant is explicitly supplied via header)?
   The header path (`x-tenant-slug`) still matters for tenant-scoped invited-user signups.
3. **Audit acceptance bar** — What is "done" for the consumer audit? Compile-clean under a
   `tenantId: string | null` type, plus a runtime smoke of the null-tenant `/home` path? Or a
   full grep-and-review of every `.tenantId` reader?

---

## 5. Evidence (verified 2026-07-09 on `dev`)

```
src/db/schema/users.ts:6          tenantId: text('tenantId').notNull()
prisma/schema/schema.prisma:98    tenantId  String            // NOT NULL — no `?`
src/shared/api/auth.ts:148-153    tenantId additionalField: required: true,
                                    defaultValue: tenantConfig.defaultSlug, input: true
src/shared/api/auth.ts:243-260    databaseHooks.user.create.before →
                                    tenantId: tenant?.id ?? rawTenantId ?? tenantConfig.defaultSlug
```
