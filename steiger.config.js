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
      'fsd/forbidden-imports': 'warn',
      'fsd/insignificant-slice': 'warn',
      'fsd/public-api': 'warn',
      'fsd/typo-in-layer-name': 'error',
      'fsd/shared-lib-grouping': 'warn',
      'fsd/segments-by-purpose': 'warn',
      'fsd/no-segmentless-slices': 'warn',
      'fsd/no-reserved-folder-names': 'warn',
      'fsd/inconsistent-naming': 'warn',
      'fsd/no-processes': 'error',
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
    // Documented sidesteps (allow list). Add new entries here only when the
    // sidestep is intentional, justified, and documented in the linked BD
    // issue or commit message. Each entry should have a short comment.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'fsd/no-public-api-sidestep': [
        'warn',
        {
          allow: [
            // i18n is a client-only module that the barrel deliberately
            // excludes (react-i18next would leak into server bundles). Each
            // consumer has an eslint-disable-next-line with the same
            // justification. See soralia-village-de8x for context.
            '@shared/lib/i18n',
            // Phase 44-04 (BD qjpa): @api sub-barrels are the official public
            // APIs for the shared/api slice, split by runtime context to avoid
            // merging server-only and client-only code in one barrel.
            '@api/server',
            '@api/client',
            '@api/shared',
          ],
        },
      ],
    },
  },
]);
