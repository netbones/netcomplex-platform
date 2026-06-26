**High-Level Architecture Review: Phase 110 (Page & Navigation Access Control)**

**Status:** Solid foundation with good momentum. This is a **high-value consolidation** that directly addresses long-standing technical debt (scattered role/flag/provider checks).

### 1. Overall Assessment

**Strengths**

- Excellent alignment with **Phase 41 (Feature Gate Consolidation)** and the **Agent Gateway** future direction.
- Establishes a **single source of truth** (`/api/access`) for "Can this caller see this page/space?" — exactly what we need for multi-tenant + future AI agents.
- Leverages existing patterns (Phase 41 gate resolver, `withTenant`, `apiSuccess`/`apiError`, provider-platform helpers).
- Clean separation: **Server** (authoritative resolution) vs **Client** (cached consumption via TanStack Query).
- Pure `filterSpaces()` refactor is elegant and removes auth logic from UI layer.

**Risk Level:** Medium-Low (mostly execution risk).

### 2. Architectural Alignment

**Good**

- Follows **FSD** (`entities/access/` is perfect).
- Respects **multi-tenant** (`withTenant()` + tenant-scoped queries).
- Prepares **Agent Gateway** extension point cleanly (D-08/D-09).
- Uses **existing barrels** and utilities — minimal new surface area.
- ISR-friendly caching strategy on the endpoint.

**Areas to Strengthen**

- **Cache Invalidation Strategy**: The plan mentions `access:{userId}` tag but doesn't implement revalidation triggers yet. We should explicitly plan triggers for:
  - Role changes
  - Provider record creation/deletion
  - Suspension toggles
  - Feature flag changes (via Vercel flags + webhook or polling)

- **Performance**: `/api/access` will be called on every dashboard load and potentially by multiple widgets. The 30s `max-age` + TanStack `staleTime: 0` is reasonable but consider making `staleTime` configurable or using `keepPreviousData`.

### 3. Specific Feedback on Plans

**Plan 01 (Server) — Strong**

- 5-layer pipeline is clear and maintainable.
- `providerRecordExists` gating (D-04) is the correct semantic shift away from role string checks.
- Agent stub is appropriately minimal.
- `requireNotSuspended` + `getProviderRecordForUser` reuse is excellent.

**Suggestions**:

- Add a small integration test (or e2e) for the full pipeline.
- Consider adding `lastResolvedAt` or ETag to the response for aggressive client caching.
- Document the `AccessContext` shape in `types.ts` with JSDoc for future agent consumers.

**Plan 02 (Client) — Good but needs minor polish**

- `usePageAccess()` follows established hook patterns (`usePageFlags`, `useGateContext`).
- `filterSpaces()` pure function is the right evolution.

**Suggestions**:

- In `usePageAccess`, prefer `queryKey: ['pageAccess', session?.user?.id ?? 'anonymous']` to avoid undefined key warnings.
- Consider adding a `useVisibleSpaces()` convenience wrapper that combines `usePageAccess` + `filterSpaces` + memoization — many widgets will want this.
- Ensure loading state in `SpaceChrome`/`MobileSpaceBar` doesn't flash empty nav (existing skeleton patterns should cover this).

### 4. Recommendations / Adjustments

1. **Add to Phase 110-01**:
   - Export `AccessResolution` type clearly.
   - Include a comment block in `/api/access/route.ts` explaining revalidation triggers for future phases.

2. **Phase 110-02**:
   - After wiring nav, do a quick grep for remaining `normalizedRole === 'PROVIDER'` or `hasPermission('providers')` in dashboard-related files and migrate any stragglers.
   - Consider deprecating the old `getVisibleSpaces(role, flags)` shim more aggressively (add `@deprecated` JSDoc + console.warn in dev).

3. **Follow-up Tasks (Phase 111?)**:
   - Migrate remaining page-level guards to `usePageAccess()` or server `resolvePageAccess()`.
   - Implement cache revalidation on role/provider/suspension changes (via `revalidateTag`).
   - Add basic agent token shape validation (even if full auth is deferred).

4. **General**:
   - Ensure `PageAccess` type is added to OpenAPI spec generation (Plan 01 endpoint already has `.meta({ openapi })` potential).
   - Monitor bundle impact of new entity (should be negligible).

### 5. Verdict

**Approve with minor refinements.** This phase will significantly improve maintainability, security consistency, and future extensibility (especially for agents and provider platform).

The plans are well-structured, respect our architectural principles (FSD, single source of truth, defense-in-depth), and directly advance the **centralized access control** vision.

**Next Steps Recommendation**:

- Proceed with Plan 01 execution.
- Run the human verification checkpoint in Plan 02 thoroughly (especially PROVIDER role with/without record).
- After both plans land, create a quick **ACCESS-OVERVIEW.md** in `docs/architecture/` summarizing the new contract.

This is high-quality work — keep this level of rigor. Let me know if you want me to review specific files post-implementation or help refine the cache invalidation strategy.
