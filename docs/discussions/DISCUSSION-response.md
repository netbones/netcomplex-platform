---

## ADVISORY: Server-Only Barrel Conflict — FSD Architecture Decision

**Context:** Phase 44 FSD enforcement surfaced a real architectural fault: entity slices mix server-only and client-safe exports in a shared barrel, causing client-bundle crashes. The immediate fix (deep imports + ESLint exception) works but violates the FSD public API contract.

---

### On the Three Options

**Option A (Status Quo + Exceptions)** is not a viable long-term position. You've accurately identified the failure mode: the ESLint/Steiger allow list grows with every new server-only module, and the "public API" for a slice is now implicitly split between the barrel and undocumented deep paths. New developers cannot discover where to import from. This will decay further as more entity functions are added.

**Option C (Move to `src/server/entities/`)** is architecturally cleanest in principle but wrong for your codebase. Your entity slices contain domain logic — validation schemas, constants, type definitions, service functions — that is genuinely entity-layer concern, not server-infrastructure concern. Relocating `withTenant` or `getCurrentTenant` to `src/server/` conflates _execution context_ (server-only) with _architectural layer_ (infrastructure). The `src/server/` directory is already established for tRPC routers and OpenAPI generation, which are infrastructure concerns. Polluting it with entity-domain functions would blur that boundary more than the current problem does.

**Option B (`server.ts` sub-barrel) is correct**, but the document undersells _why_ it's correct and slightly misframes the precedent.

---

### Why Option B Is Right

The key insight the document hints at but doesn't state directly: **the `server-only` package is a build-time execution-context marker, not an FSD layer violation.** A `server.ts` sub-barrel within an entity slice is not a second public API — it is the _same_ public API segmented by _consumption context_. This is a well-established pattern:

- Your codebase already does this at the `@api` level: `@api/server`, `@api/client`, `@api/shared` in the Steiger allow list (line 74 quoted in the doc)
- Next.js itself encourages this: `react-query` vs server fetching is the same client/server split at the data layer
- The `package.json` `exports` field pattern (your Q3 below) uses `"." `, `"./server"`, `"./client"` — identical mental model

The FSD principle being preserved is: **consumers of an entity slice always import from a public API barrel, never from internal slice files.** A `server.ts` barrel satisfies this. A deep import to `@entities/tenant/api/with-tenant` does not.

---

### Answering Your Four Questions

**Q1: Is Option B the correct long-term architectural choice?**

Yes. One clarification on scope though: not every entity slice needs a `server.ts` barrel immediately. The slices that actually have server-only exports are `tenant`, `content`, `maintenance`, `event`, `booking` (per the document). Start there. The pattern should be adopted on-demand as slices acquire server-only code — not pre-emptively stamped across all 12 entity slices.

The refactor of ~105 files is mechanical. A single `sed`/`grep-replace` pass changes `@entities/tenant/api/with-tenant` → `@entities/tenant/server` per slice. This is lower risk than it sounds.

**Q2: Should `server.ts` extend to `@features/*` and `@widgets/*`?**

Features: **yes, same rule applies.** Features that contain server actions or server-side hooks (e.g., `features/auth` likely has server-side session logic) should follow the same pattern if they mix server-only and client-safe exports in their barrel.

Widgets: **no, with high confidence.** Widget slices (`@widgets/dashboard`, `@widgets/maintenance`, etc.) are UI-layer — they are consumers of entity and feature slices, not providers of server-only logic. If a widget needs server-only data, it should receive it via props from a Server Component parent, not import server-only modules directly. If you find a widget barrel containing server-only exports, that's a deeper FSD violation (wrong layer) rather than a barrel segmentation problem.

**Q3: Next.js `"use server"` directives or `package.json` exports field?**

`"use server"` doesn't help here. It marks _functions_ for server action invocation (POST requests from the client), which is a different mechanism entirely. It doesn't prevent a server-only module from being bundled on the client — that's `import 'server-only'`'s job.

The `package.json` `exports` field splitting is not applicable to your internal monorepo structure. You're not publishing packages. The Steiger/ESLint allow list is your equivalent mechanism and it's appropriate for your scale.

**Q4: Should modules importing `@api/db` be prohibited from shared barrels as a general rule?**

Yes — and this is worth making an explicit architectural principle rather than an emergent constraint. I'd frame it as:

> **Any module that imports from `@api/db`, `next/headers`, `next/cache`, or `server-only` must not be re-exported from a slice's default barrel (`index.ts`). It must instead be re-exported from a `server.ts` sub-barrel.**

This rule is statically enforceable. You can add a Steiger custom rule or ESLint lint rule that detects `index.ts` barrel files importing any of those four sources and flags it. This closes the category of failure permanently rather than requiring per-module discipline.

---

### Implementation Recommendation

Phase this as follows:

**Phase 1 — Formalize the pattern (low risk, high value):**

1. Add `server.ts` to the five affected slices (`tenant`, `content`, `maintenance`, `event`, `booking`). Move the server-only re-exports from the patched ESLint exception list into these barrels.
2. Update Steiger allow list: `@entities/*/server` (wildcard, same pattern as `@api/server`).
3. Do the mechanical file replacement across the ~105 files.
4. Write ADR-024: "Entity slices with server-only exports use `server.ts` sub-barrels."

**Phase 2 — Enforcement (close the category):** 5. Add a lint rule (custom ESLint or Steiger) that prohibits `index.ts` barrel files from directly or transitively importing `server-only`, `next/headers`, `next/cache`, or `@api/db`. This turns a discipline convention into a CI gate. 6. Remove the ESLint `no-restricted-imports` band-aid exceptions added during the Phase 44 emergency fix.

**Do not do** a pre-emptive `server.ts` across all 12 entity slices. Only create `server.ts` when a slice has server-only exports that need to be consumed externally. Empty `server.ts` files are noise.

---

### One Risk to Flag

The document mentions the ~105 file blast radius but doesn't distinguish between files that import server-only exports and files that import client-safe exports via deep paths for other reasons (e.g., the i18n sidestep in BD issue `de8x`). Before the Phase 1 refactor, the agent should grep to confirm all ~105 files are actually importing server-only symbols, not a mix. Some of those deep imports may be pre-existing FSD violations of a different kind that shouldn't be silently absorbed into the `server.ts` pattern.
