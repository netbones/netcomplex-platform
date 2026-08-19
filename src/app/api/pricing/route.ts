import { TIERS, type TierLevel } from '@entities/tenant';
import { withTenantOptional } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { getSeatRateCard } from '@shared/lib/billing/seat-rate-card';

import { apiSuccess, apiInternalError, db } from '@api/server';

import type { PricingPlan } from '@features/pricing';

export const maxDuration = 8;

export type { PricingPlan };

// Non-price marketing metadata per tier. The displayed price/period are derived
// from the DB seat rate card (ADVISORY-041 Phase 2) so no ZAR literal lives in
// this surface. All-in seat-licence pricing means every tier shows the flagship
// per-household rate; tiers differentiate on capability, not price.
const TIER_META: Record<TierLevel, Omit<PricingPlan, 'id' | 'price' | 'period'>> = {
  core: {
    name: 'Core',
    description: 'Entry tier for small communities up to 50 units',
    features: [
      'Up to 5 pages',
      'Up to 50 units',
      'Resident directory',
      'Basic announcements',
      'Maintenance requests',
      'Email support',
    ],
    cta: 'Start Free Trial',
    popular: false,
    maxPages: 5,
    color: '#22C55E',
  },
  foundation: {
    name: 'Foundation',
    description: 'Growth tier for expanding communities up to 200 units',
    features: [
      'Up to 15 pages',
      'Up to 200 units',
      'Everything in Core',
      'Facility bookings',
      'Event management',
      'Surveys & voting',
      'Custom branding',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: true,
    maxPages: 15,
    color: '#F59E0B',
  },
  'pro-max': {
    name: 'Pro‑Max',
    description: 'Enterprise tier for large HOAs and property management companies',
    features: [
      'Unlimited pages',
      'Unlimited units',
      'Everything in Foundation',
      'Multiple communities',
      'Advanced analytics',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
    maxPages: -1, // Unlimited
    color: '#1E293B',
  },
};

function pickFlagshipRate(rateCard: Array<{ priceLabel: string }>): string {
  return rateCard[0]?.priceLabel ?? 'Contact Sales';
}

export async function GET() {
  try {
    // Marketing route — tenant optional; falls back to the global rate card.
    const { tenantId } = await withTenantOptional();

    const rateCard = await getSeatRateCard(db, tenantId);
    const price = pickFlagshipRate(rateCard);

    const plans: PricingPlan[] = (Object.keys(TIER_META) as TierLevel[]).map(id => ({
      id,
      ...TIER_META[id],
      price,
      period: '/household/mo',
    }));

    return apiSuccess({
      plans,
      tiers: TIERS,
    });
  } catch (error) {
    logError({ component: 'pricing-api', operation: 'GET' }, 'Error fetching pricing data', error);
    return apiInternalError('Failed to fetch pricing data');
  }
}
