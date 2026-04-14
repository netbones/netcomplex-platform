'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@shared/ui/Breadcrumbs';
import { authClient } from '@/lib/auth-client';
import { usePageLoading } from '@/hooks/usePageLoading';
import { ErrorBoundary } from '@shared/ui/ErrorBoundary';

type ViewMode = 'detail' | 'matching';

interface Resident {
  id: string;
  name: string;
  email: string;
  street?: string;
  unit?: string;
  phone?: string;
  interests: string[];
  avatar?: string;
  homeImage?: string;
  isPublic: boolean;
  isActive: boolean;
  residentType?: string;
  role: string;
  standardSeats?: Array<{
    household: {
      id: string;
      street: string;
      unit: string;
      homeImage?: string;
    };
    isPrimaryOwner: boolean;
  }>;
  soloSeat?: {
    seatType: string;
    household?: {
      id: string;
      street: string;
      unit: string;
      homeImage?: string;
    };
  };
}

const interestGroups: Record<
  string,
  {
    title: string;
    tagline: string;
    about: string;
    color: string;
    icon: string;
    events: { title: string; date: string; location: string }[];
    leaders: { name: string; role: string }[];
  }
> = {
  gardening: {
    title: 'Gardening Club',
    tagline: 'Connect with fellow green thumbs!',
    about: `Welcome to the Soralia Village Gardening Club! Whether you're a seasoned horticulturist or just starting your green journey,
      this is the place to share tips, exchange plants, and grow together. We focus on sustainable practices,
      indigenous plants, and creating beautiful, thriving gardens in our community.`,
    color: 'green',
    icon: 'fa-seedling',
    events: [
      {
        title: 'Monthly Plant Swap',
        date: 'Every first Saturday, 10:00 AM',
        location: 'Community Garden',
      },
      { title: 'Composting Workshop', date: 'April 15, 2:00 PM', location: 'Community Center' },
    ],
    leaders: [
      { name: 'Sarah Mitchell', role: 'Club President' },
      { name: 'David van der Merwe', role: 'Treasurer' },
    ],
  },
  fitness: {
    title: 'Fitness Group',
    tagline: 'Stay active with your neighbors!',
    about: `Join our active fitness community! We offer a variety of activities including morning walks, yoga sessions,
      and group workouts. All fitness levels are welcome - from beginners to advanced athletes.`,
    color: 'blue',
    icon: 'fa-dumbbell',
    events: [
      {
        title: 'Morning Yoga',
        date: 'Every Tuesday & Thursday, 7:00 AM',
        location: 'Community Pool Area',
      },
      { title: 'Group Hike', date: 'Every Saturday, 8:00 AM', location: 'Trail Head Parking' },
    ],
    leaders: [
      { name: 'Michael Chen', role: 'Fitness Coordinator' },
      { name: 'Lisa Johnson', role: 'Yoga Instructor' },
    ],
  },
  'book-club': {
    title: 'Book Club',
    tagline: 'Explore literature together!',
    about: `Our book club meets monthly to discuss a wide range of genres - from contemporary fiction to classics.
      We also organize author visits and book swaps. New members are always welcome!`,
    color: 'amber',
    icon: 'fa-book-open',
    events: [
      {
        title: 'Monthly Discussion',
        date: 'Last Friday of each month, 7:00 PM',
        location: 'Library Room',
      },
      { title: 'Author Visit: Jane Smith', date: 'April 20, 6:00 PM', location: 'Main Hall' },
    ],
    leaders: [
      { name: 'Emma Williams', role: 'Club Leader' },
      { name: 'James Brown', role: 'Event Coordinator' },
    ],
  },
  cooking: {
    title: 'Cooking Club',
    tagline: 'Share recipes and flavors!',
    about: `Calling all food enthusiasts! Our cooking club organizes potlucks, cooking demonstrations,
      and recipe exchanges. We celebrate diverse cuisines and love sharing family recipes.`,
    color: 'orange',
    icon: 'fa-utensils',
    events: [
      {
        title: 'International Potluck',
        date: 'First Sunday, 12:00 PM',
        location: 'Community Center',
      },
      { title: 'Sourdough Workshop', date: 'April 10, 10:00 AM', location: 'Demo Kitchen' },
    ],
    leaders: [
      { name: 'Maria Garcia', role: 'Club President' },
      { name: 'Tom Anderson', role: 'Secretary' },
    ],
  },
  photography: {
    title: 'Photography Club',
    tagline: 'Capture beautiful moments!',
    about: `Capture the beauty of Soralia Village and beyond with our photography club. We organize photo walks,
      exhibitions, and skill-sharing sessions. Bring your camera or smartphone!`,
    color: 'purple',
    icon: 'fa-camera',
    events: [
      { title: 'Sunset Photo Walk', date: 'Every Friday, 5:30 PM', location: 'Conservation Area' },
      { title: 'Monthly Showcase', date: 'Third Thursday, 6:00 PM', location: 'Gallery Space' },
    ],
    leaders: [
      { name: 'Alex Turner', role: 'Club Founder' },
      { name: 'Nina Patel', role: 'Event Organizer' },
    ],
  },
  volunteering: {
    title: 'Volunteering Group',
    tagline: 'Make a difference together!',
    about: `Our volunteer group coordinates community service projects, from environmental conservation to supporting
      local charities. Join us in making Soralia Village and the surrounding area a better place.`,
    color: 'red',
    icon: 'fa-hands-helping',
    events: [
      { title: 'Beach Cleanup', date: 'April 5, 9:00 AM', location: 'Beach Access 3' },
      { title: 'Food Bank Drive', date: 'Second Saturday, 10:00 AM', location: 'Community Center' },
    ],
    leaders: [
      { name: 'Robert King', role: 'Volunteer Coordinator' },
      { name: 'Amy Lee', role: 'Team Leader' },
    ],
  },
};

const colorClasses: Record<string, string> = {
  green: 'from-green-500 to-green-600',
  blue: 'from-blue-500 to-blue-600',
  amber: 'from-amber-500 to-amber-600',
  orange: 'from-orange-500 to-orange-600',
  purple: 'from-purple-500 to-purple-600',
  red: 'from-red-500 to-red-600',
};

export default function InterestPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <InterestContent />
    </Suspense>
  );
}

function InterestContent() {
  const { t } = useTranslation(['common', 'interest']);
  const searchParams = useSearchParams();
  const groupId = searchParams?.get('group') || 'gardening';
  const group = interestGroups[groupId] || interestGroups.gardening;
  const colorClass = colorClasses[group.color];
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const { data: session } = authClient.useSession();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);

  const { isReady, LoadingComponent } = usePageLoading(
    [
      { label: 'Home', href: '/' },
      { label: 'Interests', href: '/interest' },
    ],
    { additionalLoading: loading }
  );

  useEffect(() => {
    if (viewMode === 'matching' && session) {
      setLoading(true);
      fetch(`/api/users?interest=${groupId}`)
        .then(res => res.json())
        .then(data => {
          setResidents(data.users || data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [viewMode, groupId, session]);

  if (!isReady) {
    return LoadingComponent;
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.interestMy') }]}
        />

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('interest:title')}</h1>
          {session && (
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('detail')}
                className={`px-4 py-2 rounded-lg ${viewMode === 'detail' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
              >
                Details
              </button>
              <button
                onClick={() => setViewMode('matching')}
                className={`px-4 py-2 rounded-lg ${viewMode === 'matching' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
              >
                Find Neighbors
              </button>
            </div>
          )}
        </div>

        {viewMode === 'detail' ? (
          <>
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <h1 className="text-4xl font-bold text-gray-900">{group.title}</h1>
              <p className="text-xl text-gray-600">{group.tagline}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">About the {group.title}</h2>
              <p className="text-gray-700">{group.about}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Events</h2>
              <div className="space-y-4">
                {group.events.map(event => (
                  <div
                    key={event.title}
                    className={`border-l-4 border-${group.color}-500 pl-4 py-2`}
                  >
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <p className="text-gray-600 text-sm">
                      {event.date} - {event.location}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Join the Conversation</h2>
              <p className="text-gray-700 mb-6">
                Connect with other members, share photos, and stay updated on group activities.
              </p>
              <button
                className={`bg-gradient-to-r ${colorClass} text-white py-3 px-6 rounded-lg hover:opacity-90 transition-opacity font-semibold`}
              >
                <i className="fas fa-comments mr-2"></i>Join Group Chat
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Neighbors who share your interest in {group.title}
            </h2>

            {loading ? (
              <p className="text-gray-500">Finding neighbors...</p>
            ) : residents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No neighbors found with this interest yet.</p>
                <Link href="/groups" className="text-indigo-600 hover:underline">
                  Browse groups to join
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {residents.map((resident, idx) => (
                  <div
                    key={resident.id || idx}
                    className="border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          resident.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${resident.name}`
                        }
                        alt={resident.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <h3 className="font-semibold">{resident.name}</h3>
                        {(resident.standardSeats?.[0]?.household?.street ||
                          resident.soloSeat?.household?.street) && (
                          <p className="text-sm text-gray-500">
                            {resident.standardSeats?.[0]?.household?.street ||
                              resident.soloSeat?.household?.street}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
