# Multi-Tenant Feature Gating Investigation Report — Soralia Village / NetComplex

0. Executive Summary
   CONTEXT_MAP.md describes three gating systems, but the actual codebase contains at least seven overlapping gating surfaces, three parallel tier vocabularies, two functions named assertModuleEnabled (with different signatures), two functions named useGateContext (with different signatures), two functions named getTierLevel (returning different types), and a unified 5-layer gate (canAccess in gate.ts) that has zero production call sites — it is exercised only by its own unit tests. The system actually relied on in production is the loose assertModuleEnabled(moduleKey) wrapper at src/entities/tenant/api/gate/feature-gate.ts:19, which hits the DB three-to-four times per call and is not cached.

1. The Three (Actually Seven) Gating Surfaces

A. FeatureRegistry (TierGuard backing) — src/entities/tenant/api/features/registry.ts

- Responsibility: tier-vs-feature-key check. Pure in-memory FEATURE_REGISTRY (27 page entries + 12 feature.\* entries) and WIDGET_REGISTRY (~25 widgets).- Public surface: hasFeature(featureKey, tenantTier, featureFlags?) (L522), canAccessPage(pageKey, tenantTier, featureFlags?) (L558), canUseWidget(widgetKey, tenantTier) (L566), isFeatureEnabled(tenant, key) (L584), getEnabledFeaturesForTenant (L575), getFeaturesForTier/getPagesForTier/getWidgetsForTier.
- Cost: Synchronous, zero DB. Reads tenant.subscriptionTier + tenant.featureFlags from a pre-loaded Tenant object.
- Test coverage: None direct. Indirectly covered by gate.test.ts Section 1 (mapping table completeness) and features/gate/**tests**/feature-gate-client.test.tsx (client mirror).

B. Module Gate — src/entities/tenant/lib/modules/assert-module-enabled.ts

- Responsibility: tenant-tier-vs-platform-module + explicit tenant_modules override. DB-backed.
- Public surface (barrel lib/modules/index.ts): - isModuleEnabled(tenantId, moduleKey): Promise<boolean> (L34) — 3 sequential DB queries:

1. platform_modules row (L36-46) — defines minTier/defaultEnabled
2. tenants row (L49) — fetch tier
3. tenant_modules row (L64-68) — explicit override

- assertModuleEnabled(tenantId, moduleKey): Promise<void> (L83) — throws Error("Module "${moduleKey}" is not enabled for this tenant") - getEnabledModules(tenantId): Promise<string[]> (L95) — N×3 DB queries (one tenant_modules query per platform module).
- Cost: Every call = 3 round-trips unconditionally (no caching). Tenant row is re-fetched on every call even though caller may already hold it.
- Test coverage: NONE. No \*.test.ts exists under src/entities/tenant/lib/modules/. The whole module-enforcement core is uncovered.

C. PlatformPageFlags — src/entities/tenant/api/flags/platform-flags.ts

- Responsibility: per-tenant boolean/string/enum settings stored in the settings table, surfaced as a PlatformPageFlags object (24 keys, src/shared/lib/types/platform-page-flags.ts:19).- Public surface:
- getPlatformPageFlags(tenantId): Promise<PlatformPageFlags> (L66) — unstable_cache 300s, tag CACHE_TAGS.SETTINGS.
- getPlatformPageFlagsWithTx(tx, tenantId) (L116) — uncached transaction variant.
- setPlatformPageFlag/setPlatformPageFlagWithTx (L80, L129) — writers.
- mapFlagToSettingKey (L166).
- Cost: One settings SELECT per call; warm cache = zero DB. Cache is invalidated via revalidateTag('settings') on writes.
- Test coverage: src/entities/tenant/**tests**/platform-flags.test.ts and src/db/**tests**/schema.test.ts:89-115 — verifies the shape and a couple of merges, but no mutation tests.

D. The "Unified" 5-Layer Gate — src/entities/tenant/api/gate/gate.ts

- Responsibility: declared as the single entry point that canonicalises A+B+C. Layers: Role → Tier → Module → PageFlag → FeatureToggle.- Public surface: canAccess(ctx, feature, opts?) (L119), resolveGateContext(tenantId, request?) (L95), plus re-exports of FEATURE_TO_MODULE/FEATURE_TO_FLAG/FEATURE_TO_REGISTRY/GATE_REASON_TO_ERROR and the types from mappings.ts.
- Cost: When ctx is pre-resolved: 3 (via isModuleEnabled) + 1 (cached getPlatformPageFlags) = up to 4 DB round-trips per feature check. If resolveGateContext is also called: +1 (tenants) +1 (session DB lookup) = up to 6 DB round-trips.
- Test coverage: gate.test.ts (475 lines) covers mapping completeness, short-circuit order, skipFlag, tri-state flags, and three resolveGateContext scenarios.
- CRITICAL: NO production callers. rg "canAccess\(" in src/app returns nothing. rg for useCanAccess/canAccessClient shows them only in features/gate. The "canonical" gate is dead code in production.

E. Client-side Gate Mirror — src/features/gate/model/gate.ts

- Responsibility: client-side canAccess analog. Layers 0, 3, 4 only (Role, PageFlag, FeatureToggle). Tier & Module are server-only — documented as "Q1=A locked decision" (header comment).
- Public surface: canAccessClient(ctx, feature, opts?, agentScope?) (L89), useGateContext() (L54) — returns ClientGateContext | null, useCanAccess(feature, opts?) (L146).
- Wiring: pulls flags via usePageFlags() → /api/flags (which calls getPlatformPageFlagsWithTx inside a transaction, src/app/api/flags/route.ts:22).
- Test coverage: features/gate/**tests**/feature-gate-client.test.tsx (276+ lines) — solid.
- Used by: Header.tsx, Footer.tsx, MobileSpaceBar.tsx, SpaceChrome.tsx, GateGuard, ModuleGateWall.

F. Access Resolver (D-03 pipeline) — src/entities/access/resolver.ts

- Responsibility: full page/space/features/agent resolution. Also a "5-layer" pipeline but with completely different layer semantics than gate.ts: Role → Record-existence → Suspension → Feature-flags-spaces → Agent-token.
- Public surface: resolvePageAccess(ctx, input) (L87), resolveAgentScope(rawToken, tenantId, flags) (L252). Internally uses PlatformPageFlags and ROLE_PERMISSIONS.
- Cost: Depends on caller. Layer 4 (agent) adds DB hits for agent_accesses/users/platform_suspensions lookups.
- Test coverage: src/entities/access/resolver.test.ts (matches seen at L18, L34, L229).
- Used by: ONLY src/app/api/access/route.ts:174. Not composed with the other gates.

G. Statsig/Vercel Experiment Flags — src/entities/tenant/api/flags/statsig-flags.ts

- Responsibility: A/B/experiment flags. Currently a stub returning false for 6 fixed keys (newDashboard, chatV2, newBookingFlow, customBrandingV2, premiumGardenFeatures, adminAnalyticsPlus).
- Cost: In-memory. No adapter wired.
- Test coverage: None.
- Used by: None (search returns no consumers).

## 2. Where They Overlap (Same Caller, Multiple Gates)

Site Gates touched Notes
src/app/api/marketplace/checkout/route.ts:64 PlatformPageFlags only Calls getPlatformPageFlags(tenantId) for the PayPal flag (marketplacePaypal).
src/app/api/access/route.ts:158 PlatformPageFlags (via resolvePageAccess) Does NOT use module gate or FeatureRegistry.
src/app/api/gate/context/route.ts:21 Module Gate (loop over every module) Calls isModuleEnabled once per platform module — N×3 DB hits.
src/server/routers/content.ts:1058 Module Gate only isModuleEnabled(tenantId, 'conservation'). tRPC router path.
src/app/api/bookings/route.ts:75 etc. Module Gate only (assertModuleEnabled) 30+ route handlers.
src/app/bookings/page.tsx:21 FeatureRegistry (isFeatureEnabled(tenant, 'page.bookings')) Client/server page-level guard.
src/shared/ui/Header.tsx:263 + Footer.tsx:15 + MobileSpaceBar.tsx + SpaceChrome.tsx Client Gate (useGateContext) — Layer 3 (flags) + Layer 4 (registry) Client mirror only.
src/entities/access/resolver.ts (Layer 3) PlatformPageFlags only Reads 17 page flag keys (PAGE_FLAG_KEYS, L52-70) — duplicates the loyalty of the gate.ts FEATURE_TO_FLAG table.

A genuine single-caller-multi-gate combination (e.g., a handler running both isModuleEnabled and getPlatformPageFlags) does not occur in production today — because the unified canAccess gate that would combine them is unused.

## 3. Where They Diverge (Semantically Different but Functionally Similar)

3a. Two assertModuleEnabled functions, same name, incompatible signatures
Location Signature Return Callers
src/entities/tenant/lib/modules/assert-module-enabled.ts:83 assertModuleEnabled(tenantId, moduleKey): Promise<void> Throws Error Zero (re-exported via lib/modules/index.ts:5 but never imported by app code)
src/entities/tenant/api/gate/feature-gate.ts:19 assertModuleEnabled(moduleKey): Promise<NextResponse | null> NextResponse or null ~30 route handlers (bookings, competitions, providers, settings, community-services, conservation …)
The server barrel index.server.ts:41 deliberately re-exports the response-returning one, masking the throwing one. Both being named assertModuleEnabled is a footgun: a developer who reaches for lib/modules gets a different contract.

3b. Two useGateContext hooks, same name, incompatible signatures

Location Signature Return
src/features/gate/model/gate.ts:54 useGateContext(): ClientGateContext | null Resolves role+flags via Better Auth + /api/flags.
src/entities/tenant/model/useGateContext.ts:3 useGateContext(moduleKey: string): boolean Looks up a single boolean from the Zustand gate-context-store hydrated by /api/gate/context.
A grep for bare useGateContext( does not disambiguate. Both are imported across features/ and entities/ and they answer different questions.

3c. Two getTierLevel functions, same name, different types
Location Argument
src/entities/tenant/api/features/registry.ts:516 tier: string ('core'/'foundation'/'pro-max')
src/entities/tenant/lib/modules/require-module.ts:29 tier: TenantTier ('STANDARD'/'PREMIUM'/'ENTERPRISE')

3d. Three parallel tier vocabularies

The codebase carries two distinct tier namespaces:

- DB TenantTier = STANDARD | PREMIUM | ENTERPRISE (used by tenants.tier column, lib/modules/assert-module-enabled.ts:20, require-module.ts:20).
- TierLevel = core | foundation | pro-max (used by FEATURE_REGISTRY/WIDGET_REGISTRY/TIERS and gate.ts).
- Conversion maps are duplicated: gate.ts:55-65 (TENANT_TIER_TO_LEVEL + TIER_LEVEL_ORDER) and lib/modules/assert-module-enabled.ts:20 (TIER_LEVELS) and require-module.ts:20 (TIER_ORDER). Three identical 3-entry lookup maps for a 3-row domain.

3e. Two "Layer 0–4" pipelines with different layer meanings

- gate.ts layers: 0=Role, 1=Tier, 2=Module, 3=PageFlag, 4=FeatureToggle.
- resolver.ts layers: 0=Role, 1=Record-existence, 2=Suspension, 3=Feature-flags-spaces, 4=Agent-token.
  Same numbering scheme, completely different semantics. A reader has to context-switch to interpret "Layer 4".

3f. Module-key vocabulary mismatch

- Static MODULES constant (src/shared/lib/constants/tiers.ts:51) lists 19 keys: directory, news, events, groups, chat, resources, conservation, adminBasic, adminIntermediate, bookings, surveys, marketplace, externalSurveys, maintenance, property, agentGateway, analytics, education, adminAdvanced.
- Route handlers call assertModuleEnabled('competitions' | 'providers' | 'settings' | 'community_services' | 'dWallet') — keys NOT in the ModuleKey union type and NOT in the static MODULES catalog. They exist only as rows in platform_modules.
- gate.ts:75-77 builds MODULES_REQUIRED_TIER from Object.entries(MODULES), so feeding a runtime 'competitions' module key through canAccess would silently fail (MODULES_REQUIRED_TIER['competitions'] is undefined). This is invisible today because canAccess is unused — but it is a latent defect.

3g. FeatureKey catalogue mismatch (gate mapping tables)
mappings.ts declares 15 FeatureKey values (L16-31). FEATURE_TO_MODULE (L50-66) has 14 entries (competitions → null and dashboard → null). FEATURE_TO_FLAG has 15 entries (all 15 features map to a flag). FEATURE_TO_REGISTRY has 15. The test at gate.test.ts:132-147 constructs ALL_FEATURE_KEYS with 14 entries — omitting dWallet — then asserts cross-table consistency. The assertion passes vacuously because dWallet is checked only against the table that has it (FEATURE_TO_FLAG/FEATURE_TO_REGISTRY) — the test never lists the key dWallet explicitly in ALL_FEATURE_KEYS. (L213-234: comments say "should have exactly 15 entries" but the FeatureKey array only enumerates 14.)

## 4. Read-Time Cost Summary

Surface DB round-trips per call Cached?
hasFeature / canAccessPage / canUseWidget 0 n/a (in-memory)
isModuleEnabled(tenantId, moduleKey) 3 (platform_modules + tenants + tenant_modules) No
assertModuleEnabled (feature-gate) withTenant() (≥1) + isModuleEnabled (3) ≈ 4 No
getEnabledModules(tenantId) 1 + N×3 No
getPlatformPageFlags(tenantId) 1 (warm cache: 0) 300s unstable_cache, SETTINGS tag
getPlatformPageFlagsWithTx 1 No
resolveGateContext 1 (tenants) + 1 (getSessionAndRole) ≈ 2 No
canAccess (full 5-layer, ctx pre-resolved) 3 + 1 = up to 4 Mixed (3 uncached, 1 cached)
resolvePageAccess flags (cached) + agent (1-3 DB) Mixed
/api/gate/context (loop over all modules) 1 + N×3 ≈ 58 for 19 modules No

## 5. Interface a Feature Author Must Learn

Minimum surface for a feature author to ship a gated route + UI component:
Server:

1.  assertModuleEnabled(moduleKey: string) — returns NextResponse | null (NOT the throwing one of the same name).
2.  isModuleEnabled(tenantId, moduleKey) — boolean. 3 DB hits.
3.  getEnabledModules(tenantId) — string[].
4.  getPlatformPageFlags(tenantId) / getPlatformPageFlagsWithTx(tx, tenantId) — returns full flags object.
5.  setPlatformPageFlag / setPlatformPageFlagWithTx — writes.
6.  hasFeature(featureKey, tier, featureFlags?), canAccessPage, canUseWidget, isFeatureEnabled, getEnabledFeaturesForTenant. All pure.
7.  getTenantModule(tenantId, moduleKey) — raw row lookup.
8.  resolvePageAccess(ctx, input) — full space/agent pipeline.
9.  canAccess(ctx, feature, opts?) + resolveGateContext — declared canonical but unused by routes.
10. Four mapping tables: FEATURE_TO_MODULE, FEATURE_TO_FLAG, FEATURE_TO_REGISTRY, plus the ModuleKey union, the FeatureKey union, the PlatformPageFlags keys.
    Client:
11. useGateContext() (features/gate variant — ClientGateContext | null).
12. useGateContext(moduleKey) (entities/tenant variant — boolean).
13. useCanAccess(feature, opts?).
14. canAccessClient(ctx, feature, opts?, agentScope?).
15. usePageFlags() — raw flags hook.
16. TierGuard component (page/feature/widget/tier/featureFlags).
17. GateGuard, ModuleGateWall (features/gate/ui).
    Tier enums:
18. TenantTier (STANDARD/PREMIUM/ENTERPRISE).
19. TierLevel (core/foundation/pro-max).
20. The implicit conversion map.
    Total: ~20 distinct entry points across at least 4 distinct files, three mapping tables, two tier enums, two name collisions (assertModuleEnabled, useGateContext, getTierLevel), and implicit defaults spread across settings-defs.ts, tiers.ts, and the DB platform_modules/tenant_modules rows.

## 6. Concrete Bottlenecks / Risks

1. /api/gate/context/route.ts:17-22 is the worst case — selects all platform_modules rows, then loops calling isModuleEnabled once per row. For ~19 modules this is 1 + 19×3 = 58 sequential DB round-trips per request. It powers the client gate-context-store Zustand hydration that drives ModuleGateWall and the second useGateContext.

2. Every assertModuleEnabled call repeats withTenant() and re-fetches the tenant row inside isModuleEnabled. A route that gates multiple operations (e.g., GET + POST in bookings/route.ts at L75 and L135) calls the gate twice = ~8 DB hits just for gating.

3. isModuleEnabled has no caching layer. By contrast, getPlatformPageFlags is wrapped in unstable_cache. The systems are inconsistent about caching.

4. canAccess (gate.ts) is dead code in production — the canonical unified entry point is only exercised by its own tests. The drift between its module-key assumptions (MODULES_REQUIRED_TIER from static MODULES) and what routes actually assert ('competitions', 'providers', 'settings', 'community_services') is invisible — a latent bug if anyone ever adopts canAccess.

5. Naming collisions (assertModuleEnabled, useGateContext, getTierLevel) will silently produce wrong behaviour if an author imports from the wrong barrel (@entities/tenant/server vs @entities/tenant/lib/modules). The throwing assertModuleEnabled and the NextResponse-returning assertModuleEnabled differ by both arity and return type.

6. statsig-flags.ts declares a dedupe-based identity provider but getStatsigExperimentFlags() ignores it entirely and returns hardcoded false. No adapter, no consumers. Effectively dead but typed as if real.

7. Triple mapping for services — FEATURE_TO_MODULE.services = 'marketplace', FEATURE_TO_FLAG.services = 'services', FEATURE_TO_REGISTRY.services = 'page.marketplace'. Three names for one logical surface.

8. messages gated by module chat AND registry page.chat — FEATURE_TO_MODULE.messages = 'chat' and FEATURE_TO_REGISTRY.messages = 'page.chat'. In canAccess both Layer 2 and Layer 4 run for messages — they are functionally the same logical gate expressed in two vocabularies. A divergence in either catalog (e.g. disabling chat module but leaving page.chat registry on) produces a non-orthogonal denial reason.

9. competitions is externally gated by assertModuleEnabled('competitions') in competitions/route.ts:142 but in the canonical gate's mapping table FEATURE_TO_MODULE.competitions = null, meaning canAccess(ctx, 'competitions') would skip the module layer entirely. The two systems disagree about whether competitions is module-gated.

10. AccessContext.flags vs GateContext.tier — resolvePageAccess operates entirely on flags (Layer 3 of resolver) and never consults MODULES_REQUIRED_TIER. It also doesn't consult isModuleEnabled. So /api/access can return a space as visible while assertModuleEnabled blocks the underlying route — clients see UI for a feature whose API is 403'd.

## 7. Double / Inverse Gating

Feature Gate A says Gate B says Risk
messages Module chat (gate.ts Layer 2) Registry page.chat (Layer 4) Same gate twice under different names — divergence produces ambiguous denial reason.
services Module marketplace Flag services AND registry page.marketplace Triple gating; disabling marketplace module does not clear the services flag.
competitions FEATURE_TO_MODULE.competitions = null (skips module in canAccess) Route handlers gate via assertModuleEnabled('competitions') Inverted gating: canonical gate says "no module check", production routes say "module required".
dashboard FEATURE_TO_MODULE.dashboard = null, FEATURE_TO_REGISTRY.dashboard = null (free pass in canAccess) Flag dashboard exists and is read in HEADER_LINK_IDS, WORKSPACE_ITEMS, PAGE_FLAG_KEYS (resolver) The feature passes the canonical gate regardless of flag, but the access resolver and navigation both honour the flag.
dWallet FEATURE_TO_MODULE.dWallet = 'dWallet' (canonical requires module) ModuleKey union in tiers.ts does not include dWallet, and MODULES_REQUIRED_TIER['dWallet'] would be undefined canAccess(ctx, 'dWallet') runs MODULES_REQUIRED_TIER['dWallet'] = undefined → tierAtLeast(tierLevel, undefined) returns false → always denies dWallet in the canonical gate.
providers / settings / community_services Gated by assertModuleEnabled in ~12 routes (providers), 3 routes (settings), 1 feature (community_services) None of these keys exist in FEATURE_TO_MODULE — they are not part of the unified gate's feature catalogue at all. Two parallel module namespaces: the platform_modules-table-backed "real" keys vs the static MODULES/FeatureKey catalogue.

## 8. Test Coverage Matrix

System Test file Coverage Gap
canAccess (gate.ts) src/entities/tenant/api/gate/gate.test.ts (475 lines) Mapping completeness, short-circuit order, skipFlag, tri-state conservation, resolveGateContext happy/null role/throw paths. The feature (Layer 4) denial branch is never asserted as a failing case; the role (Layer 0) branch is never tested with a real ROLE_PERMISSIONS payload; FEATURE_TO_REGISTRY registry key format check uses (page|feature|widget)\. regex but the "feature" and "widget" prefixes never actually appear in FEATURE_TO_REGISTRY; dWallet mismap (undefined module tier) is not caught because the test's ALL_FEATURE_KEYS omits dWallet.

Client gate (canAccessClient, useGateContext, useCanAccess) src/features/gate/**tests**/feature-gate-client.test.tsx Comprehensive; agentScope expiry/in-scope/out-of-scope covered. None gating agentScope against ctx.role precedence.
feature-gate.ts (assertModuleEnabled response-returning) None None. Zero coverage of the function that ~30 production routes depend on. withTenant() failure path, DB error path, and disabled path are untested.
lib/modules/assert-module-enabled.ts (isModuleEnabled/throwing assertModuleEnabled/getEnabledModules) None None. Zero direct coverage of the 3-query core that every gate eventually calls.

PlatformPageFlags (getPlatformPageFlags/setters) src/entities/tenant/**tests**/platform-flags.test.ts, src/db/**tests**/schema.test.ts:89-115, src/entities/tenant/api/flags/platform-flags.test.ts Default-flags shape, type signatures. No test asserts applySettingToFlags actually mutates flags correctly for boolean/enum/json paths; no test for transactional variants.
resolvePageAccess (access resolver) src/entities/access/resolver.test.ts Active (L18, L34, L229 seen). Agent-scope intersection (intersectScopeWithFlags) appears to be exercised; full pipeline Layer 0/1/2/3 covered in some form.

FeatureRegistry pure helpers (hasFeature, canAccessPage, canUseWidget) None direct. None. Tier-order logic, featureFlags override precedence, and unknown-key return values are unverified.

TierGuard component None None. Render-with-upgrade-prompt, fallback, and fallback-when-no-arg paths untested.
statsig-flags.ts None None. Hardcoded false values are unverified; identity dedupe never exercised.
use-enabled-modules.ts (useEnabledModules, useModuleEnabled) None None. TanStack Query key/gating path unverified.
navigation-config.ts src/entities/tenant/**tests**/navigation-config.test.ts Some. getHeaderItems slice(0,5), the conservation !== 'external' special case, and campaign !== false branch are exercised lightly.

## 9. Assessment

### What is working:

- The client-side gate (features/gate/model/gate.ts + feature-gate-client.test.tsx) is well-tested, has a clear contract, and is consumed consistently by the chrome components (Header, Footer, MobileSpaceBar, SpaceChrome). The asymmetry between client (3 layers) and server (5 layers) is explicitly documented and locked.

- getPlatformPageFlags is the only gate with a real caching strategy (unstable_cache 300s, SETTINGS tag for invalidation). It is composable and shows what a healthy gate surface looks like.

- The mapping tables in mappings.ts exist as a single typed file (FeatureKey union enforced on keys), which makes drift auditable — and the gate.test.ts Section 1 actually catches cross-table key-set drift (modulo the dWallet omission).

- The feature-flag → setting-key translation in settings-defs.ts is a tidy single registry: 24 flags mapped to DB keys, with Zod validators. This part of the code is in good shape.

### What is friction:

- The unified gate canAccess is the most thoroughly designed surface (5 layers, mapping tables, error code map, GateReason telemetry) yet has zero production callers. The actual production gate (assertModuleEnabled in feature-gate.ts) is a one-line wrapper around the most expensive underlying primitive, with no caching, no telemetry, and no tests. The design and the reality have diverged.
- The ModuleKey catalogue is split-brain: the static MODULES constant (19 keys, all UX-friendly names like adminBasic, agentGateway) does not include the runtime module keys that production asserts on (competitions, providers, settings, community_services, dWallet). Two naming authorities coexist.
- Tier vocabulary duplication — three copies of the 3-row tier lookup, two tier enums, two getTierLevel functions, all for the same 3-tier domain.
- Naming collisions on assertModuleEnabled, useGateContext, and getTierLevel are actively dangerous.
- The module-gate core (lib/modules/assert-module-enabled.ts) is uncached AND untested. It is the single most-called gate function in the system and it has both worst-case DB behaviour (3 queries × N modules in /api/gate/context) and zero direct test coverage.
- statsig-flags.ts is vaporware: a stub that declares an identify function and 6 hardcoded false flags, with neither adapter nor consumer. Its presence in the index barrel creates the false impression of an experiment-gating capability.
- The access resolver (/api/access) and the feature gate live in parallel universes: resolver uses PlatformPageFlags and ROLE_PERMISSIONS but never consults isModuleEnabled or FEATURE_REGISTRY. So a space can appear in /api/access output while its backing route handler is module-gated to 403.
- The catalogue-size self-tests in gate.test.ts (L165, L213-214, L234) are off-by-one or vacuous: FEATURE_TO_MODULE is asserted to have "exactly 14 entries" (correct), FEATURE_TO_FLAG to have "exactly 15 entries" but the assertion body just checks length > 0 (L213-214), and the test's own ALL_FEATURE_KEYS array omits dWallet. The cross-table consistency assertion passes because all three tables happen to have key dWallet, but the loop never visits it.

This is the picture of a system where a clean unified design was drafted (gate.ts + mappings.ts), tested in isolation, and then not adopted — and the production code that grew around it bypasses the design with cheaper-to-write but more expensive-to-run wrappers that share names with the design's building blocks.
