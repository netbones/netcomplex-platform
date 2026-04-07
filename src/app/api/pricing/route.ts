import { NextResponse } from 'next/server';
import { TIERS, type TierLevel } from '@/lib/features/registry';
import { withTenant } from '@/lib/tenant/with-tenant';

export interface PricingPlan {
  id: TierLevel;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
  maxPages: number;
  color: string;
}

// Static pricing data aligned with Netcomplex tiers
const PRICING_PLANS: Record<TierLevel, Omit<PricingPlan, 'id'>> = {
  foundation: {
    name: 'FOUNDATION',
    price: 'R299',
    period: '/month',
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
  depth: {
    name: 'DEPTH',
    price: 'R599',
    period: '/month',
    description: 'Growth tier for expanding communities up to 200 units',
    features: [
      'Up to 15 pages',
      'Up to 200 units',
      'Everything in FOUNDATION',
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
  core: {
    name: 'CORE',
    price: 'Custom',
    period: '',
    description: 'Enterprise tier for large HOAs and property management companies',
    features: [
      'Unlimited pages',
      'Unlimited units',
      'Everything in DEPTH',
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

export async function GET() {
  try {
    // Tenant context required but pricing is static
    await withTenant();

    // In the future, this could fetch from a database
    // For now, return static data aligned with Netcomplex tiers
    const plans: PricingPlan[] = Object.entries(PRICING_PLANS).map(([tier, plan]) => ({
      id: tier as TierLevel,
      ...plan,
    }));

    return NextResponse.json({
      plans,
      tiers: TIERS,
    });
  } catch (error) {
    console.error('Error fetching pricing data:', error);
    return NextResponse.json({ error: 'Failed to fetch pricing data' }, { status: 500 });
  }
}
