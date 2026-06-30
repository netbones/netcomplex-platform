# Comprehensive Code Quality Analysis: Soralia Village

reviewer: DeepSeek V4 Pro

1. ESLint Configuration (eslint.config.js and eslint.config.mjs) -- Rules and Exceptions
   Two config files exist, which is a concern:

- eslint.config.mjs (83 lines) -- Contains the eslint-plugin-boundaries setup for FSD layer hierarchy enforcement. Also enforces id-length (minimum 3 characters), no-var, prefer-const. Configs tseslint.configs.recommended and Next.js plugin rules.
- eslint.config.js (128 lines) -- Contains no-restricted-imports patterns that enforce FSD slice public API boundaries (no deep imports). It also blocks legacy @/components/** and @/lib/** imports. Has a special override for src/features/gate/** that relaxes the entities deep-import rule (with a documented rationale at soralia-village-1eh).
  Key findings:
  Aspect Observation
  Dual config files .mjs and .js co-exist. Only one is typically picked up by ESLint depending on the "type": "module" setting in package.json. This is confusing and error-prone.
  any allowed as warn @typescript-eslint/no-explicit-any is set to warn only (not error).
  No no-console rule No rule forbids console.log/warn/error in production code.
  No complexity limits No complexity or max-lines-per-function rules.
  id-length exceptions Allows id, db, in, to, i, j, k, n, x, y, z, t, q -- 13 single-char variable names bypassed.
  Legacy bucket blocking Good: actively blocks @/components/** and @/lib/** via no-restricted-imports.
  FSD boundaries testing gap boundaries/ignore excludes all **/_.test._ and \*_/_.spec.\* patterns from boundary checks -- tests can violate layer rules undetected.
  Intentional sidestep @features/gate has an intentional override for @entities/tenant/api/gate/mappings with documented rationale.

2. TypeScript Errors (typecheck_report.md)
   41 errors across 13 files. The typecheck does NOT pass cleanly:
   File Error Count Root Cause
   csos-export.test.ts 15 Mock objects typed as never[] instead of their actual array types -- incomplete test mock typing.
   consent.test.ts 4 params should be Promise<{streamKey}> per Next.js 15 conventions but tests pass synchronous object.
   v1-dwallet-deletion.test.ts / payout.test.ts 3 getOrCreateWallet not exported from @entities/dwallet public API.
   CSOSExportButton.test.tsx 4 vi.fn<[Blob], string>() uses old Vitest type parameter syntax; Vitest 2+ uses single type arg.
   navigation-config.test.ts / gate.test.ts 3 PlatformPageFlags type missing disputes property -- stale test data.
   feature-gate-client.test.tsx 1 disputes: boolean | undefined where boolean required.
   maintenance-requests.ts 3 Missing import { sql } from 'drizzle-orm' -- uses sql<boolean> without the import.
   usePageAccess.test.ts 5 Incomplete mock of useSession return type (missing isPending, isRefetching, etc).
   AdminDisputesWidget.test.tsx / MyDisputesWidget.test.tsx 2 beforeEach not recognized -- likely missing vitest globals type config.
   marketplace/webhook/route.ts 1 'FAILED' literal not in the enum/union for paymentStatus Drizzle column type.
   Severity assessment: All 41 errors are in test files except 4 in production code (maintenance-requests.ts 3 errors, webhook/route.ts 1). The production errors are real bugs (missing import + type mismatch).
3. ESLint Warnings/Errors (lint_report.md)
   296 problems total: 35 errors, 261 warnings
   35 errors breakdown:

- no-explicit-any (30 errors): All in test files (src/test/api/\*.test.ts). Drizzle mock chains use as any heavily. This is expected in test mocks but should be centrally handled.
- no-restricted-imports (1 error): billing/page.tsx imports from legacy @/components/providers/BillingDashboard -- a migration gap.
- no-unsafe-function-type (1 error): surveys.test.ts uses Function type.
- 3 unused eslint-disable directives in purge.test.ts -- comments that suppress rules that were never violated.
  261 warnings breakdown:
- @typescript-eslint/no-unused-vars (~250+ warnings): Massive accumulation. Most are apiError imported but never used across 40+ API route files, unused imports like Link, LoadingCard, sanitizeHtml, and destructured values like status, router, session that are assigned but never read.
- Unused eslint-disable directives (4 warnings): Dead suppression comments.
  This is the single biggest code quality issue: The codebase has accumulated years of unused imports and variables. This inflates bundle sizes, slows TypeScript, and indicates hasty copy-paste development without cleanup.

4. Test Coverage (vitest.config.ts)
   Configuration analysis:
   Setting Value Assessment
   Environment jsdom Correct for React component testing
   Include pattern src/\*_/_.{test,spec}.{ts,tsx} Standard
   Excluded tests 3 files (platform-flags.test.ts, registry.test.ts, schemas.test.ts) Explicitly excluded -- likely broken or flaky
   Coverage provider v8 Standard for Node.js
   Coverage thresholds lines: 20%, branches: 15%, functions: 10% CRITICALLY LOW
   Test file count: 204 test files (from the find count; the glob results showed 100+ truncated).
   Only 1 E2E test file: e2e/competition.spec.ts -- a single Playwright spec.
   README claims 80% coverage requirement (line 345: "Minimum 80% test coverage required"), but the vitest config enforces only 20/15/10% thresholds. This is a major documentation/code gap.
5. Scripts Directory
   25 entries in scripts/:
   Category Files
   Data validation/audit audit-tenant-isolation.ts, check-categories.ts, check-existing-props.ts, check-fk.ts, check-nullable.ts, check-prop-schema.ts, check-resources.ts, check-rows.ts, list-icons.ts
   Migration helpers migrate-renter-relationships.ts, backfill-tenant-records.ts
   Seeding seed-drizzle.ts, seed-data/ directory
   Ad-hoc SQL sql/ directory
   Testing helpers test-explicit.ts, test-insert.ts, test-no-ocn.ts, test-onconflict.ts, test-real-flow.ts, test-real-prop.ts, test-sql.ts, test-timestamps.ts, test-with-ocn.ts
   Tooling steiger-staged.sh, changelog.sh
   Assessment: Many one-off test/check scripts that should probably live in src/test/ or be cleaned up after their purpose was served. The test-\*.ts pattern (9 files) suggests ad-hoc database testing scripts rather than organized unit tests.
6. Duplicate Utility Functions: formatDate
   formatDate is defined in 8 separate locations:
7. src/widgets/admin/ui/maintenance/constants.ts:52 (exported)
8. src/components/admin/adminApi.ts:36 (exported, legacy bucket)
9. src/entities/dispute/ui/EvidencePreviewGrid.tsx:13 (private)
10. src/entities/dispute/ui/DisputeListTable.tsx:14 (private)
11. src/widgets/dashboard/ui/EventsWidget.tsx:24 (private)
12. src/widgets/dashboard/ui/AdminDisputesWidget.tsx:19 (private)
13. src/widgets/dashboard/ui/AdminSubscriptionsWidget.tsx:43 (private)
14. src/widgets/admin/ui/EventsWidget.tsx:21 (private)
    No truncateText duplicate was found.
    This is a clear DRY violation. There should be a single formatDate (and formatDateTime) in @shared/lib/utils.ts or a dedicated @shared/lib/format-date.ts.
15. Constants File Completeness (src/shared/lib/constants.ts)
    What it covers (good):

- App name, tagline, default language, supported languages
- Map coordinates (center, zoom)
- Pagination default page size
- Content categories, roles, group roles
- Maintenance priorities and statuses
- Booking statuses
- Interest categories with display names and Tailwind colors
- Card header colors and animations
- Resident types (OWNER/RENTER)
- Streets enumeration
  What's missing:
- No API timeout constants (e.g., API_TIMEOUT_MS)
- No cache TTL constants (e.g., CACHE_TTL_SHORT, CACHE_TTL_LONG)
- No message retention period (30 days is hardcoded in seats/route.ts)
- No date format strings (could be DATE_FORMAT = 'dd MMM yyyy')
- No HTTP status codes (could use a HTTP_STATUS object)
- No file size limits (for uploads)
- No rate limiting constants
- No feature flag key constants
- No cookie names (e.g., i18n-locale is hardcoded in middleware)
  There is a second constants directory at src/shared/lib/constants/tiers.ts with tier/module definitions. This is good organization.
  The INTEREST_COLORS object has duplicate entries for both lowercase and title-case keys (e.g., gardening and Gardening both map to bg-green-500). This is a data normalization smell.

8. Error Handling Consistency
   Positive findings:

- withErrorHandler utility exists at src/shared/api/with-error-handler.ts for wrapping API route handlers with Zod error handling
- 474 try blocks and 586 catch blocks across the codebase (significant coverage)
- The logger module provides structured logError, logWarn, etc. with Pino
- Many features use createComponentLogger pattern consistently
  Negative findings:
- ~543 catch blocks do NOT use the project logger (they use console.error or swallow errors silently)
- Many API route files import apiError but never call it -- the error utility exists but is unused in ~40 routes
- Silent error swallowing patterns observed: catch {} (empty catch block), catch { return null } without logging
- src/entities/dispute/ui/DisputeActionsBar.tsx has 5 consecutive catch (err) blocks that only set local state without central logging
- The withErrorHandler wrapper only catches synchronous errors -- async errors inside the handler are not caught unless the handler itself wraps them
- No standardized error DTO/response shape for API errors beyond basic apiError() helper

9. Logging Patterns: Pino vs console.log
   Pino logger usage: ~461 imports/uses of the logger module across non-test source files. The pattern createComponentLogger('ComponentName') is used consistently in entities, widgets, and features. This is good.
   console. usage:\* 17 console.error/warn/log calls in production code (non-test):

- src/entities/dwallet/ui/DWalletAdminWidget.tsx: 4 console.error calls
- src/shared/api/achievements/listener.ts: 6 console.error calls
- src/widgets/dashboard/model/spaces.ts: 1 console.warn
- src/app/api/providers/invoices/[id]/pdf/route.ts: 1 console.error
- src/app/api/purge/route.ts: 1 console.error
- src/app/(tenant)/admin/households/page.tsx: 1 console.error
- src/shared/lib/agent-token.ts: 1 console.warn
- src/shared/lib/useAutoSave.ts: 1 console.warn
- src/server/openapi/generator.ts: 1 console.log
  Assessment: 17 console calls out of ~461 logger usages = ~3.7% console usage. This is relatively low. The achievements/listener.ts (6 calls) and DWalletAdminWidget.tsx (4 calls) are the worst offenders -- they should use createComponentLogger. The openapi/generator.ts log is acceptable (it's a build-time CLI script).
  The logger module has 4 deprecated functions (logError, logWarn, logInfo, logDebug, logPromiseError) with JSDoc deprecation markers. These should be cleaned up to avoid confusion.

10. TypeScript any Usage
    as any occurrences (first 40):

- Test files: The vast majority (~80%) -- mock setup in Drizzle chain tests, touch event mocking in swipe-card tests
- Production code affected:
- src/entities/tenant/api/flags/platform-flags.ts: 3 uses of (flags as any)[flagKey] -- unsafe property assignment
- src/server/routers/marketplace/checkout.ts: paymentStatus: 'FAILED' as any -- this is also a typecheck error
- src/server/routers/marketplace/premium.ts: listingType: (input.listingType || 'SALE') as any and status: 'DRAFT' as any
- src/app/member/[id]/page.tsx: (SoloSeat as any).user and (SoloSeat as any).property -- type safety bypass
- src/shared/api/with-error-handler.ts: 2 uses in type definitions and wrapper implementation
  any[] in production code:
- src/shared/api/with-error-handler.ts:8: type RouteHandler = (...args: any[]) => ... -- legitimate wrapper pattern, same on line 21

11. TODO/FIXME/HACK Comments (Tech Debt Markers)
    5 TODO items found:
    File Comment Priority
    src/widgets/dashboard/ui/MobileSpaceBar.tsx:28 "TODO: implement 'More' overflow sheet when 6th space is added" Low (UX enhancement)
    src/server/routers/competitions.ts:96 "TODO(BD): Create competitionDto in src/server/dto/misc.ts" Medium (missing DTO)
    src/server/routers/competitions.ts:229 "TODO(BD): Replace inline output schema with competitionDto once created" Medium (depends on above)
    src/app/bookings/page.tsx:11 "TODO: Re-enable tenant-based feature gating after fixing context issues" Medium (disabled feature)
    src/features/ai-provider/ui/admin-ai-usage-widget.tsx:61 "TODO: Wire tenantId from dashboard shell context instead of prop" Low (refactor)
    No FIXME or HACK tags found. The small number of TODOs (5) is actually very clean for a codebase of this size (~1,638 TypeScript files). However, the competitions.ts TODOs reference a BD issue that should be tracked.
12. Commented-Out Code (Dead Code)
    Found commented-out code in these files:
    File Lines Commented Code
    src/entities/tenant/api/index.ts 1 export \* from './context' disabled
    src/entities/tenant/api/base.ts 1 import { unstable_cache } disabled
    src/entities/tenant/ui/FeatureGate.tsx 10+ Entire implementation commented out, returns children
    src/widgets/dashboard/ui/WidgetRenderer.tsx 1 useTenant() commented
    src/app/bookings/page.tsx 2 useTenant and isFeatureEnabled imports disabled
    src/shared/lib/hooks/index.ts 1 usePageFlags export disabled
    src/shared/lib/index.ts 3 Documentation comments with example imports
    src/shared/api/auth.ts 1 resetUrl construction disabled
    src/shared/ui/ErrorBoundary.tsx 2 useErrorBoundary hook commented out
    The FeatureGate.tsx is essentially dead code -- all its logic is commented out, and it just passes through children. The FeatureGate component should either be fixed or removed.
13. Dead Code Files
    src/app/resources/page.tsx.old -- 324 lines. This is a leftover .old file that should be removed. It contains 14 import/function declarations but is not compiled or imported anywhere.
    No .bak files found.
    Legacy src/components/ directory still exists with 10 files:

- admin/TransactionDashboard.tsx
- admin/RevenueChart.tsx
- admin/adminApi.ts (contains duplicate formatDate)
- admin/RevenueDashboard.tsx
- admin/ProviderModerationDashboard.tsx
- admin/ProviderDetailView.tsx
- admin/types.ts
- admin/RefundModal.tsx
- admin/VerificationQueue.tsx
- admin/ProviderAnalyticsDashboard.tsx
  ESLint actively blocks imports from here, but the files remain in the codebase. The billing/page.tsx ESLint error shows one import still referencing @/components/providers/BillingDashboard.

14. Vercel Deployment Config
    Minimal configuration (4 lines):
    {
    "framework": "nextjs",
    "regions": ["cpt1"]
    }
    Assessment:

- Regions set to cpt1 (Cape Town) -- appropriate for South African users
- No functions configuration for memory/duration limits
- No crons configuration (though src/app/api/cron/ exists with cron endpoints)
- No headers configuration for security headers (CSP, HSTS, X-Frame-Options)
- No redirects or rewrites configuration
- No ISR configuration limits
- Missing security hardening

15. Middleware Complexity
    src/middleware.ts -- 219 lines. The complexity is moderate:
    What it does:
1. Multi-tenant host-based routing (platform vs tenant plane)
1. Locale detection (cookie → Accept-Language → default)
1. Request ID generation per request
1. Tenant slug inference from subdomain
1. API route classification (documented per API.md v1 structure)
1. Route group redirection (block platform routes on tenant domains, block tenant routes on platform domain)
1. Static asset bypass
   Complexity concerns:

- The main middleware function is ~100 lines -- could be broken into smaller functions
- isTenantRoute() has 20+ string comparisons that will grow with every new feature
- Hardcoded domains (app.netbones.co.za, soralia.org, etc.) -- should be in constants or env vars
- No unit tests exist for middleware (the middleware is not covered by any test file)
- The locale detection duplicates SUPPORTED_LOCALES and DEFAULT_LOCALE which are also defined in constants.ts
  Summary: Key Findings by Severity
  Critical Issues

# Issue Impact

1 41 TypeScript errors prevent clean typecheck CI should be failing; 4 errors in production code
2 35 ESLint errors (30 no-explicit-any, 1 legacy import, etc.) CI is failing
3 Coverage thresholds are 20/15/10% vs README claim of 80% Misleading, extremely low enforcement
4 Only 1 E2E test (competition.spec.ts) No integration/end-to-end coverage
5 formatDate duplicated 8 times across the codebase Maintenance nightmare, inconsistent formatting
High-Severity Issues

# Issue Impact

6 261 unused-variable warnings (imported-but-unused across 40+ files) Code bloat, slower builds, copy-paste indicator
7 Dual ESLint configs (.mjs and .js) Confusion about which is authoritative
8 FeatureGate.tsx is entirely commented out Dead code, misleading component
9 Legacy src/components/ still exists (10 files, 1 active import) Migration incomplete
10 .old file remains (page.tsx.old, 324 lines) Dead code in repo
Medium-Severity Issues

# Issue Impact

11 543 catch blocks not using Pino logger Inconsistent error reporting
12 17 console.\* calls in production code Bypasses structured logging
13 API route files import apiError but never call it (~40 files) Disconnected error handling intent
14 INTEREST_COLORS has duplicate key casing Data quality
15 Middleware has no unit tests Critical routing logic untested
16 Vercel config lacks security headers and cron config Missing infrastructure hardening
17 5 TODOs remain untracked (2 reference BD issues) Small but present tech debt
18 Logger has 5 deprecated functions Confusing API surface
Low-Severity / Observations

# Issue

19 constants.ts missing HTTP status codes, timeout values, cookie names
20 9 ad-hoc test-\*.ts scripts in scripts/ that may be stale
21 Middleware hardcodes domain names instead of using env vars
22 id-length rule permits 13 single-character variable names
23 no-explicit-any is warn (not error) in ESLint config
24 No complexity limits in ESLint rules
25 no-console ESLint rule is absent
