'use client';

import { useState } from 'react';
import { SectionLayout } from '@/components/layout/SectionLayout';
import {
  Users,
  Wrench,
  Calendar,
  Megaphone,
  BarChart3,
  Heart,
  Flower,
  Bitcoin,
  ChevronDown,
  HatGlassesIcon,
  MagnetIcon,
  School,
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Residents Directory',
    desc: 'Know who lives nearby. A trusted, public opt-in listing of your community — connect with neighbours you actually see. Present your community to the outside world. Add value by humanising gated communities',
    details:
      'Create your profile with photo, contact preferences, and interests. Browse by building or section. Privacy controls ensure you share only what you want.',
    color: 'bg-lapis-azure/10 text-lapis-deep',
  },
  {
    icon: Wrench,
    title: 'Maintenance Requests',
    desc: 'Log it, track it, resolve it. From leaky faucets to community repairs — every request gets a ticket. Redirect maintenance requests to the right people.',
    details:
      'Submit photos and descriptions. Track status updates in real-time. Communicate directly with maintenance staff. Rate service quality and resolution time.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: Calendar,
    title: 'Facility Bookings',
    desc: "Book amenities with ease. Swimming pools, children's parks, clubhouses, tennis courts, function rooms — reserve your space. Interconnect with other communities.",
    details:
      'View availability in real-time. Set recurring bookings. Receive automatic reminders. Cancel or reschedule with ease. Integrated calendar sync.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Megaphone,
    title: 'Community Content',
    desc: 'Your space to post updates, stories, and announcements. Keep everyone informed and engaged. Keep journals, logbooks, albums & diaries.',
    details:
      'Rich text editor with photos and videos. Categorize content for easy discovery. Comment and react to posts. Moderate with community guidelines.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: BarChart3,
    title: 'Surveys & Polling',
    desc: 'Ask your community. Get real answers. Quick questions, instant sentiment — make decisions together.',
    details:
      'Create multiple choice, rating, and open-ended questions. Anonymous or named responses. Real-time results visualization. Export data for analysis.',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    icon: Heart,
    title: 'Affinity Groups',
    desc: 'Find your people within your complex. Connect over shared interests, activities, and causes. Host bookclubs, fitness groups, or hobby meetups.',
    details:
      'Create and join groups around interests. Private or public group settings. Event scheduling within groups. Member directories and messaging.',
    color: 'bg-beige-100 text-beige-600',
  },
  {
    icon: Flower,
    title: 'Community Events',
    desc: 'Discover and organize events that bring your community together. Launch Community Campaigns. Collect fees, gather support, and make an impact',
    details:
      'Create events with RSVP tracking. Send automated reminders. Sell tickets or collect fees. Photo sharing after events. Recurring event schedules.',
    color: 'bg-rose-100 text-rose-600',
  },
  {
    icon: Bitcoin,
    title: 'Web3 Digital Identity',
    desc: 'Build decentralized community governance. Create secure, verifiable digital identities, and shared digital assets.',
    details:
      'Token-based voting systems. Community treasury management. NFT memberships. Decentralized identity verification. Smart contract automation.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Megaphone,
    title: 'Localisation',
    desc: 'Automate localisation for your chosen language groups. Translate content into multiple languages automatically.',
    details:
      'Translate content, notifications, and interfaces into multiple languages automatically.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: HatGlassesIcon,
    title: 'Agent Gateway',
    desc: 'Connect human and machine Agents to community systems for personal attention or automated support and services.',
    details:
      'Professional contact, Managed support, AI-powered customer service. Automated maintenance triage. Smart home integration. Voice-activated assistance. Predictive maintenance alerts.',
    color: 'bg-rose-100 text-rose-600',
  },
  {
    icon: MagnetIcon,
    title: 'Marketplace',
    desc: 'Buy and sell goods and services within your community. Access trusted third parties for secure transactions.',
    details:
      'Local marketplace for residents. Secure payment processing. Review and rating system. Direct messaging between buyers and sellers. Professional services addon.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: School,
    title: 'Education',
    desc: 'Access educational resources and learning opportunities within your community. Bursary Portal, Online courses and tutorials, Community learning events, Resource sharing, Peer-to-peer tutoring, Educational content library.',
    details:
      'Bursary Portal, Online courses and tutorials. Community learning events. Resource sharing. Peer-to-peer tutoring. Educational content library.',
    color: 'bg-green-100 text-green-600',
  },
];

export function FeaturesSection() {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const toggleCard = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

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
          const isExpanded = expandedCard === idx;
          return (
            <div
              key={idx}
              className="group bg-white rounded-xl shadow-sm border border-lapis-azure/20 hover:shadow-xl hover:border-lapis-azure/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
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

              <button
                onClick={() => toggleCard(idx)}
                className="w-full px-6 py-3 flex items-center justify-between text-lapis-deep hover:bg-lapis-azure/5 transition-colors duration-200 border-t border-lapis-azure/10"
              >
                <span className="text-sm font-medium">
                  {isExpanded ? 'Show less' : 'Show more'}
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
