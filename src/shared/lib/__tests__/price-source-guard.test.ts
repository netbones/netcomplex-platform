import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * ADVISORY-041 Phase 2 — price-source guard.
 *
 * Prevents a sixth hardcoded price literal from being reintroduced into any
 * customer-facing pricing surface. Prices must be read from the DB seat rate
 * card via `getSeatRateCard()` (src/shared/lib/billing/seat-rate-card.ts).
 *
 * Seed modules are the DB source of truth and are exempt — the guard protects
 * surfaces, not data.
 */

const SURFACES = [
  'src/app/api/pricing/route.ts',
  'src/app/(platform)/features/page.tsx',
  'src/widgets/dashboard/ui/AdminSubscriptionsWidget.tsx',
  'src/features/setup/ui/sections/ConfigureSection.tsx',
];

// Matches a ZAR price literal such as R12.50, R299, or R299/mo.
// Excludes template literals (R${...}) and the seed data files.
const PRICE_LITERAL = /\bR\s?\d+(?:[.,]\d+)?(?:\s*\/\s*(?:mo|month|household))?\b/;

describe('price-source guard', () => {
  it.each(SURFACES)('surface has no hardcoded ZAR price literal: %s', surface => {
    const source = readFileSync(resolve(process.cwd(), surface), 'utf8');
    const matches = source.match(PRICE_LITERAL);

    expect(matches, `Remove hardcoded price in ${surface}: ${matches ?? 'none'}`).toBeNull();
  });
});
