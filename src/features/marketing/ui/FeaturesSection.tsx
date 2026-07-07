'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSafeTranslation } from '@shared/lib';
import { SectionLayout } from '@shared/ui';
import { BarChart3, ChevronDown } from 'lucide-react';

const featureIcons: Array<
  | { type: 'lucide'; Icon: React.ComponentType<{ className?: string }> }
  | { type: 'svg'; src: string; alt: string }
> = [
  { type: 'svg', src: '/platform/residents-nc.svg', alt: 'Directory & Residents' },
  { type: 'svg', src: '/platform/maintenance-nc.svg', alt: 'Maintenance' },
  { type: 'svg', src: '/platform/bookings-nc.svg', alt: 'Bookings' },
  { type: 'svg', src: '/platform/news-nc.svg', alt: 'Community Content' },
  { type: 'lucide', Icon: BarChart3 },
  { type: 'svg', src: '/platform/teams-nc.svg', alt: 'Affinity Groups' },
  { type: 'svg', src: '/platform/events-nc.svg', alt: 'Events' },
  { type: 'svg', src: '/platform/dwallet-nc.svg', alt: 'Web3 Digital Identity' },
  { type: 'svg', src: '/platform/surveys-nc.svg', alt: 'Surveys & Polls' },
  { type: 'svg', src: '/platform/locale-nc.svg', alt: 'Localization' },
  { type: 'svg', src: '/platform/marketplace-nc.svg', alt: 'Marketplace' },
  { type: 'svg', src: '/platform/education-nc.svg', alt: 'Education' },
];

const featureColors = [
  'bg-lapis-azure/10 text-lapis-deep',
  'bg-amber-100 text-amber-600',
  'bg-emerald-100 text-emerald-600',
  'bg-purple-100 text-purple-600',
  'bg-pink-100 text-pink-600',
  'bg-orange-100 text-orange-600',
  'bg-rose-100 text-rose-600',
  'bg-purple-100 text-purple-600',
  'bg-emerald-100 text-emerald-600',
  'bg-rose-100 text-rose-600',
  'bg-green-100 text-green-600',
  'bg-green-100 text-green-600',
];

export function FeaturesSection() {
  const { tx, ready } = useSafeTranslation('platform');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  if (!ready) {
    return null;
  }

  const featuresList = Array.from({ length: 12 }, (_, i) => ({
    title: tx(`features.list.${i}.title`, `Feature ${i + 1}`),
    desc: tx(`features.list.${i}.desc`, `Description for feature ${i + 1}`),
    details: tx(`features.list.${i}.details`, `Details for feature ${i + 1}`),
  }));

  const toggleCard = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  return (
    <SectionLayout size="xl" background="vellum">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-lapis-deep mb-4">
          {tx('features.title', 'Features')}
        </h2>
        <p className="text-lg text-lapis-mid max-w-2xl mx-auto">
          {tx('features.subtitle', 'All the tools your community needs')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {featuresList.map((feature, idx) => {
          const iconSpec = featureIcons[idx];
          const color = featureColors[idx];
          const isExpanded = expandedCard === idx;
          return (
            <div
              key={idx}
              className="group bg-white rounded-xl shadow-sm border border-lapis-azure/20 hover:shadow-xl hover:border-lapis-azure/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                  {iconSpec.type === 'lucide' ? (
                    <div
                      className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}
                    >
                      <iconSpec.Icon className="w-6 h-6" />
                    </div>
                  ) : (
                    <Image
                      src={iconSpec.src}
                      alt={iconSpec.alt}
                      width={48}
                      height={48}
                      unoptimized
                    />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-lapis-deep mb-2 group-hover:text-gold-vein transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-lapis-mid">{feature.desc}</p>
              </div>

              <button
                onClick={() => toggleCard(idx)}
                className="w-full px-6 py-3 flex items-center justify-between text-lapis-deep hover:bg-lapis-azure/5 transition-colors duration-200 border-t border-lapis-azure/10"
              >
                <span className="text-sm font-medium">
                  {isExpanded
                    ? tx('features.showLess', 'Show Less')
                    : tx('features.showMore', 'Show More')}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`transition-all duration-300 ease-in-out ${
                  isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                } overflow-hidden`}
              >
                <div className="px-6 pb-4 text-lapis-mid text-sm leading-relaxed">
                  {feature.details}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionLayout>
  );
}
