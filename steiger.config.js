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
          ],
        },
      ],
    },
  },
]);
