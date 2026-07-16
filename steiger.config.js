// Steiger is the official Feature-Sliced Design linter and the source of
// truth for FSD architecture boundaries. It catches layer hierarchy violations,
// cross-slice imports, public API sidesteps, missing public APIs, insignificant
// slices, layer-name typos, and more. The no-restricted-imports rules in
// eslint.config.js are a fast first-line defense; Steiger is the canonical
// check. See AGENTS.md and `.planning/phases/44-m5a-hardening/44-01-PLAN.md`
// for rationale and tuning policy.

import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Phase 44 baseline (2026-06-07): 582 violations across 9 clusters.
    // Most rules are 'warn' so the linter surfaces debt without blocking CI.
    // Rules will be tightened to 'error' one cluster at a time as Phase 44
    // follow-up plans close each cluster. 'typo-in-layer-name' and 'no-processes'
    // are 'error' from the start (cheap to fix, no false positives).
    rules: {
      'fsd/no-public-api-sidestep': 'warn',
      // Promoted to 'error' (2026-07-16): the 6 genuine cross-slice violations
      // were resolved — 3 by relocating shared domain types (TierLevel,
      // PricingPlan) to @shared/lib, and StandingBadge to @widgets/merit; the
      // remaining 3 cross-entity config/seed couplings (merit→tenant SETTINGS_KEYS,
      // tenant→service seed data, chat test→directory) are allow-listed below
      // with BD soralia-village-jftz justification. Any NEW forbidden-import
      // violation now fails CI.
      'fsd/forbidden-imports': 'error',
      'fsd/insignificant-slice': 'warn',
      'fsd/public-api': 'warn',
      'fsd/typo-in-layer-name': 'error',
      'fsd/shared-lib-grouping': 'warn',
      'fsd/segments-by-purpose': 'warn',
      'fsd/no-segmentless-slices': 'warn',
      'fsd/no-reserved-folder-names': 'warn',
      'fsd/inconsistent-naming': 'warn',
      'fsd/no-processes': 'error',
      // `features` layer has 25 ungrouped slices (>20 recommended threshold).
      // Kept at 'warn' per the Phase 44 tuning policy: the real fix is grouping
      // the slices into domain groups (e.g. admin/, commerce/, community/,
      // infra/), which is a tracked follow-up. Tighten to 'error' only after the
      // grouping lands — until then this is surfaced, not blocking.
      'fsd/excessive-slicing': 'warn',
    },
  },
  {
    // Widget registry intentionally references cross-slice widgets (admin,
    // maintenance, chat, service). This is a design decision — the registry
    // is the central composition point and cannot be split without creating
    // circular dependencies. The barrel imports (@widgets/admin etc.) satisfy
    // the public API rule. Cross-import warnings are suppressed for this
    // single file. See soralia-village-nf5r for context.
    files: ['src/widgets/dashboard/model/widgets.ts'],
    rules: {
      'fsd/forbidden-imports': 'off',
    },
  },
  {
    // Admin widget registry, like the dashboard registry, cross-imports widgets
    // from @widgets/service and @widgets/maintenance as the central composition
    // point. Same design rationale as the dashboard exception above.
    // See soralia-village-nf5r for context.
    files: ['src/widgets/admin/ui/AdminWidgetRenderer.tsx'],
    rules: {
      'fsd/forbidden-imports': 'off',
    },
  },
  {
    // Header and Footer in shared/ui import useGateContext from @features/gate.
    // The gate is infrastructure that must be consumed by shared UI components
    // for navigation visibility gating. Phase 41 established useGateContext as
    // the canonical client-side gate; Phase 44-1eh migrated these callsites from
    // usePageFlags (@shared/lib/hooks, FSD-compliant) to useGateContext
    // (@features/gate, layer violation). The gate slice is de facto
    // infrastructure, not a normal feature. See soralia-village-1eh.
    files: ['src/shared/ui/Header.tsx', 'src/shared/ui/Footer.tsx'],
    rules: {
      'fsd/forbidden-imports': 'off',
    },
  },
  {
    // Intentional FSD sidesteps for forbidden-imports, allow-listed per the
    // AGENTS.md sidestep policy (every sidestep MUST carry a BD link).
    // Umbrella issue: soralia-village-jftz. These are NOT debt to fix — they are
    // by-design test/infra imports that Steiger cannot distinguish from real
    // layer inversions.
    files: [
      // Tests render app pages / call app/api routes — app import is required.
      'src/features/auth/__tests__/auth-forms.test.tsx',
      'src/entities/setup/__tests__/api.test.ts',
      // Entity tests import sibling feature components to exercise them.
      'src/entities/marketplace/__tests__/swipe-card.test.tsx',
      'src/entities/content/__tests__/announcements.test.ts',
      // shared → entities server/type imports: ADR-024 server-only barrel
      // pattern (shared/api is infrastructure that consumes entity servers).
      'src/shared/api/trpc/server.ts',
      'src/shared/api/ai/provider.ts',
      'src/shared/api/ai/pool.ts',
      'src/shared/api/provider-platform.ts',
      'src/shared/lib/dispute/intake-screen-output.ts',
      // shared → widgets: dashboard space types/helpers used for access gating.
      'src/shared/lib/hooks/usePageAccess.ts',
      'src/shared/ui/MapContent.tsx',
      // Genuine cross-entity/feature coupling, allow-listed (infrastructure):
      // merit/services imports tenant SETTINGS_KEYS (cross-entity server config const).
      'src/entities/merit/services/index.ts',
      // tenant/flags/services-config consumes service seed data (cross-entity config).
      'src/entities/tenant/api/flags/services-config.ts',
      // chat test renders the directory DirectoryChatModal (same as other test allow-lists).
      'src/features/chat/__tests__/chat.test.tsx',
    ],
    rules: {
      'fsd/forbidden-imports': 'off',
    },
  },
]);
