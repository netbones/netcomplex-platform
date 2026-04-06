'use client';

import { SectionLayout } from '@/components/layout/SectionLayout';

const features = [
  {
    icon: '🏠',
    title: 'Residents Directory',
    desc: 'Know who lives nearby. A trusted, opt-in listing of your community — connect with neighbours you actually see.',
  },
  {
    icon: '🔧',
    title: 'Maintenance Requests',
    desc: 'Log it, track it, resolve it. From leaky faucets to community repairs — every request gets a number.',
  },
  {
    icon: '📅',
    title: 'Facility Bookings',
    desc: 'Book amenities with ease. Swimming pools, tennis courts, function rooms — reserve your space.',
  },
  {
    icon: '💬',
    title: 'Community Announcements',
    desc: 'Your space to post updates, stories, and announcements. Keep everyone informed and engaged.',
  },
  {
    icon: '🗳️',
    title: 'Surveys & Polling',
    desc: 'Ask your community. Get real answers. Quick questions, instant sentiment — make decisions together.',
  },
  {
    icon: '🤝',
    title: 'Interest Groups',
    desc: 'Find your people within your complex. Connect over shared interests, activities, and causes.',
  },
];

export function FeaturesSection() {
  return (
    <SectionLayout size="xl" background="vellum">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-lapis-deep mb-4">
          Build a Connected Community
        </h2>
        <p className="text-lg text-lapis-mid max-w-2xl mx-auto">
          Powerful tools that transform residential communities from managed populations into
          informed, engaged, and self-expressive networks.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-xl shadow-sm border border-lapis-azure/20 hover:shadow-md hover:border-lapis-azure/40 transition-all"
          >
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold text-lapis-deep mb-2">{feature.title}</h3>
            <p className="text-lapis-mid">{feature.desc}</p>
          </div>
        ))}
      </div>
    </SectionLayout>
  );
}
