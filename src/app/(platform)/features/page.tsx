import { PlatformFooter, PlatformHeader } from '@features/platform';
import { Check, Minus } from 'lucide-react';

interface FeatureGroup {
  group: string;
  features: {
    name: string;
    core: boolean | string;
    foundation: boolean | string;
    'pro-max': boolean | string;
  }[];
}

const featureGroups: FeatureGroup[] = [
  {
    group: 'Community Management',
    features: [
      { name: 'Resident directory', core: true, foundation: true, 'pro-max': true },
      { name: 'Maintenance requests', core: true, foundation: true, 'pro-max': true },
      { name: 'Announcements & news', core: true, foundation: true, 'pro-max': true },
      { name: 'Facility bookings', core: false, foundation: true, 'pro-max': true },
      { name: 'Event management', core: false, foundation: true, 'pro-max': true },
      { name: 'Surveys & polling', core: false, foundation: true, 'pro-max': true },
    ],
  },
  {
    group: 'Communication',
    features: [
      { name: 'In-platform messaging', core: true, foundation: true, 'pro-max': true },
      { name: 'Push notifications', core: true, foundation: true, 'pro-max': true },
      { name: 'Email notifications', core: true, foundation: true, 'pro-max': true },
      { name: 'Community content feed', core: true, foundation: true, 'pro-max': true },
      { name: 'Affinity groups', core: false, foundation: true, 'pro-max': true },
      { name: 'Emergency broadcast', core: false, foundation: true, 'pro-max': true },
    ],
  },
  {
    group: 'Administration',
    features: [
      { name: 'Unit & resident management', core: true, foundation: true, 'pro-max': true },
      { name: 'Document storage', core: true, foundation: true, 'pro-max': true },
      { name: 'Role-based access control', core: true, foundation: true, 'pro-max': true },
      { name: 'Custom branding', core: false, foundation: true, 'pro-max': true },
      { name: 'Advanced analytics', core: false, foundation: false, 'pro-max': true },
      { name: 'Multi-community support', core: false, foundation: false, 'pro-max': true },
    ],
  },
  {
    group: 'Commerce & Finance',
    features: [
      { name: 'Community marketplace', core: true, foundation: true, 'pro-max': true },
      { name: 'Digital wallet', core: true, foundation: true, 'pro-max': true },
      { name: 'Payment processing', core: true, foundation: true, 'pro-max': true },
      { name: 'Provider directory', core: false, foundation: true, 'pro-max': true },
      { name: 'API access', core: false, foundation: false, 'pro-max': true },
      { name: 'Custom integrations', core: false, foundation: false, 'pro-max': true },
    ],
  },
  {
    group: 'Support & Scale',
    features: [
      { name: 'Email support', core: true, foundation: true, 'pro-max': true },
      { name: 'Priority support', core: false, foundation: true, 'pro-max': true },
      { name: 'Dedicated account manager', core: false, foundation: false, 'pro-max': true },
      { name: 'Max units', core: 'Up to 50', foundation: 'Up to 200', 'pro-max': 'Unlimited' },
      { name: 'Max pages', core: '5 pages', foundation: '15 pages', 'pro-max': 'Unlimited' },
    ],
  },
];

const tiers = [
  {
    id: 'core',
    name: 'Core',
    price: 'R299/mo',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    id: 'foundation',
    name: 'Foundation',
    price: 'R599/mo',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    id: 'pro-max',
    name: 'Pro-Max',
    price: 'Custom',
    color: 'text-lapis-deep',
    bg: 'bg-lapis-azure/10',
  },
] as const;

function TierCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-lapis-mid">{value}</span>;
  }
  return value ? (
    <Check className="w-5 h-5 text-emerald-500 mx-auto" />
  ) : (
    <Minus className="w-5 h-5 text-lapis-azure/40 mx-auto" />
  );
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-vellum">
      <PlatformHeader variant="light" />
      <main>
        {/* Hero */}
        <section className="bg-lapis-deep text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Everything Your Community Needs</h1>
            <p className="text-xl text-lapis-azure/80 max-w-2xl mx-auto">
              Compare features across our three tiers and find the perfect plan for your community.
            </p>
          </div>
        </section>

        {/* Comparison table */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Tier headers */}
          <div className="hidden md:grid grid-cols-[2fr_repeat(3,1fr)] gap-4 mb-8 sticky top-20 z-40 bg-vellum/90 backdrop-blur-sm pb-4">
            <div />
            {tiers.map(tier => (
              <div key={tier.id} className={`text-center p-4 rounded-xl ${tier.bg}`}>
                <h3 className={`text-lg font-bold ${tier.color}`}>{tier.name}</h3>
                <p className="text-sm text-lapis-mid mt-1">{tier.price}</p>
              </div>
            ))}
          </div>

          {featureGroups.map(group => (
            <div key={group.group} className="mb-12">
              <h2 className="text-2xl font-bold text-lapis-deep mb-6 pb-2 border-b border-lapis-azure/20">
                {group.group}
              </h2>
              <div className="space-y-1">
                {group.features.map(feature => (
                  <div
                    key={feature.name}
                    className="grid grid-cols-1 md:grid-cols-[2fr_repeat(3,1fr)] gap-4 items-center py-3 px-4 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <span className="text-lapis-deep font-medium">{feature.name}</span>
                    <div className="flex md:hidden gap-4 text-sm text-lapis-mid">
                      {tiers.map(tier => (
                        <span key={tier.id} className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold ${tier.color}`}>
                            {tier.name}:
                          </span>
                          <TierCell
                            value={feature[tier.id as keyof typeof feature] as boolean | string}
                          />
                        </span>
                      ))}
                    </div>
                    {tiers.map(tier => (
                      <div key={tier.id} className="hidden md:flex justify-center">
                        <TierCell
                          value={feature[tier.id as keyof typeof feature] as boolean | string}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="bg-lapis-deep text-white py-20">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-lapis-azure/80 mb-8">
              Start your 14-day free trial. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/signup"
                className="inline-flex items-center px-8 py-3 text-lg font-semibold rounded-lg bg-gold-vein text-lapis-deep hover:bg-gold-vein/90 transition-colors"
              >
                Start Free Trial
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center px-8 py-3 text-lg font-semibold rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors"
              >
                View Pricing
              </a>
            </div>
          </div>
        </section>
      </main>
      <PlatformFooter />
    </div>
  );
}
