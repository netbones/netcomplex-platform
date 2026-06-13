## Advisory: FSD Forbidden-Imports Remediation

The agent's plan is largely correct in intent but has a critical circular-import hazard that the agent itself identifies and then partially mis-resolves. Here's my analysis and corrected guidance.

---

### The Core FSD Rule (restate for clarity)

```
app → pages → widgets → features → entities → shared
```

- `shared` → `entities`: **FORBIDDEN**
- `entities` → `shared`: **ALLOWED**
- `features` → `entities`: **ALLOWED**

---

### Part 1: PlatformPageFlags type extraction — APPROVED as written

The plan is correct. The interface is pure data shape with no runtime dependencies, so moving it to `src/shared/lib/types/platform-page-flags.ts` is the right call. The re-export from `entities/tenant` for backward compat is clean.

One clarification: confirm `src/shared/lib/types/index.ts` exists before adding the barrel export. If it doesn't, create it with just that one export line.

---

### Part 2 & 3 (Gate files) — STOP. The agent's plan has a fatal flaw.

The agent correctly identifies the problem at the end but then doesn't fully resolve it. Here is the issue stated plainly:

**If `@api/server` (shared) re-exports anything from `@entities/tenant`, that IS a new forbidden-imports violation — it just moves the violation into the barrel instead of a direct import.** The linter will catch it.

The agent's instruction in Step 6 of Part 2 says:

> Update `src/shared/api/server/index.ts` to re-export from `@entities/tenant`

**Do not do this.** That line creates a `shared → entities` import, which is exactly what you're trying to eliminate.

---

### Correct Resolution for Parts 2 & 3

#### The actual constraint

The gate server files need:

- `db`, `tenants` — from `src/shared/api/db.ts`
- `getSessionAndRole` — from `src/shared/api/auth-utils.ts`
- `apiError`, `ERROR_CODES` — from `src/shared/api/api-response.ts`

These are all in `shared`. Since entities → shared is **allowed**, the gate files CAN live in `entities/tenant` and import these directly by deep path. This does NOT violate FSD — it's the correct direction.

#### The deep import concern

The agent worries that `import { db } from '@/shared/api/db'` is a "sidestep violation." In standard FSD, deep imports within `shared` are generally permitted because `shared` has no slice isolation rules (it's a flat layer). The `@api/server` barrel exists for convenience, not as an enforcement boundary. Importing directly from `src/shared/api/db.ts` from within `entities/tenant` is fine.

#### What to actually do

**Part 2 — Move gate files to entities:**

Move the files as the agent describes. In the moved files, use direct deep imports into shared:

```typescript
// entities/tenant/api/gate/server-gate.ts
import { db, tenants } from '@/shared/api/db';
import { getSessionAndRole } from '@/shared/api/auth-utils';
import { apiError, ERROR_CODES } from '@/shared/api/api-response';
```

These are all `entities → shared` — valid.

**Do NOT update `src/shared/api/server/index.ts` to re-export from `@entities/tenant`.** Instead, remove the gate exports from that barrel entirely, and update all consumers of those exports to import from `@entities/tenant` directly. The agent must grep for who imports `canAccess`, `resolveGateContext`, `assertModuleEnabled`, `FeatureKey`, `GateResult`, `GateContext`, `GateReason` from `@api/server`, and update each call site to use `@entities/tenant` or the new `@entities/tenant/api/gate` path.

**Part 3 — Move client gate to features/gate:**

The agent's plan is correct here. `features → entities` is allowed, so `useGateContext` and `canAccessClient` in `src/features/gate/` importing from `@entities/tenant` is valid.

The one consumer `src/shared/ui/GateGuard.tsx` importing from `@/features/gate` — **this is a new violation**: `shared → features` is forbidden. The agent missed this.

`GateGuard.tsx` must also move. It's a UI component that depends on feature-layer logic — it belongs in `src/features/gate/ui/GateGuard.tsx`, not in `shared/ui`. Any consumers of `GateGuard` that are in `widgets` or higher layers can import it from `@/features/gate` without issue.

---

### Checklist for the agent before executing

1. **Grep all consumers** of the files being moved before touching anything:

   ```bash
   grep -r "from.*shared/api/gate\|from.*shared/api/feature-gate\|from.*@api/server.*canAccess\|from.*@api/server.*assertModule" src/ --include="*.ts" --include="*.tsx"
   grep -r "from.*shared/lib/gate\|from.*@shared/lib/gate" src/ --include="*.ts" --include="*.tsx"
   grep -r "GateGuard" src/ --include="*.ts" --include="*.tsx"
   ```

2. **Do not add any `shared → entities` imports**, including inside barrel files.

3. **Move `GateGuard.tsx`** from `shared/ui` to `features/gate/ui/GateGuard.tsx`.

4. **Run typecheck before steiger** — a passing typecheck with zero steiger violations is the success condition, in that order.

5. **Check for circular imports** after moving with:
   ```bash
   pnpm madge --circular src/entities/tenant/api/gate/server-gate.ts
   ```
   if madge is available, or inspect manually.

---

### Summary of what the agent's plan gets right vs. wrong

| Item                                                            | Status               | Note                                                        |
| --------------------------------------------------------------- | -------------------- | ----------------------------------------------------------- |
| Extract PlatformPageFlags to shared/lib/types                   | ✅ Correct           | Execute as written                                          |
| Move gate server files to entities/tenant                       | ✅ Correct direction | Use direct deep imports into shared, not @api/server barrel |
| Remove gate re-exports from @api/server barrel                  | ✅ Must do           | Update call sites to import from @entities/tenant           |
| Add gate re-exports TO @api/server barrel from @entities/tenant | ❌ New violation     | Do not do this                                              |
| Move client gate to features/gate                               | ✅ Correct           | features→entities is allowed                                |
| GateGuard.tsx stays in shared/ui                                | ❌ New violation     | Move to features/gate/ui/                                   |
