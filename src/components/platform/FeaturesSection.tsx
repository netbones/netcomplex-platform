'use client';

import { SectionLayout } from '@/components/layout/SectionLayout';
import { Users, Wrench, Calendar, Megaphone, BarChart3, Heart } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Residents Directory',
    desc: 'Know who lives nearby. A trusted, opt-in listing of your community — connect with neighbours you actually see.',
    color: 'bg-lapis-azure/10 text-lapis-deep',
  },
  {
    icon: Wrench,
    title: 'Maintenance Requests',
    desc: 'Log it, track it, resolve it. From leaky faucets to community repairs — every request gets a number.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Calendar,
    title: 'Facility Bookings',
    desc: 'Book amenities with ease. Swimming pools, tennis courts, function rooms — reserve your space.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Megaphone,
    title: 'Community Announcements',
    desc: 'Your space to post updates, stories, and announcements. Keep everyone informed and engaged.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: BarChart3,
    title: 'Surveys & Polling',
    desc: 'Ask your community. Get real answers. Quick questions, instant sentiment — make decisions together.',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    icon: Heart,
    title: 'Interest Groups',
    desc: 'Find your people within your complex. Connect over shared interests, activities, and causes.',
    color: 'bg-rose-100 text-rose-600',
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
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div
              key={idx}
              className="group bg-white p-6 rounded-xl shadow-sm border border-lapis-azure/20 hover:shadow-xl hover:border-lapis-azure/40 hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-lapis-deep mb-2 group-hover:text-gold-vein transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-lapis-mid">{feature.desc}</p>
            </div>
          );
        })}
      </div>
    </SectionLayout>
  );
}
